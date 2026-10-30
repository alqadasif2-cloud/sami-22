package com.sami.tradingchallengetracker.util

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.StatFs
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.Locale
import java.util.jar.JarFile

/**
 * Sami In-App Cloud Update Manager (Android Native Engine)
 * - Downloads APK updates directly inside Sami's private storage (`filesDir/sami_updates/`)
 * - Supports HTTP Range (`206 Partial Content`) pause/resume without restarting from 0%
 * - Persists state across modal dismissals and configuration changes
 * - Performs mandatory 8-point integrity, package, version, and X.509 signing certificate verification
 * - Invokes Android's official system PackageInstaller via FileProvider (with Android 8+ unknown sources flow)
 */
object SamiUpdateManager {

    private const val TAG = "SamiUpdater"
    private const val PREFS_NAME = "sami_update_state_v2"
    private const val UPDATES_SUBDIR = "sami_updates"
    private const val MIN_FREE_SPACE_HEADROOM_BYTES = 24L * 1024L * 1024L // 24 MB safety margin

    enum class Phase {
        IDLE,
        CONNECTING,
        STARTING,
        DOWNLOADING,
        PAUSED,
        RESUMING,
        VERIFYING,
        VERIFIED,
        NEEDS_INSTALL_PERMISSION,
        INSTALLING,
        INSTALLED_CANCELED,
        FAILED
    }

    data class UpdateConfig(
        val versionName: String,
        val versionCode: Int,
        val description: String,
        val fileSize: Long,
        val sha256: String,
        val signingCertSha256: String,
        val applicationId: String,
        val downloadUrl: String,
        val secureDownloadPath: String,
        val isRepoPrivate: Boolean,
        val isMandatory: Boolean,
        val serverBaseUrl: String,
        val authToken: String,
        val samiSessionHeader: String
    )

    data class UpdateStateSnapshot(
        val phase: Phase = Phase.IDLE,
        val statusTextAr: String = "",
        val errorDetailAr: String? = null,
        val targetVersionCode: Int = 0,
        val targetVersionName: String = "",
        val downloadedBytes: Long = 0L,
        val totalBytes: Long = 0L,
        val percent: Int = 0,
        val speedBytesPerSec: Long = 0L,
        val canInstall: Boolean = false,
        val canResume: Boolean = false,
        val verifiedApkPath: String? = null,
        val verifiedSha256: String? = null,
        val verifiedSigningCertSha256: String? = null,
        val updatedAtMs: Long = System.currentTimeMillis()
    ) {
        fun toJson(): JSONObject {
            return JSONObject().apply {
                put("phase", phase.name.lowercase(Locale.ROOT))
                put("statusTextAr", statusTextAr)
                put("errorDetailAr", errorDetailAr ?: JSONObject.NULL)
                put("targetVersionCode", targetVersionCode)
                put("targetVersionName", targetVersionName)
                put("downloadedBytes", downloadedBytes)
                put("totalBytes", totalBytes)
                put("percent", percent)
                put("speedBytesPerSec", speedBytesPerSec)
                put("canInstall", canInstall)
                put("canResume", canResume)
                put("verifiedSha256", verifiedSha256 ?: JSONObject.NULL)
                put("verifiedSigningCertSha256", verifiedSigningCertSha256 ?: JSONObject.NULL)
                put("updatedAtMs", updatedAtMs)
            }
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _state = MutableStateFlow(UpdateStateSnapshot())
    val state: StateFlow<UpdateStateSnapshot> = _state.asStateFlow()

    @Volatile
    private var activeJob: Job? = null

    @Volatile
    private var lastConfig: UpdateConfig? = null

    @Volatile
    private var pauseRequested: Boolean = false

    @Volatile
    var pendingAutoInstallAfterPermission: Boolean = false

    private var stateChangeListener: ((String) -> Unit)? = null

    fun setStateListener(listener: ((String) -> Unit)?) {
        stateChangeListener = listener
    }

    private fun emitState(context: Context?, next: UpdateStateSnapshot) {
        val stamped = next.copy(updatedAtMs = System.currentTimeMillis())
        _state.value = stamped
        if (context != null) {
            persistStateToPrefs(context, stamped)
        }
        try {
            stateChangeListener?.invoke(stamped.toJson().toString())
        } catch (_: Exception) {}
    }

    private fun getUpdatesDir(context: Context): File {
        val dir = File(context.applicationContext.filesDir, UPDATES_SUBDIR)
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun partFileFor(context: Context, versionCode: Int): File {
        return File(getUpdatesDir(context), "sami_update_v${versionCode}.apk.part")
    }

    private fun verifiedFileFor(context: Context, versionCode: Int): File {
        return File(getUpdatesDir(context), "sami_update_v${versionCode}.apk")
    }

    /**
     * Deletes stale partial or verified APK files from older versionCodes so storage never bloats.
     */
    private fun cleanupOtherVersionFiles(context: Context, keepVersionCode: Int) {
        val dir = getUpdatesDir(context)
        val keepPart = "sami_update_v${keepVersionCode}.apk.part"
        val keepFinal = "sami_update_v${keepVersionCode}.apk"
        dir.listFiles()?.forEach { f ->
            if (f.name != keepPart && f.name != keepFinal) {
                runCatching { f.delete() }
            }
        }
    }

    fun cleanupAfterPackageUpgrade(context: Context) {
        val dir = getUpdatesDir(context)
        dir.listFiles()?.forEach { f ->
            runCatching { f.delete() }
        }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        _state.value = UpdateStateSnapshot()
    }

    fun restorePersistedStateIfNeeded(context: Context) {
        if (_state.value.phase != Phase.IDLE) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedCode = prefs.getInt("targetVersionCode", 0)
        if (savedCode <= 0) return

        val installed = getInstalledPackageVersionCode(context)
        if (savedCode <= installed) {
            cleanupAfterPackageUpgrade(context)
            return
        }

        val savedName = prefs.getString("targetVersionName", "") ?: ""
        val totalBytes = prefs.getLong("totalBytes", 0L)
        val expectedSha = prefs.getString("expectedSha256", "") ?: ""
        val verifiedCert = prefs.getString("verifiedSigningCertSha256", null)

        val finalApk = verifiedFileFor(context, savedCode)
        val partApk = partFileFor(context, savedCode)

        if (finalApk.exists() && totalBytes > 0 && finalApk.length() == totalBytes) {
            _state.value = UpdateStateSnapshot(
                phase = Phase.VERIFIED,
                statusTextAr = "اكتمل التنزيل",
                targetVersionCode = savedCode,
                targetVersionName = savedName,
                downloadedBytes = totalBytes,
                totalBytes = totalBytes,
                percent = 100,
                canInstall = true,
                canResume = false,
                verifiedApkPath = finalApk.absolutePath,
                verifiedSha256 = expectedSha.ifEmpty { null },
                verifiedSigningCertSha256 = verifiedCert
            )
        } else if (partApk.exists() && partApk.length() > 0L && totalBytes > 0L) {
            val dl = partApk.length().coerceAtMost(totalBytes)
            val pct = ((dl * 99L) / totalBytes).toInt().coerceIn(0, 99)
            _state.value = UpdateStateSnapshot(
                phase = Phase.PAUSED,
                statusTextAr = "تم إيقاف التنزيل مؤقتًا",
                targetVersionCode = savedCode,
                targetVersionName = savedName,
                downloadedBytes = dl,
                totalBytes = totalBytes,
                percent = pct,
                canInstall = false,
                canResume = true
            )
        }
    }

    private fun persistStateToPrefs(context: Context, snap: UpdateStateSnapshot) {
        val cfg = lastConfig
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
            putString("phase", snap.phase.name)
            putInt("targetVersionCode", snap.targetVersionCode)
            putString("targetVersionName", snap.targetVersionName)
            putLong("downloadedBytes", snap.downloadedBytes)
            putLong("totalBytes", snap.totalBytes)
            if (cfg != null) {
                putString("expectedSha256", cfg.sha256)
                putString("configJson", serializeConfig(cfg))
            }
            if (snap.verifiedSigningCertSha256 != null) {
                putString("verifiedSigningCertSha256", snap.verifiedSigningCertSha256)
            }
            apply()
        }
    }

    private fun serializeConfig(cfg: UpdateConfig): String {
        return JSONObject().apply {
            put("versionName", cfg.versionName)
            put("versionCode", cfg.versionCode)
            put("description", cfg.description)
            put("fileSize", cfg.fileSize)
            put("sha256", cfg.sha256)
            put("signingCertSha256", cfg.signingCertSha256)
            put("applicationId", cfg.applicationId)
            put("downloadUrl", cfg.downloadUrl)
            put("secureDownloadPath", cfg.secureDownloadPath)
            put("isRepoPrivate", cfg.isRepoPrivate)
            put("isMandatory", cfg.isMandatory)
            put("serverBaseUrl", cfg.serverBaseUrl)
            put("authToken", cfg.authToken)
            put("samiSessionHeader", cfg.samiSessionHeader)
        }.toString()
    }

    fun parseConfigFromJson(rawJson: String, serverBaseUrl: String = "", authHeaderJson: String = ""): UpdateConfig {
        val obj = JSONObject(rawJson)
        val authObj = if (authHeaderJson.isNotBlank()) runCatching { JSONObject(authHeaderJson) }.getOrNull() else null
        return UpdateConfig(
            versionName = obj.optString("versionName", ""),
            versionCode = obj.optInt("versionCode", 0),
            description = obj.optString("description", ""),
            fileSize = obj.optLong("fileSize", 0L),
            sha256 = obj.optString("sha256", "").trim().lowercase(Locale.ROOT),
            signingCertSha256 = obj.optString("signingCertSha256", "").trim(),
            applicationId = obj.optString("applicationId", "com.sami.tradingchallengetracker").trim(),
            downloadUrl = obj.optString("downloadUrl", "").trim(),
            secureDownloadPath = obj.optString("secureDownloadPath", "").trim(),
            isRepoPrivate = obj.optBoolean("isRepoPrivate", false),
            isMandatory = obj.optBoolean("isMandatory", false),
            serverBaseUrl = serverBaseUrl.ifBlank { obj.optString("serverBaseUrl", "") }.trimEnd('/'),
            authToken = authObj?.optString("token", "") ?: obj.optString("authToken", ""),
            samiSessionHeader = authObj?.optString("session", "") ?: obj.optString("samiSessionHeader", "")
        )
    }

    // ========================================================================
    // INSTALLED PACKAGE & X.509 CERTIFICATE HELPERS
    // ========================================================================

    fun normalizeHex(input: String?): String {
        if (input.isNullOrBlank()) return ""
        return input.replace(Regex("[^a-fA-F0-9]"), "").lowercase(Locale.ROOT)
    }

    fun formatColonSha256(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString(":") { b -> "%02X".format(Locale.ROOT, b) }
    }

    fun getInstalledPackageVersionCode(context: Context): Int {
        return try {
            val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pi.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pi.versionCode
            }
        } catch (_: Exception) {
            15
        }
    }

    fun getInstalledSigningCertSha256Set(context: Context): Set<String> {
        val result = mutableSetOf<String>()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val flags = PackageManager.GET_SIGNING_CERTIFICATES
                val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.packageManager.getPackageInfo(
                        context.packageName,
                        PackageManager.PackageInfoFlags.of(flags.toLong())
                    )
                } else {
                    @Suppress("DEPRECATION")
                    context.packageManager.getPackageInfo(context.packageName, flags)
                }
                val signingInfo = pi.signingInfo
                if (signingInfo != null) {
                    val signers = if (signingInfo.hasMultipleSigners()) {
                        signingInfo.apkContentsSigners
                    } else {
                        signingInfo.signingCertificateHistory
                    }
                    signers?.forEach { sig ->
                        result.add(normalizeHex(formatColonSha256(sig.toByteArray())))
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                val pi = context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
                @Suppress("DEPRECATION")
                pi.signatures?.forEach { sig ->
                    result.add(normalizeHex(formatColonSha256(sig.toByteArray())))
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error reading installed signing cert: ${e.message}")
        }
        return result
    }

    fun canRequestPackageInstallsCompat(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    fun getInstalledAppInfoJson(context: Context): String {
        restorePersistedStateIfNeeded(context)
        return try {
            val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            val verCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pi.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pi.versionCode
            }
            val certs = getInstalledSigningCertSha256Set(context)
            val firstColon = certs.firstOrNull()?.uppercase(Locale.ROOT)?.chunked(2)?.joinToString(":") ?: ""

            JSONObject().apply {
                put("applicationId", context.packageName)
                put("versionName", pi.versionName ?: "1.3.1")
                put("versionCode", verCode)
                put("signingCertSha256", firstColon)
                put("canInstallPackages", canRequestPackageInstallsCompat(context))
                put("isAndroidNative", true)
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("applicationId", context.packageName)
                put("versionName", "1.3.1")
                put("versionCode", 15)
                put("canInstallPackages", canRequestPackageInstallsCompat(context))
                put("isAndroidNative", true)
            }.toString()
        }
    }

    // ========================================================================
    // DOWNLOAD CONTROLS (START / PAUSE / RESUME / CANCEL)
    // ========================================================================

    @Synchronized
    fun startOrResumeDownload(context: Context, config: UpdateConfig, isResume: Boolean = false) {
        val appCtx = context.applicationContext
        lastConfig = config
        pauseRequested = false

        if (activeJob?.isActive == true) {
            return
        }

        cleanupOtherVersionFiles(appCtx, config.versionCode)

        // Check if already verified on disk!
        val verifiedFile = verifiedFileFor(appCtx, config.versionCode)
        if (verifiedFile.exists() && config.fileSize > 0L && verifiedFile.length() == config.fileSize) {
            activeJob = scope.launch {
                val check = verifyDownloadedApkFile(appCtx, verifiedFile, config)
                if (check.ok) {
                    emitState(
                        appCtx,
                        UpdateStateSnapshot(
                            phase = Phase.VERIFIED,
                            statusTextAr = "اكتمل التنزيل",
                            targetVersionCode = config.versionCode,
                            targetVersionName = config.versionName,
                            downloadedBytes = config.fileSize,
                            totalBytes = config.fileSize,
                            percent = 100,
                            canInstall = true,
                            canResume = false,
                            verifiedApkPath = verifiedFile.absolutePath,
                            verifiedSha256 = check.sha256Hex,
                            verifiedSigningCertSha256 = check.certFingerprintColon
                        )
                    )
                } else {
                    runCatching { verifiedFile.delete() }
                    executeStreamingDownload(appCtx, config, false)
                }
            }
            return
        }

        activeJob = scope.launch {
            executeStreamingDownload(appCtx, config, isResume)
        }
    }

    @Synchronized
    fun pauseDownload(context: Context) {
        pauseRequested = true
        activeJob?.cancel()
        activeJob = null
        val cur = _state.value
        if (cur.phase == Phase.DOWNLOADING || cur.phase == Phase.CONNECTING || cur.phase == Phase.STARTING || cur.phase == Phase.RESUMING) {
            emitState(
                context.applicationContext,
                cur.copy(
                    phase = Phase.PAUSED,
                    statusTextAr = "تم إيقاف التنزيل مؤقتًا",
                    speedBytesPerSec = 0L,
                    canInstall = false,
                    canResume = true
                )
            )
        }
    }

    @Synchronized
    fun resumeSavedDownload(context: Context): Boolean {
        val appCtx = context.applicationContext
        var cfg = lastConfig
        if (cfg == null) {
            val savedJson = appCtx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString("configJson", null)
            if (!savedJson.isNullOrBlank()) {
                cfg = runCatching { parseConfigFromJson(savedJson) }.getOrNull()
            }
        }
        if (cfg == null) return false
        startOrResumeDownload(appCtx, cfg, isResume = true)
        return true
    }

    @Synchronized
    fun cancelDownload(context: Context) {
        val appCtx = context.applicationContext
        pauseRequested = false
        activeJob?.cancel()
        activeJob = null
        val code = _state.value.targetVersionCode.takeIf { it > 0 } ?: lastConfig?.versionCode ?: 0
        if (code > 0) {
            runCatching { partFileFor(appCtx, code).delete() }
            runCatching { verifiedFileFor(appCtx, code).delete() }
        }
        appCtx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        emitState(appCtx, UpdateStateSnapshot(phase = Phase.IDLE))
    }

    // ========================================================================
    // STREAMING HTTP RANGE DOWNLOADER
    // ========================================================================

    private fun resolvePrimaryAndFallbackUrls(config: UpdateConfig): List<Pair<String, Boolean>> {
        val candidates = mutableListOf<Pair<String, Boolean>>() // (url, attachSamiAuthHeaders)
        val proxyPath = config.secureDownloadPath.ifBlank { "/api/app-updates/download/v_${config.versionCode}" }
        val fullProxyUrl = if (config.serverBaseUrl.isNotBlank()) {
            if (proxyPath.startsWith("http")) proxyPath else "${config.serverBaseUrl}$proxyPath"
        } else ""

        if (config.isRepoPrivate) {
            if (fullProxyUrl.isNotBlank()) {
                candidates.add(fullProxyUrl to true)
            }
            if (config.downloadUrl.startsWith("http")) {
                candidates.add(config.downloadUrl to true)
            }
        } else {
            // Public GitHub Release: connect directly to official Release Asset URL first (zero GitHub login needed)
            if (config.downloadUrl.startsWith("https://")) {
                candidates.add(config.downloadUrl to false)
            }
            // Fallback to Sami server streaming proxy if network/ISP blocks githubusercontent
            if (fullProxyUrl.isNotBlank()) {
                candidates.add(fullProxyUrl to true)
            }
        }
        return candidates.distinctBy { it.first }
    }

    private fun openRedirectAwareConnection(
        initialUrl: String,
        attachSamiAuth: Boolean,
        rangeStart: Long,
        config: UpdateConfig
    ): HttpURLConnection {
        var currentUrl = initialUrl
        var redirects = 0
        val initialHost = runCatching { URL(initialUrl).host }.getOrDefault("")

        while (redirects < 6) {
            val conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 20_000
                readTimeout = 30_000
                requestMethod = "GET"
                setRequestProperty("User-Agent", "Sami-Android-Updater/1.3")
                setRequestProperty("Accept", "application/vnd.android.package-archive, application/octet-stream, */*")
                if (rangeStart > 0L) {
                    setRequestProperty("Range", "bytes=$rangeStart-")
                }
                val curHost = runCatching { URL(currentUrl).host }.getOrDefault("")
                if (attachSamiAuth && curHost.equals(initialHost, ignoreCase = true)) {
                    if (config.authToken.isNotBlank()) {
                        setRequestProperty("Authorization", "Bearer ${config.authToken}")
                    }
                    if (config.samiSessionHeader.isNotBlank()) {
                        setRequestProperty("X-Sami-Session", config.samiSessionHeader)
                    }
                }
            }

            conn.connect()
            val status = conn.responseCode
            if (status in listOf(301, 302, 303, 307, 308)) {
                val loc = conn.getHeaderField("Location")
                conn.disconnect()
                if (loc.isNullOrBlank()) {
                    throw IllegalStateException("فشل تتبع رابط تنزيل التحديث (تحويل فارغ)")
                }
                currentUrl = URL(URL(currentUrl), loc).toString()
                redirects++
                continue
            }
            return conn
        }
        throw IllegalStateException("تجاوز عدد التحويلات المسموح به أثناء الاتصال بخادم التحديثات")
    }

    private fun executeStreamingDownload(context: Context, config: UpdateConfig, isResume: Boolean) {
        val partFile = partFileFor(context, config.versionCode)
        val verifiedFile = verifiedFileFor(context, config.versionCode)

        try {
            if (config.versionCode <= getInstalledPackageVersionCode(context)) {
                emitState(
                    context,
                    UpdateStateSnapshot(
                        phase = Phase.FAILED,
                        statusTextAr = "فشل التنزيل",
                        errorDetailAr = "الإصدار المتاح ليس أحدث من النسخة المثبتة حالياً على جهازك.",
                        targetVersionCode = config.versionCode,
                        targetVersionName = config.versionName
                    )
                )
                return
            }

            val existingBytes = if (partFile.exists()) partFile.length() else 0L
            val neededBytes = ((config.fileSize - existingBytes).coerceAtLeast(0L)) + MIN_FREE_SPACE_HEADROOM_BYTES
            val availableBytes = runCatching { StatFs(getUpdatesDir(context).absolutePath).availableBytes }.getOrDefault(Long.MAX_VALUE)

            if (config.fileSize > 0L && availableBytes < neededBytes) {
                val neededMb = neededBytes / (1024 * 1024)
                emitState(
                    context,
                    UpdateStateSnapshot(
                        phase = Phase.FAILED,
                        statusTextAr = "فشل التنزيل",
                        errorDetailAr = "المساحة التخزينية المتاحة على الهاتف غير كافية. يرجى تفريغ $neededMb ميغابايت على الأقل ثم إعادة المحاولة.",
                        targetVersionCode = config.versionCode,
                        targetVersionName = config.versionName,
                        downloadedBytes = existingBytes,
                        totalBytes = config.fileSize,
                        canResume = existingBytes > 0L
                    )
                )
                return
            }

            emitState(
                context,
                UpdateStateSnapshot(
                    phase = if (isResume && existingBytes > 0L) Phase.RESUMING else Phase.CONNECTING,
                    statusTextAr = if (isResume && existingBytes > 0L) "جارٍ استئناف التنزيل" else "جارٍ الاتصال بالخادم",
                    targetVersionCode = config.versionCode,
                    targetVersionName = config.versionName,
                    downloadedBytes = existingBytes,
                    totalBytes = config.fileSize,
                    percent = if (config.fileSize > 0L) ((existingBytes * 99L) / config.fileSize).toInt().coerceIn(0, 99) else 0,
                    canInstall = false,
                    canResume = false
                )
            )

            val urlCandidates = resolvePrimaryAndFallbackUrls(config)
            if (urlCandidates.isEmpty()) {
                throw IllegalStateException("لا يتوفر مسار تنزيل صالح لهذا الإصدار")
            }

            var conn: HttpURLConnection? = null
            var lastConnectErr: Exception? = null
            val requestOffset = if (existingBytes > 0L && (config.fileSize <= 0L || existingBytes < config.fileSize)) {
                existingBytes
            } else {
                0L
            }

            for ((candidateUrl, attachAuth) in urlCandidates) {
                try {
                    val c = openRedirectAwareConnection(candidateUrl, attachAuth, requestOffset, config)
                    if (c.responseCode == 200 || c.responseCode == 206) {
                        conn = c
                        break
                    } else if (c.responseCode == 416 && existingBytes > 0L && existingBytes == config.fileSize) {
                        c.disconnect()
                        conn = null
                        break
                    } else {
                        val code = c.responseCode
                        c.disconnect()
                        lastConnectErr = IllegalStateException("استجابة غير متوقعة من الخادم (HTTP $code)")
                    }
                } catch (e: Exception) {
                    lastConnectErr = e
                }
            }

            if (conn == null && !(existingBytes > 0L && config.fileSize > 0L && existingBytes == config.fileSize)) {
                throw lastConnectErr ?: IllegalStateException("تعذر الاتصال بخادم التحديثات. تحقق من اتصالك بالإنترنت.")
            }

            if (conn != null) {
                try {
                    val httpCode = conn.responseCode
                    val appendMode = httpCode == 206 && requestOffset > 0L
                    var writtenTotal = if (appendMode) requestOffset else 0L

                    val contentLenHeader = conn.contentLengthLong
                    val expectedTotal = when {
                        config.fileSize > 0L -> config.fileSize
                        appendMode && contentLenHeader > 0L -> requestOffset + contentLenHeader
                        contentLenHeader > 0L -> contentLenHeader
                        else -> 0L
                    }

                    if (!appendMode && partFile.exists()) {
                        // Server did not honor Range (returned 200 OK); restart cleanly from byte 0
                        RandomAccessFile(partFile, "rw").use { it.setLength(0L) }
                    }

                    emitState(
                        context,
                        UpdateStateSnapshot(
                            phase = Phase.STARTING,
                            statusTextAr = "جارٍ بدء التنزيل",
                            targetVersionCode = config.versionCode,
                            targetVersionName = config.versionName,
                            downloadedBytes = writtenTotal,
                            totalBytes = expectedTotal,
                            percent = if (expectedTotal > 0L) ((writtenTotal * 99L) / expectedTotal).toInt().coerceIn(0, 99) else 0
                        )
                    )

                    val buffer = ByteArray(32 * 1024)
                    var speedWindowStartMs = System.currentTimeMillis()
                    var speedWindowBytes = 0L
                    var currentSpeed = 0L
                    var lastEmitMs = 0L

                    conn.inputStream.use { input ->
                        FileOutputStream(partFile, appendMode).use { fos ->
                            while (true) {
                                if (pauseRequested || activeJob?.isCancelled == true) {
                                    fos.flush()
                                    runCatching { fos.fd.sync() }
                                    throw CancellationException("Paused")
                                }

                                val read = input.read(buffer)
                                if (read == -1) break

                                fos.write(buffer, 0, read)
                                writtenTotal += read
                                speedWindowBytes += read

                                val now = System.currentTimeMillis()
                                val elapsedWindow = now - speedWindowStartMs
                                if (elapsedWindow >= 500L) {
                                    currentSpeed = (speedWindowBytes * 1000L) / elapsedWindow
                                    speedWindowStartMs = now
                                    speedWindowBytes = 0L
                                }

                                if (now - lastEmitMs >= 140L) {
                                    lastEmitMs = now
                                    // Never report 100% before disk sync and full verification complete
                                    val pct = if (expectedTotal > 0L) {
                                        ((writtenTotal * 99L) / expectedTotal).toInt().coerceIn(0, 99)
                                    } else {
                                        0
                                    }
                                    emitState(
                                        context,
                                        UpdateStateSnapshot(
                                            phase = Phase.DOWNLOADING,
                                            statusTextAr = "جارٍ تنزيل التحديث",
                                            targetVersionCode = config.versionCode,
                                            targetVersionName = config.versionName,
                                            downloadedBytes = writtenTotal,
                                            totalBytes = expectedTotal,
                                            percent = pct,
                                            speedBytesPerSec = currentSpeed,
                                            canInstall = false,
                                            canResume = false
                                        )
                                    )
                                }
                            }
                            fos.flush()
                            runCatching { fos.fd.sync() }
                        }
                    }
                } finally {
                    conn.disconnect()
                }
            }

            // Transition to mandatory 8-point verification before allowing installation
            val actualLength = partFile.length()
            emitState(
                context,
                UpdateStateSnapshot(
                    phase = Phase.VERIFYING,
                    statusTextAr = "اكتمل التنزيل — جارٍ التحقق من سلامة الملف وشهادة التوقيع...",
                    targetVersionCode = config.versionCode,
                    targetVersionName = config.versionName,
                    downloadedBytes = actualLength,
                    totalBytes = if (config.fileSize > 0L) config.fileSize else actualLength,
                    percent = 99,
                    speedBytesPerSec = 0L,
                    canInstall = false
                )
            )

            val verification = verifyDownloadedApkFile(context, partFile, config)
            if (!verification.ok) {
                // Corrupt or mismatched APK: delete immediately so it can NEVER be installed
                runCatching { partFile.delete() }
                runCatching { verifiedFile.delete() }
                emitState(
                    context,
                    UpdateStateSnapshot(
                        phase = Phase.FAILED,
                        statusTextAr = "فشل التنزيل",
                        errorDetailAr = verification.errorAr ?: "فشل التحقق الأمني من ملف التحديث",
                        targetVersionCode = config.versionCode,
                        targetVersionName = config.versionName,
                        downloadedBytes = 0L,
                        totalBytes = config.fileSize,
                        percent = 0,
                        canInstall = false,
                        canResume = false
                    )
                )
                return
            }

            // Atomically promote verified .part file to final .apk
            if (verifiedFile.exists()) {
                runCatching { verifiedFile.delete() }
            }
            val renamed = partFile.renameTo(verifiedFile)
            val finalTarget = if (renamed) verifiedFile else {
                partFile.copyTo(verifiedFile, overwrite = true)
                partFile.delete()
                verifiedFile
            }

            emitState(
                context,
                UpdateStateSnapshot(
                    phase = Phase.VERIFIED,
                    statusTextAr = "اكتمل التنزيل",
                    targetVersionCode = config.versionCode,
                    targetVersionName = config.versionName,
                    downloadedBytes = finalTarget.length(),
                    totalBytes = finalTarget.length(),
                    percent = 100,
                    speedBytesPerSec = 0L,
                    canInstall = true,
                    canResume = false,
                    verifiedApkPath = finalTarget.absolutePath,
                    verifiedSha256 = verification.sha256Hex,
                    verifiedSigningCertSha256 = verification.certFingerprintColon
                )
            )
        } catch (_: CancellationException) {
            if (pauseRequested) {
                val dl = if (partFile.exists()) partFile.length() else 0L
                val pct = if (config.fileSize > 0L) ((dl * 99L) / config.fileSize).toInt().coerceIn(0, 99) else 0
                emitState(
                    context,
                    UpdateStateSnapshot(
                        phase = Phase.PAUSED,
                        statusTextAr = "تم إيقاف التنزيل مؤقتًا",
                        targetVersionCode = config.versionCode,
                        targetVersionName = config.versionName,
                        downloadedBytes = dl,
                        totalBytes = config.fileSize,
                        percent = pct,
                        speedBytesPerSec = 0L,
                        canInstall = false,
                        canResume = true
                    )
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Download error: ${e.message}", e)
            val dl = if (partFile.exists()) partFile.length() else 0L
            val pct = if (config.fileSize > 0L) ((dl * 99L) / config.fileSize).toInt().coerceIn(0, 99) else 0
            emitState(
                context,
                UpdateStateSnapshot(
                    phase = Phase.FAILED,
                    statusTextAr = "فشل التنزيل",
                    errorDetailAr = "انقطع الاتصال أو تعذر إكمال التنزيل (${e.message ?: "خطأ في الشبكة"}). يمكنك الاستئناف دون فقدان الجزء المحمّل.",
                    targetVersionCode = config.versionCode,
                    targetVersionName = config.versionName,
                    downloadedBytes = dl,
                    totalBytes = config.fileSize,
                    percent = pct,
                    speedBytesPerSec = 0L,
                    canInstall = false,
                    canResume = dl > 0L
                )
            )
        }
    }

    // ========================================================================
    // MANDATORY 8-POINT APK INTEGRITY & X.509 SIGNATURE VERIFICATION
    // ========================================================================

    data class ApkVerificationOutcome(
        val ok: Boolean,
        val sha256Hex: String = "",
        val certFingerprintColon: String = "",
        val errorAr: String? = null
    )

    fun verifyDownloadedApkFile(
        context: Context,
        apkFile: File,
        config: UpdateConfig
    ): ApkVerificationOutcome {
        if (!apkFile.exists() || apkFile.length() <= 64L) {
            return ApkVerificationOutcome(false, errorAr = "ملف التحديث المحمّل غير موجود أو فارغ.")
        }

        // Check 1: File size matches expected size
        if (config.fileSize > 0L && apkFile.length() != config.fileSize) {
            return ApkVerificationOutcome(
                false,
                errorAr = "حجم الملف المحمّل (${apkFile.length()} بايت) لا يطابق الحجم الرسمي المعتمد (${config.fileSize} بايت)."
            )
        }

        // Check 2: Local SHA-256 calculation matches Firestore SHA-256
        val digest = MessageDigest.getInstance("SHA-256")
        val buf = ByteArray(64 * 1024)
        FileInputStream(apkFile).use { fis ->
            while (true) {
                val r = fis.read(buf)
                if (r == -1) break
                digest.update(buf, 0, r)
            }
        }
        val computedSha256 = digest.digest().joinToString("") { "%02x".format(Locale.ROOT, it) }
        if (config.sha256.isNotBlank() && !computedSha256.equals(config.sha256, ignoreCase = true)) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "فشل التحقق من بصمة SHA-256 لملف التحديث؛ تم رفض التثبيت لحماية جهازك."
            )
        }

        // Check 3: APK archive is valid & readable by Android PackageManager
        val archiveInfo: PackageInfo? = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val flags = PackageManager.GET_SIGNING_CERTIFICATES.toLong()
                context.packageManager.getPackageArchiveInfo(
                    apkFile.absolutePath,
                    PackageManager.PackageInfoFlags.of(flags)
                ) ?: context.packageManager.getPackageArchiveInfo(
                    apkFile.absolutePath,
                    PackageManager.PackageInfoFlags.of(0L)
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageArchiveInfo(
                    apkFile.absolutePath,
                    PackageManager.GET_SIGNING_CERTIFICATES
                ) ?: context.packageManager.getPackageArchiveInfo(apkFile.absolutePath, 0)
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageArchiveInfo(
                    apkFile.absolutePath,
                    PackageManager.GET_SIGNATURES
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "getPackageArchiveInfo failed: ${e.message}")
            null
        }

        if (archiveInfo == null) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "الملف المحمّل تالف ولا يمثل حزمة تطبيق Android صالحة."
            )
        }

        // Check 4: applicationId strictly matches installed Sami packageName
        val archivePkg = archiveInfo.packageName ?: ""
        if (archivePkg != context.packageName) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "معرّف الحزمة داخل الملف ($archivePkg) لا يطابق تطبيق Sami المثبت (${context.packageName})."
            )
        }

        // Check 5: versionCode is strictly higher than installed version AND matches expected metadata
        val archiveVerCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            archiveInfo.longVersionCode.toInt()
        } else {
            @Suppress("DEPRECATION")
            archiveInfo.versionCode
        }
        val installedVerCode = getInstalledPackageVersionCode(context)
        if (archiveVerCode <= installedVerCode) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "رقم إصدار الحزمة المحمّلة ($archiveVerCode) ليس أحدث من الإصدار المثبت حالياً ($installedVerCode)."
            )
        }
        if (config.versionCode > 0 && archiveVerCode != config.versionCode) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "بيانات كود الإصدار داخل ملف الـ APK ($archiveVerCode) لا تطابق بيانات التحديث الرسمية (${config.versionCode})."
            )
        }

        // Check 6 & 7: Extract X.509 signing certificate(s) from APK & verify strict match with installed Sami signature
        val archiveCertHexSet = extractArchiveSigningCertHexSet(archiveInfo, apkFile)
        if (archiveCertHexSet.isEmpty()) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "ملف التحديث غير موقّع بشهادة توقيع Android صالحة؛ تم رفض التثبيت."
            )
        }

        val installedCertHexSet = getInstalledSigningCertSha256Set(context)
        if (installedCertHexSet.isNotEmpty() && archiveCertHexSet.intersect(installedCertHexSet).isEmpty()) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "شهادة توقيع التحديث لا تطابق شهادة توقيع تطبيق Sami المثبت. تم حظر التثبيت لمنع تعارض الحزمة."
            )
        }

        val expectedCertHex = normalizeHex(config.signingCertSha256)
        if (expectedCertHex.isNotEmpty() && !archiveCertHexSet.contains(expectedCertHex)) {
            return ApkVerificationOutcome(
                false,
                sha256Hex = computedSha256,
                errorAr = "بصمة شهادة التوقيع داخل الـ APK لا تطابق البصمة المسجلة رسمياً للإصدار."
            )
        }

        val matchedHex = archiveCertHexSet.first()
        val formattedColon = matchedHex.uppercase(Locale.ROOT).chunked(2).joinToString(":")
        return ApkVerificationOutcome(
            ok = true,
            sha256Hex = computedSha256,
            certFingerprintColon = formattedColon
        )
    }

    private fun extractArchiveSigningCertHexSet(archiveInfo: PackageInfo, apkFile: File): Set<String> {
        val certs = mutableSetOf<String>()

        // 1. PackageManager archive signingInfo / signatures
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val si = archiveInfo.signingInfo
                if (si != null) {
                    val signers = if (si.hasMultipleSigners()) si.apkContentsSigners else si.signingCertificateHistory
                    signers?.forEach { sig ->
                        certs.add(normalizeHex(formatColonSha256(sig.toByteArray())))
                    }
                }
            }
            @Suppress("DEPRECATION")
            archiveInfo.signatures?.forEach { sig ->
                certs.add(normalizeHex(formatColonSha256(sig.toByteArray())))
            }
        } catch (_: Exception) {}

        // 2. Direct APK Signature Scheme v2/v3 block X.509 extraction (OEM-independent)
        if (certs.isEmpty()) {
            extractCertFromApkSigningBlockV2V3(apkFile)?.let { certs.add(it) }
        }

        // 3. v1 JAR / META-INF X.509 certificate verification fallback
        if (certs.isEmpty()) {
            try {
                JarFile(apkFile, true).use { jar ->
                    val entries = jar.entries()
                    while (entries.hasMoreElements()) {
                        val entry = entries.nextElement()
                        if (entry.isDirectory || entry.name.startsWith("META-INF/")) continue
                        jar.getInputStream(entry).use { s ->
                            val skipBuf = ByteArray(8192)
                            while (s.read(skipBuf) != -1) {
                                // Drain stream to trigger JAR signature verification
                            }
                        }
                        entry.certificates?.forEach { c ->
                            if (c is X509Certificate) {
                                certs.add(normalizeHex(formatColonSha256(c.encoded)))
                            }
                        }
                        if (certs.isNotEmpty()) break
                    }
                }
            } catch (_: Exception) {}
        }

        return certs.filter { it.length == 64 }.toSet()
    }

    private fun extractCertFromApkSigningBlockV2V3(apkFile: File): String? {
        return try {
            RandomAccessFile(apkFile, "r").use { raf ->
                val len = raf.length()
                if (len < 64L) return null
                val searchSize = minOf(len, 65557L).toInt()
                val tail = ByteArray(searchSize)
                raf.seek(len - searchSize)
                raf.readFully(tail)

                var eocdPos = -1
                for (i in searchSize - 22 downTo 0) {
                    if (tail[i] == 0x50.toByte() &&
                        tail[i + 1] == 0x4b.toByte() &&
                        tail[i + 2] == 0x05.toByte() &&
                        tail[i + 3] == 0x06.toByte()
                    ) {
                        eocdPos = i
                        break
                    }
                }
                if (eocdPos < 0) return null
                val cdOffset = ByteBuffer.wrap(tail, eocdPos + 16, 4).order(ByteOrder.LITTLE_ENDIAN).int.toLong() and 0xffffffffL
                if (cdOffset < 32L) return null

                val footer = ByteArray(24)
                raf.seek(cdOffset - 24L)
                raf.readFully(footer)
                val magicStr = String(footer, 8, 16, Charsets.US_ASCII)
                if (magicStr != "APK Sig Block 42") return null

                val blockSizeInFooter = ByteBuffer.wrap(footer, 0, 8).order(ByteOrder.LITTLE_ENDIAN).long
                val blockStart = cdOffset - blockSizeInFooter - 8L
                if (blockStart < 0L || blockSizeInFooter > 32L * 1024L * 1024L) return null

                val pairsLen = (blockSizeInFooter - 24L).toInt()
                val pairsBytes = ByteArray(pairsLen)
                raf.seek(blockStart + 8L)
                raf.readFully(pairsBytes)
                val bb = ByteBuffer.wrap(pairsBytes).order(ByteOrder.LITTLE_ENDIAN)

                while (bb.remaining() >= 12) {
                    val pairLen = bb.long.toInt()
                    if (pairLen < 4 || pairLen > bb.remaining()) break
                    val nextPos = bb.position() + pairLen
                    val id = bb.int
                    if (id == 0x7109871a || id == -0xfac9740 || id == 0x1b93ad61) {
                        // V2 (0x7109871a) or V3 (0xf05368c0 == -0xfac9740)
                        val signersSeqLen = bb.int
                        if (signersSeqLen > 4 && signersSeqLen <= bb.remaining()) {
                            val firstSignerLen = bb.int
                            if (firstSignerLen > 4 && firstSignerLen <= bb.remaining()) {
                                val signedDataLen = bb.int
                                val signedDataStart = bb.position()
                                // digests sequence
                                val digestsLen = bb.int
                                bb.position(bb.position() + digestsLen)
                                // certificates sequence
                                val certsLen = bb.int
                                if (certsLen > 4 && certsLen <= bb.remaining()) {
                                    val firstCertLen = bb.int
                                    if (firstCertLen > 0 && firstCertLen <= bb.remaining()) {
                                        val certDer = ByteArray(firstCertLen)
                                        bb.get(certDer)
                                        val cf = CertificateFactory.getInstance("X.509")
                                        val x509 = cf.generateCertificate(ByteArrayInputStream(certDer)) as X509Certificate
                                        return normalizeHex(formatColonSha256(x509.encoded))
                                    }
                                }
                                bb.position(signedDataStart + signedDataLen)
                            }
                        }
                    }
                    bb.position(nextPos)
                }
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    // ========================================================================
    // OFFICIAL ANDROID SYSTEM PACKAGE INSTALLER LAUNCHER
    // ========================================================================

    fun requestInstallVerifiedApk(
        activity: Activity,
        launchUnknownSourcesSettings: (Intent) -> Unit,
        launchPackageInstaller: (Intent) -> Unit
    ): JSONObject {
        val appCtx = activity.applicationContext
        val snap = _state.value
        val code = snap.targetVersionCode.takeIf { it > 0 } ?: lastConfig?.versionCode ?: 0
        val verifiedFile = if (!snap.verifiedApkPath.isNullOrBlank()) {
            File(snap.verifiedApkPath)
        } else {
            verifiedFileFor(appCtx, code)
        }

        if (!verifiedFile.exists() || verifiedFile.length() <= 0L) {
            emitState(
                appCtx,
                snap.copy(
                    phase = Phase.FAILED,
                    statusTextAr = "فشل التنزيل",
                    errorDetailAr = "ملف التحديث المحمّل لم يعد موجوداً. يرجى إعادة تنزيل التحديث.",
                    canInstall = false
                )
            )
            return JSONObject().put("ok", false).put("reason", "missing_apk")
        }

        // Re-verify expected file size before invoking system installer
        if (snap.totalBytes > 0L && verifiedFile.length() != snap.totalBytes) {
            runCatching { verifiedFile.delete() }
            emitState(
                appCtx,
                snap.copy(
                    phase = Phase.FAILED,
                    statusTextAr = "فشل التنزيل",
                    errorDetailAr = "تغير حجم حزمة التحديث قبل التثبيت؛ تم حذف الملف التالف لحماية التطبيق.",
                    canInstall = false
                )
            )
            return JSONObject().put("ok", false).put("reason", "size_mismatch")
        }

        // Check Android 8.0+ (API 26+) permission to install packages from this app source
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
            pendingAutoInstallAfterPermission = true
            emitState(
                appCtx,
                snap.copy(
                    phase = Phase.NEEDS_INSTALL_PERMISSION,
                    statusTextAr = "يرجى تفعيل صلاحية «السماح بتثبيت التطبيقات من هذا المصدر» للمتابعة تلقائياً",
                    canInstall = true
                )
            )
            val settingsIntent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${activity.packageName}")
            )
            launchUnknownSourcesSettings(settingsIntent)
            return JSONObject().put("ok", true).put("action", "requested_install_permission")
        }

        pendingAutoInstallAfterPermission = false
        return try {
            val apkUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                verifiedFile
            )

            @Suppress("DEPRECATION")
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
                putExtra(Intent.EXTRA_RETURN_RESULT, true)
                putExtra(Intent.EXTRA_INSTALLER_PACKAGE_NAME, activity.packageName)
            }

            emitState(
                appCtx,
                snap.copy(
                    phase = Phase.INSTALLING,
                    statusTextAr = "جارٍ فتح مثبّت نظام Android الرسمي...",
                    errorDetailAr = null,
                    canInstall = true
                )
            )

            launchPackageInstaller(installIntent)
            JSONObject().put("ok", true).put("action", "installer_launched")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch system installer: ${e.message}", e)
            emitState(
                appCtx,
                snap.copy(
                    phase = Phase.VERIFIED,
                    statusTextAr = "اكتمل التنزيل",
                    errorDetailAr = "تعذر فتح مثبّت النظام: ${e.message ?: "خطأ غير معروف"}",
                    canInstall = true
                )
            )
            JSONObject().put("ok", false).put("reason", e.message ?: "installer_error")
        }
    }

    fun onInstallerResult(context: Context, resultCode: Int) {
        val snap = _state.value
        if (resultCode != Activity.RESULT_OK && snap.canInstall) {
            emitState(
                context.applicationContext,
                snap.copy(
                    phase = Phase.VERIFIED,
                    statusTextAr = "اكتمل التنزيل",
                    errorDetailAr = "تم إلغاء التثبيت أو إغلاق نافذة المثبّت. ملف التحديث جاهز وموثّق، يمكنك الضغط على «تثبيت التحديث الآن» في أي وقت.",
                    canInstall = true
                )
            )
        }
    }
}
