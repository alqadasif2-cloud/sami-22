package com.sami.tradingchallengetracker

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.sami.tradingchallengetracker.data.ChallengeEntity
import com.sami.tradingchallengetracker.data.MilestoneEntity
import com.sami.tradingchallengetracker.data.MilestoneStatus
import com.sami.tradingchallengetracker.data.TradeEntity
import com.sami.tradingchallengetracker.data.TradeType
import com.sami.tradingchallengetracker.ui.*
import com.sami.tradingchallengetracker.util.CloudAsyncImage
import android.annotation.SuppressLint
import android.content.Intent
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import com.sami.tradingchallengetracker.util.FirebaseCloudHelper
import com.sami.tradingchallengetracker.util.Money
import kotlinx.coroutines.delay
import java.util.Locale

import android.media.MediaRecorder
import android.os.Build
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.sami.tradingchallengetracker.util.SamiFirebaseMessagingService
import com.sami.tradingchallengetracker.util.SamiUpdateManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()
    private var activeWebView: WebView? = null
    internal var pendingDeepLinkScript: String? = null
    internal var pendingDeepLinkQueryJson: String? = null

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        android.util.Log.d("SamiApp", "POST_NOTIFICATIONS granted: $isGranted")
        if (isGranted) {
            initFcmToken()
        }
    }

    private val unknownSourcesPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        val canInstall = SamiUpdateManager.canRequestPackageInstallsCompat(this)
        android.util.Log.d("SamiUpdater", "Returned from unknown sources settings, canInstall=$canInstall")
        if (canInstall && SamiUpdateManager.pendingAutoInstallAfterPermission) {
            SamiUpdateManager.pendingAutoInstallAfterPermission = false
            triggerNativeApkInstallInternal()
        } else {
            pushUpdateStateToWebView(SamiUpdateManager.state.value.toJson().toString())
        }
    }

    private val packageInstallerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        SamiUpdateManager.onInstallerResult(this, result.resultCode)
    }

    fun triggerNativeApkInstallInternal(): String {
        return SamiUpdateManager.requestInstallVerifiedApk(
            activity = this,
            launchUnknownSourcesSettings = { intent ->
                try {
                    unknownSourcesPermissionLauncher.launch(intent)
                } catch (e: Exception) {
                    android.util.Log.w("SamiUpdater", "Fallback startActivity for unknown sources: ${e.message}")
                    startActivity(intent)
                }
            },
            launchPackageInstaller = { intent ->
                try {
                    packageInstallerLauncher.launch(intent)
                } catch (e: Exception) {
                    android.util.Log.w("SamiUpdater", "Fallback startActivity for package installer: ${e.message}")
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                }
            }
        ).toString()
    }

    fun pushUpdateStateToWebView(stateJson: String) {
        val wv = activeWebView ?: return
        wv.post {
            try {
                wv.evaluateJavascript(
                    "if (typeof window !== 'undefined') { window.__samiNativeUpdateState = $stateJson; if (typeof window.__onSamiNativeUpdateState === 'function') { window.__onSamiNativeUpdateState($stateJson); } window.dispatchEvent(new CustomEvent('sami_native_update_state', { detail: $stateJson })); }",
                    null
                )
            } catch (_: Exception) {}
        }
    }

    private var pendingWebAudioPermissionRequest: android.webkit.PermissionRequest? = null
    private var isRequestingAudioPermission: Boolean = false

    private val audioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        android.util.Log.d("SamiApp", "RECORD_AUDIO granted: $isGranted")
        isRequestingAudioPermission = false
        val pendingReq = pendingWebAudioPermissionRequest
        pendingWebAudioPermissionRequest = null
        if (pendingReq != null) {
            try {
                if (isGranted) {
                    pendingReq.grant(pendingReq.resources)
                } else {
                    pendingReq.deny()
                }
            } catch (_: Exception) {}
        }
    }

    fun requestAudioPermissionInternal(webRequest: android.webkit.PermissionRequest? = null) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            if (webRequest != null) {
                try {
                    webRequest.grant(webRequest.resources)
                } catch (_: Exception) {}
            }
        } else {
            if (webRequest != null) {
                pendingWebAudioPermissionRequest = webRequest
            }
            if (!isRequestingAudioPermission) {
                isRequestingAudioPermission = true
                audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    private var nativeVoiceRecorder: MediaRecorder? = null
    private var nativeVoiceFile: File? = null
    private var nativeVoiceStartMs: Long = 0L

    @Synchronized
    fun startNativeVoiceRecInternal(): String {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestAudioPermissionInternal(null)
            return JSONObject().put("ok", false).put("reason", "permission_required").toString()
        }
        cancelNativeVoiceRecInternal()
        return try {
            val outFile = File(cacheDir, "sami_voice_${System.currentTimeMillis()}.m4a")
            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            recorder.setAudioChannels(1)
            recorder.setAudioSamplingRate(44100)
            recorder.setAudioEncodingBitRate(64000)
            recorder.setOutputFile(outFile.absolutePath)
            recorder.prepare()
            recorder.start()
            nativeVoiceRecorder = recorder
            nativeVoiceFile = outFile
            nativeVoiceStartMs = System.currentTimeMillis()
            JSONObject().put("ok", true).put("mimeType", "audio/mp4").toString()
        } catch (e: Exception) {
            android.util.Log.w("SamiAudio", "Native MediaRecorder start failed: ${e.message}")
            cancelNativeVoiceRecInternal()
            JSONObject().put("ok", false).put("reason", e.message ?: "recorder_error").toString()
        }
    }

    @Synchronized
    fun stopNativeVoiceRecInternal(): String {
        val recorder = nativeVoiceRecorder
        val outFile = nativeVoiceFile
        val elapsedSec = ((System.currentTimeMillis() - nativeVoiceStartMs) / 1000L).toInt().coerceAtLeast(1)
        nativeVoiceRecorder = null
        nativeVoiceFile = null
        nativeVoiceStartMs = 0L

        if (recorder == null || outFile == null) {
            return JSONObject().put("ok", false).put("reason", "not_recording").toString()
        }

        try {
            recorder.stop()
        } catch (e: Exception) {
            android.util.Log.w("SamiAudio", "Native MediaRecorder stop warning: ${e.message}")
        } finally {
            try {
                recorder.release()
            } catch (_: Exception) {}
        }

        return try {
            if (!outFile.exists() || outFile.length() <= 100L) {
                outFile.delete()
                JSONObject().put("ok", false).put("reason", "empty_audio").toString()
            } else {
                val bytes = outFile.readBytes()
                outFile.delete()
                val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                JSONObject()
                    .put("ok", true)
                    .put("mimeType", "audio/mp4")
                    .put("ext", "m4a")
                    .put("size", bytes.size)
                    .put("duration", elapsedSec)
                    .put("base64", b64)
                    .toString()
            }
        } catch (e: Exception) {
            try { outFile.delete() } catch (_: Exception) {}
            JSONObject().put("ok", false).put("reason", e.message ?: "read_failed").toString()
        }
    }

    @Synchronized
    fun cancelNativeVoiceRecInternal() {
        val recorder = nativeVoiceRecorder
        val outFile = nativeVoiceFile
        nativeVoiceRecorder = null
        nativeVoiceFile = null
        nativeVoiceStartMs = 0L
        if (recorder != null) {
            try { recorder.stop() } catch (_: Exception) {}
            try { recorder.release() } catch (_: Exception) {}
        }
        if (outFile != null) {
            try { outFile.delete() } catch (_: Exception) {}
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 0. Ensure FirebaseApp is initialized before Messaging/Firestore calls
        FirebaseCloudHelper.ensureInitialized(this)

        // Restore any in-progress or verified APK update state and bind WebView listener
        SamiUpdateManager.restorePersistedStateIfNeeded(this)
        SamiUpdateManager.setStateListener { stateJson ->
            pushUpdateStateToWebView(stateJson)
        }

        // 1. Initialize notification channels
        SamiFirebaseMessagingService.createNotificationChannels(this)

        // 2. Request notification permission on Android 13+ ONCE automatically (do not nag every launch if denied)
        if (Build.VERSION.SDK_INT >= 33) {
            val fcmPrefs = getSharedPreferences(SamiFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
            val alreadyPrompted = fcmPrefs.getBoolean(SamiFirebaseMessagingService.KEY_HAS_PROMPTED_NOTIF_PERM, false)
            if (!alreadyPrompted && ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                fcmPrefs.edit().putBoolean(SamiFirebaseMessagingService.KEY_HAS_PROMPTED_NOTIF_PERM, true).apply()
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Start authorized real-time notification listener if user session is already active
        val savedUid = SamiFirebaseMessagingService.getCurrentUserId(this)
        if (savedUid > 0) {
            FirebaseCloudHelper.startNotificationPushListener(applicationContext, savedUid)
        }

        initFcmToken()

        // 3. Process incoming notification deep link from launch intent
        processDeepLinkIntent(intent)

        val hasWeb = hasWebAssets(this)
        setContent {
            TradingChallengeTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    var forceNative by remember { mutableStateOf(!hasWeb) }
                    if (!forceNative) {
                        FullAppWebView(
                            activity = this@MainActivity,
                            onWebViewReady = { wv ->
                                activeWebView = wv
                            },
                            onFallbackToNative = {
                                android.util.Log.w("SamiApp", "Falling back to native Android interface.")
                                forceNative = true
                            }
                        )
                    } else {
                        TradingApp(viewModel)
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        SamiFirebaseMessagingService.setForegroundState(true)
        val uid = SamiFirebaseMessagingService.getCurrentUserId(this)
        if (uid > 0) {
            FirebaseCloudHelper.startNotificationPushListener(applicationContext, uid)
        }
        if (SamiUpdateManager.pendingAutoInstallAfterPermission && SamiUpdateManager.canRequestPackageInstallsCompat(this)) {
            SamiUpdateManager.pendingAutoInstallAfterPermission = false
            triggerNativeApkInstallInternal()
        }
        activeWebView?.let { wv ->
            val granted = NotificationManagerCompat.from(this).areNotificationsEnabled()
            val appInfoJson = SamiUpdateManager.getInstalledAppInfoJson(this)
            val updateSnapJson = SamiUpdateManager.state.value.toJson().toString()
            wv.post {
                wv.evaluateJavascript(
                    "if (typeof window !== 'undefined') { window.__samiNativeNotifPerm = ${if (granted) "'granted'" else "'denied'"}; window.__samiNativeAppInfo = $appInfoJson; window.__samiNativeUpdateState = $updateSnapJson; window.dispatchEvent(new Event('sami_native_perm_update')); window.dispatchEvent(new CustomEvent('sami_native_update_state', { detail: $updateSnapJson })); }",
                    null
                )
            }
        }
    }

    override fun onPause() {
        super.onPause()
        SamiFirebaseMessagingService.setForegroundState(false)
    }

    override fun onDestroy() {
        SamiUpdateManager.setStateListener(null)
        cancelNativeVoiceRecInternal()
        SamiFirebaseMessagingService.setForegroundState(false)
        super.onDestroy()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        processDeepLinkIntent(intent)
    }

    private fun escapeJsString(value: String): String {
        return value
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "")
    }

    private fun processDeepLinkIntent(intent: Intent?) {
        if (intent == null) return
        val channelId = intent.getStringExtra("channelId")?.trim() ?: ""
        val rawType = (intent.getStringExtra("chatType") ?: intent.getStringExtra("type") ?: "").trim()
        val explicitPartner = intent.getStringExtra("partnerIdStr")?.trim()?.toIntOrNull()
            ?: intent.getStringExtra("partnerId")?.trim()?.toIntOrNull()
            ?: intent.getStringExtra("privateChatWithUserId")?.trim()?.toIntOrNull()
            ?: if (intent.hasExtra("partnerId")) {
                val p = intent.getIntExtra("partnerId", 0)
                if (p > 0) p else null
            } else null
        val senderIdInt = intent.getStringExtra("senderId")?.trim()?.toIntOrNull()
        val isPrivate = rawType == "private" || rawType == "private_message" || (explicitPartner != null && explicitPartner > 0)
        val partnerId = explicitPartner ?: if (isPrivate && senderIdInt != null && senderIdInt > 0) senderIdInt else null
        val chatType = if (isPrivate) "private" else "channel"
        val messageId = intent.getStringExtra("messageId")?.trim() ?: ""
        val senderName = intent.getStringExtra("senderName")?.trim() ?: ""
        val targetRecipient = intent.getStringExtra("recipientUserId")?.trim()?.toIntOrNull()

        val hasNavigationTarget = channelId.isNotEmpty() || (partnerId != null && partnerId > 0) || messageId.isNotEmpty()
        if (!hasNavigationTarget) return

        // Clear consumed extras immediately so screen rotation never re-triggers stale navigation
        intent.removeExtra("channelId")
        intent.removeExtra("partnerId")
        intent.removeExtra("partnerIdStr")
        intent.removeExtra("privateChatWithUserId")
        intent.removeExtra("recipientUserId")
        intent.removeExtra("chatType")
        intent.removeExtra("type")
        intent.removeExtra("messageId")
        intent.removeExtra("senderName")
        intent.removeExtra("senderId")
        intent.removeExtra("fromNotification")

        // Verify recipient authorization before navigating to private/channel conversation
        val currentUid = SamiFirebaseMessagingService.getCurrentUserId(this)
        if (currentUid <= 0 || (targetRecipient != null && targetRecipient > 0 && currentUid != targetRecipient)) {
            android.util.Log.w(
                "SamiFCM",
                "Blocked notification deep link for unauthorized/logged-out user (current=$currentUid, target=$targetRecipient)"
            )
            return
        }

        val payloadJson = JSONObject().apply {
            if (channelId.isNotEmpty()) put("channelId", channelId) else put("channelId", JSONObject.NULL)
            if (partnerId != null && partnerId > 0) {
                put("partnerId", partnerId)
                put("privateChatWithUserId", partnerId)
            } else {
                put("partnerId", JSONObject.NULL)
                put("privateChatWithUserId", JSONObject.NULL)
            }
            put("chatType", chatType)
            put("type", if (chatType == "private") "private_message" else "channel_important")
            if (messageId.isNotEmpty()) put("messageId", messageId) else put("messageId", JSONObject.NULL)
            if (senderName.isNotEmpty()) put("senderName", senderName) else put("senderName", JSONObject.NULL)
        }.toString()

        val dedupKey = escapeJsString("${chatType}:${channelId}:${partnerId ?: 0}:${messageId}")
        val script = """
            (function() {
                if (typeof window === 'undefined') return;
                if (window.__samiLastDeepLinkKey === '$dedupKey') return;
                window.__samiLastDeepLinkKey = '$dedupKey';
                setTimeout(function() {
                    if (window.__samiLastDeepLinkKey === '$dedupKey') {
                        window.__samiLastDeepLinkKey = null;
                    }
                }, 2500);
                var payload = $payloadJson;
                window.__samiPendingDeepLink = payload;
                if (typeof window.dispatchNotificationDeepLink === 'function') {
                    window.dispatchNotificationDeepLink(payload);
                } else {
                    window.dispatchEvent(new CustomEvent('app_open_chat_message', { detail: payload }));
                }
            })();
        """.trimIndent()

        val wv = activeWebView
        if (wv != null) {
            wv.post { wv.evaluateJavascript(script, null) }
            wv.postDelayed({ wv.evaluateJavascript(script, null) }, 650)
        } else {
            pendingDeepLinkQueryJson = payloadJson
            pendingDeepLinkScript = script
        }
    }

    fun initFcmToken() {
        try {
            FirebaseCloudHelper.ensureInitialized(this)
            runCatching { FirebaseMessaging.getInstance().isAutoInitEnabled = true }
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result?.trim() ?: ""
                    if (token.isNotEmpty()) {
                        android.util.Log.d("SamiFCM", "Device FCM Token: $token")
                        getSharedPreferences(SamiFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
                            .edit()
                            .putString(SamiFirebaseMessagingService.KEY_FCM_TOKEN, token)
                            .apply()

                        val safeTok = escapeJsString(token)
                        val devId = escapeJsString(FirebaseCloudHelper.getStableDeviceId(this@MainActivity))
                        // Forward to active web session if loaded
                        activeWebView?.post {
                            activeWebView?.evaluateJavascript(
                                "if (typeof window !== 'undefined' && typeof window.registerAndroidFcmToken === 'function') { window.registerAndroidFcmToken('$safeTok', 0, '', '$devId'); }",
                                null
                            )
                        }

                        // If user was previously logged in, re-sync token immediately
                        val savedUserId = SamiFirebaseMessagingService.getCurrentUserId(this@MainActivity)
                        if (savedUserId > 0) {
                            val savedUsername = getSharedPreferences(SamiFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
                                .getString(SamiFirebaseMessagingService.KEY_CURRENT_USERNAME, "") ?: ""
                            syncFcmTokenToFirestore(savedUserId, savedUsername, token)
                        }
                    }
                } else {
                    android.util.Log.w("SamiFCM", "Failed to retrieve FCM token", task.exception)
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("SamiFCM", "FCM init exception: ${e.message}")
        }
    }

    fun requestNotificationPermissionInternal() {
        if (Build.VERSION.SDK_INT >= 33) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            openNotificationSettingsInternal()
        }
    }

    fun openNotificationSettingsInternal() {
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                }
            } else {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
            }
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.w("SamiApp", "Failed to open settings: ${e.message}")
        }
    }

    fun openBatteryOptimizationSettingsInternal() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
            }
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.w("SamiApp", "Failed to open app details settings: ${e.message}")
        }
    }

    fun syncFcmTokenToFirestore(userId: Int, username: String, explicitToken: String? = null) {
        val token = (explicitToken ?: SamiFirebaseMessagingService.getSavedToken(this))?.trim() ?: return
        if (token.isEmpty() || userId <= 0) return

        val devId = FirebaseCloudHelper.getStableDeviceId(applicationContext)
        CoroutineScope(Dispatchers.IO).launch {
            FirebaseCloudHelper.syncDeviceFcmToken(
                context = applicationContext,
                token = token,
                userId = userId,
                username = username
            )

            // Sync with active WebView layer as well
            val safeTok = escapeJsString(token)
            val safeUser = escapeJsString(username)
            val safeDev = escapeJsString(devId)
            activeWebView?.post {
                activeWebView?.evaluateJavascript(
                    "if (typeof window !== 'undefined' && typeof window.registerAndroidFcmToken === 'function') { window.registerAndroidFcmToken('$safeTok', $userId, '$safeUser', '$safeDev'); }",
                    null
                )
            }
        }
    }

    fun removeFcmTokenFromFirestore(userId: Int) {
        if (userId <= 0) return
        CoroutineScope(Dispatchers.IO).launch {
            FirebaseCloudHelper.removeDeviceFcmToken(applicationContext, userId)
        }
    }

    private fun hasWebAssets(context: Context): Boolean {
        return try {
            val stream = context.assets.open("index.html")
            stream.close()
            true
        } catch (_: Exception) {
            false
        }
    }
}

class SamiAndroidBridge(
    private val activity: MainActivity,
    private val getWebView: () -> WebView?
) {
    @JavascriptInterface
    fun getFcmToken(): String {
        return SamiFirebaseMessagingService.getSavedToken(activity) ?: ""
    }

    @JavascriptInterface
    fun checkNotificationPermission(): Boolean {
        return NotificationManagerCompat.from(activity).areNotificationsEnabled()
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        activity.runOnUiThread {
            activity.requestNotificationPermissionInternal()
        }
    }

    @JavascriptInterface
    fun openNotificationSettings() {
        activity.runOnUiThread {
            activity.openNotificationSettingsInternal()
        }
    }

    @JavascriptInterface
    fun openBatterySettings() {
        activity.runOnUiThread {
            activity.openBatteryOptimizationSettingsInternal()
        }
    }

    @JavascriptInterface
    fun consumePendingDeepLink(): String {
        val raw = activity.pendingDeepLinkQueryJson ?: ""
        activity.pendingDeepLinkQueryJson = null
        return raw
    }

    @JavascriptInterface
    fun syncUserSession(userId: String, username: String) {
        val uid = userId.trim().toIntOrNull() ?: 0
        if (uid > 0) {
            SamiFirebaseMessagingService.saveCurrentSession(activity, uid, username)
            activity.syncFcmTokenToFirestore(uid, username)
        }
    }

    @JavascriptInterface
    fun getDeviceId(): String {
        return FirebaseCloudHelper.getStableDeviceId(activity)
    }

    @JavascriptInterface
    fun unregisterFcmToken() {
        val uid = SamiFirebaseMessagingService.getCurrentUserId(activity)
        SamiFirebaseMessagingService.clearCurrentSession(activity)
        if (uid > 0) {
            activity.removeFcmTokenFromFirestore(uid)
        }
    }

    @JavascriptInterface
    fun registerFcmToken(token: String, userId: String, username: String) {
        val uid = userId.trim().toIntOrNull() ?: 0
        val cleanTok = token.trim()
        if (cleanTok.isNotEmpty()) {
            activity.getSharedPreferences(SamiFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(SamiFirebaseMessagingService.KEY_FCM_TOKEN, cleanTok)
                .apply()
        }
        if (uid > 0) {
            SamiFirebaseMessagingService.saveCurrentSession(activity, uid, username)
            activity.syncFcmTokenToFirestore(uid, username, cleanTok.ifEmpty { null })
        }
    }

    @JavascriptInterface
    fun checkAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun requestAudioPermission() {
        activity.runOnUiThread {
            activity.requestAudioPermissionInternal(null)
        }
    }

    @JavascriptInterface
    fun setActiveChatContext(chatType: String, channelId: String, partnerIdStr: String) {
        val pId = partnerIdStr.trim().toIntOrNull()
        SamiFirebaseMessagingService.setActiveConversation(
            chatType.trim().ifEmpty { null },
            channelId.trim().ifEmpty { null },
            pId
        )
    }

    @JavascriptInterface
    fun showNativeNotification(
        title: String,
        body: String,
        chatType: String,
        channelId: String,
        partnerIdStr: String,
        messageId: String,
        senderIdStr: String,
        senderName: String
    ) {
        val partnerId = partnerIdStr.trim().toIntOrNull()
        val senderId = senderIdStr.trim().toIntOrNull()
        SamiFirebaseMessagingService.postAuthorizedSystemNotification(
            context = activity.applicationContext,
            title = title,
            body = body,
            chatType = chatType.ifBlank { "channel" },
            channelId = channelId,
            partnerId = partnerId,
            messageId = messageId,
            senderId = senderId,
            senderName = senderName
        )
    }

    @JavascriptInterface
    fun startNativeVoiceRecording(): String {
        return activity.startNativeVoiceRecInternal()
    }

    @JavascriptInterface
    fun stopNativeVoiceRecording(): String {
        return activity.stopNativeVoiceRecInternal()
    }

    @JavascriptInterface
    fun cancelNativeVoiceRecording() {
        activity.cancelNativeVoiceRecInternal()
    }

    @JavascriptInterface
    fun onLogout() {
        val prevUid = SamiFirebaseMessagingService.getCurrentUserId(activity)
        SamiFirebaseMessagingService.clearCurrentSession(activity)
        if (prevUid > 0) {
            activity.removeFcmTokenFromFirestore(prevUid)
        }
    }

    // ========================================================================
    // IN-APP CLOUD APK UPDATE BRIDGE METHODS
    // ========================================================================

    @JavascriptInterface
    fun getInstalledAppInfo(): String {
        return SamiUpdateManager.getInstalledAppInfoJson(activity)
    }

    @JavascriptInterface
    fun getUpdateState(): String {
        SamiUpdateManager.restorePersistedStateIfNeeded(activity)
        return SamiUpdateManager.state.value.toJson().toString()
    }

    @JavascriptInterface
    fun canInstallPackages(): Boolean {
        return SamiUpdateManager.canRequestPackageInstallsCompat(activity)
    }

    @JavascriptInterface
    fun startAppUpdateDownload(configJson: String, serverBaseUrl: String, authHeaderJson: String): String {
        return try {
            val cfg = SamiUpdateManager.parseConfigFromJson(configJson, serverBaseUrl, authHeaderJson)
            SamiUpdateManager.startOrResumeDownload(activity.applicationContext, cfg, isResume = false)
            JSONObject().put("ok", true).toString()
        } catch (e: Exception) {
            JSONObject().put("ok", false).put("error", e.message ?: "invalid_config").toString()
        }
    }

    @JavascriptInterface
    fun pauseAppUpdateDownload(): String {
        SamiUpdateManager.pauseDownload(activity.applicationContext)
        return SamiUpdateManager.state.value.toJson().toString()
    }

    @JavascriptInterface
    fun resumeAppUpdateDownload(): String {
        val ok = SamiUpdateManager.resumeSavedDownload(activity.applicationContext)
        return JSONObject().put("ok", ok).put("state", SamiUpdateManager.state.value.toJson()).toString()
    }

    @JavascriptInterface
    fun cancelAppUpdateDownload(): String {
        SamiUpdateManager.cancelDownload(activity.applicationContext)
        return SamiUpdateManager.state.value.toJson().toString()
    }

    @JavascriptInterface
    fun installVerifiedAppUpdate(): String {
        var resultStr = JSONObject().put("ok", true).toString()
        activity.runOnUiThread {
            resultStr = activity.triggerNativeApkInstallInternal()
        }
        return resultStr
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun FullAppWebView(
    activity: MainActivity,
    onWebViewReady: (WebView) -> Unit = {},
    onFallbackToNative: () -> Unit = {}
) {
    val context = LocalContext.current
    var uploadMessage by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        uploadMessage?.onReceiveValue(uris)
        uploadMessage = null
    }

    BackHandler(enabled = webViewInstance?.canGoBack() == true) {
        webViewInstance?.goBack()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(0xFF050811.toInt())
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        allowFileAccessFromFileURLs = true
                        allowUniversalAccessFromFileURLs = true
                        mediaPlaybackRequiresUserGesture = false
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        builtInZoomControls = false
                        displayZoomControls = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        cacheMode = WebSettings.LOAD_DEFAULT
                    }
                    WebView.setWebContentsDebuggingEnabled(true)

                    // Add JavaScript Interfaces for FCM, Permissions, and Deep Linking
                    val bridge = SamiAndroidBridge(activity) { webViewInstance }
                    addJavascriptInterface(bridge, "SamiBridge")
                    addJavascriptInterface(bridge, "AndroidBridge")
                    addJavascriptInterface(bridge, "Android")

                    val assetLoader = WebViewAssetLoader.Builder()
                        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx))
                        .build()

                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView,
                            request: WebResourceRequest
                        ): WebResourceResponse? {
                            val url = request.url
                            val scheme = url.scheme?.lowercase(Locale.ROOT) ?: ""
                            // Never intercept blob:, data:, mediastream:, file:, or content: URLs (required for audio/media!)
                            if (scheme != "http" && scheme != "https") {
                                return null
                            }
                            val host = url.host?.lowercase(Locale.ROOT) ?: ""
                            if (host == "appassets.androidplatform.net" || host == "localhost") {
                                val localResp = loadAssetFile(ctx, url.path ?: "", request.isForMainFrame)
                                if (localResp != null) return localResp
                            }
                            return assetLoader.shouldInterceptRequest(url)
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isLoading = false
                            val appInfoJson = SamiUpdateManager.getInstalledAppInfoJson(ctx)
                            val updateSnapJson = SamiUpdateManager.state.value.toJson().toString()
                            view?.evaluateJavascript(
                                "if (typeof window !== 'undefined') { window.__samiNativeAppInfo = $appInfoJson; window.__samiNativeUpdateState = $updateSnapJson; window.dispatchEvent(new CustomEvent('sami_native_update_state', { detail: $updateSnapJson })); }",
                                null
                            )
                            val token = SamiFirebaseMessagingService.getSavedToken(ctx)
                            val devId = FirebaseCloudHelper.getStableDeviceId(ctx)
                            if (!token.isNullOrBlank()) {
                                val safeTok = token.replace("\\", "\\\\").replace("'", "\\'")
                                val safeDev = devId.replace("\\", "\\\\").replace("'", "\\'")
                                view?.evaluateJavascript(
                                    "if (typeof window !== 'undefined' && typeof window.registerAndroidFcmToken === 'function') { window.registerAndroidFcmToken('$safeTok', 0, '', '$safeDev'); }",
                                    null
                                )
                            }
                            activity.pendingDeepLinkScript?.let { script: String ->
                                view?.postDelayed({ view.evaluateJavascript(script, null) }, 400)
                                view?.postDelayed({ view.evaluateJavascript(script, null) }, 1200)
                                activity.pendingDeepLinkScript = null
                            }
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                            android.util.Log.e("SamiWebView", "Error loading ${request?.url}: ${error?.description}")
                            if (request?.isForMainFrame == true) {
                                onFallbackToNative()
                            }
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            android.util.Log.d(
                                "SamiWebView",
                                "[JS ${consoleMessage?.messageLevel()}] ${consoleMessage?.message()} (${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()})"
                            )
                            return true
                        }

                        override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                            if (request == null) return
                            val wantsAudio = request.resources?.any {
                                it == android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE
                            } == true
                            activity.runOnUiThread {
                                if (wantsAudio) {
                                    activity.requestAudioPermissionInternal(request)
                                } else {
                                    try {
                                        request.grant(request.resources)
                                    } catch (_: Exception) {}
                                }
                            }
                        }

                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            uploadMessage?.onReceiveValue(null)
                            uploadMessage = filePathCallback
                            val acceptList = fileChooserParams?.acceptTypes?.filterNotNull() ?: emptyList()
                            val wantsApk = acceptList.any {
                                it.contains(".apk", ignoreCase = true) ||
                                    it.contains("package-archive", ignoreCase = true)
                            }
                            val intent = if (wantsApk) {
                                Intent(Intent.ACTION_GET_CONTENT).apply {
                                    addCategory(Intent.CATEGORY_OPENABLE)
                                    type = "*/*"
                                    putExtra(
                                        Intent.EXTRA_MIME_TYPES,
                                        arrayOf(
                                            "application/vnd.android.package-archive",
                                            "application/octet-stream",
                                            "application/zip",
                                            "*/*"
                                        )
                                    )
                                }
                            } else {
                                fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                    addCategory(Intent.CATEGORY_OPENABLE)
                                    type = "*/*"
                                }
                            }
                            try {
                                fileChooserLauncher.launch(intent)
                            } catch (_: Exception) {
                                val fallbackIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                                    addCategory(Intent.CATEGORY_OPENABLE)
                                    type = "*/*"
                                }
                                fileChooserLauncher.launch(fallbackIntent)
                            }
                            return true
                        }
                    }

                    val initialDeepLink = activity.pendingDeepLinkQueryJson
                    activity.pendingDeepLinkQueryJson = null
                    val initialUrl = if (!initialDeepLink.isNullOrBlank()) {
                        activity.pendingDeepLinkScript = null
                        "https://appassets.androidplatform.net/index.html?sami_deeplink=" + Uri.encode(initialDeepLink)
                    } else {
                        "https://appassets.androidplatform.net/index.html"
                    }
                    loadUrl(initialUrl)
                    webViewInstance = this
                    onWebViewReady(this)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF050811)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    CircularProgressIndicator(
                        color = AmberAccent,
                        modifier = Modifier.size(44.dp)
                    )
                    Text(
                        text = "Sami",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

private fun getMimeType(filePath: String): String {
    val lower = filePath.lowercase(Locale.ROOT)
    return when {
        lower.endsWith(".html") || lower.endsWith(".htm") -> "text/html"
        lower.endsWith(".js") || lower.endsWith(".mjs") -> "text/javascript"
        lower.endsWith(".css") -> "text/css"
        lower.endsWith(".json") -> "application/json"
        lower.endsWith(".png") -> "image/png"
        lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
        lower.endsWith(".gif") -> "image/gif"
        lower.endsWith(".svg") -> "image/svg+xml"
        lower.endsWith(".webp") -> "image/webp"
        lower.endsWith(".ico") -> "image/x-icon"
        lower.endsWith(".m4a") -> "audio/mp4"
        lower.endsWith(".mp3") -> "audio/mpeg"
        lower.endsWith(".aac") -> "audio/aac"
        lower.endsWith(".ogg") || lower.endsWith(".oga") || lower.endsWith(".opus") -> "audio/ogg"
        lower.endsWith(".wav") -> "audio/wav"
        lower.endsWith(".weba") -> "audio/webm"
        lower.endsWith(".mp4") -> "video/mp4"
        lower.endsWith(".webm") -> if (lower.contains("voice") || lower.contains("audio")) "audio/webm" else "video/webm"
        lower.endsWith(".woff2") -> "font/woff2"
        lower.endsWith(".woff") -> "font/woff"
        lower.endsWith(".ttf") -> "font/ttf"
        lower.endsWith(".otf") -> "font/otf"
        lower.endsWith(".wasm") -> "application/wasm"
        else -> "application/octet-stream"
    }
}

private fun loadAssetFile(context: Context, rawPath: String, isForMainFrame: Boolean = false): WebResourceResponse? {
    try {
        var cleanPath = rawPath.trimStart('/')
        if (
            cleanPath.isEmpty() ||
            cleanPath == "index.html" ||
            (isForMainFrame && (
                cleanPath == "assets" ||
                cleanPath == "assets/" ||
                cleanPath.contains("fix-center") ||
                cleanPath == "sami.html"
            ))
        ) {
            cleanPath = "index.html"
        }

        val candidates = mutableListOf<String>()
        candidates.add(cleanPath)
        if (cleanPath.startsWith("assets/")) {
            candidates.add(cleanPath.removePrefix("assets/"))
        } else {
            candidates.add("assets/$cleanPath")
        }

        for (candidate in candidates) {
            try {
                val inputStream = context.assets.open(candidate)
                val mimeType = getMimeType(candidate)
                val encoding = if (mimeType.startsWith("text/") || mimeType.contains("javascript") || mimeType.contains("json")) "UTF-8" else null
                val headers = HashMap<String, String>().apply {
                    put("Access-Control-Allow-Origin", "*")
                    put("Cache-Control", "no-cache")
                }
                return WebResourceResponse(mimeType, encoding, 200, "OK", headers, inputStream)
            } catch (_: Exception) {
                // Try next candidate
            }
        }
    } catch (e: Exception) {
        android.util.Log.e("SamiWebView", "Error opening asset for path: $rawPath", e)
    }
    return null
}

enum class ScreenTab {
    DASHBOARD, CHAT, HISTORY, ROADMAP, SETTINGS
}

@Composable
fun TradingApp(viewModel: MainViewModel) {
    val context = LocalContext.current
    var currentUser by remember {
        val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
        val userId = prefs.getInt("user_id", -1)
        val username = prefs.getString("username", null)
        val displayName = prefs.getString("display_name", null)
        mutableStateOf(
            if (userId != -1 && username != null && displayName != null) {
                AndroidAuthUser(userId, username, displayName, "")
            } else null
        )
    }

    // Mandatory Login Screen if not authenticated
    val activeUser = currentUser
    if (activeUser == null) {
        AndroidLoginScreen(onLoginSuccess = { user ->
            viewModel.setCurrentUser(user.id, user.displayName)
            currentUser = user
        })
        return
    }

    // Ensure ViewModel is bound to the currently authenticated user's isolated data
    LaunchedEffect(activeUser.id) {
        viewModel.setCurrentUser(activeUser.id, activeUser.displayName)
    }

    val challenge by viewModel.challenge.collectAsState()
    val trades by viewModel.trades.collectAsState()
    val milestones by viewModel.milestones.collectAsState()

    var activeTab by remember { mutableStateOf(ScreenTab.DASHBOARD) }
    var showAddTradeModal by remember { mutableStateOf(false) }
    var selectedTrade by remember { mutableStateOf<TradeEntity?>(null) }
    var selectedMilestone by remember { mutableStateOf<MilestoneEntity?>(null) }
    var viewingImageUrl by remember { mutableStateOf<String?>(null) }
    var showResetDialog by remember { mutableStateOf(false) }
    var showStartDialog by remember { mutableStateOf(false) }
    var showNewChallengeDialog by remember { mutableStateOf(false) }
    var newCapitalInput by remember { mutableStateOf("500") }
    var notificationMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(notificationMessage) {
        if (notificationMessage != null) {
            delay(4000)
            notificationMessage = null
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF0D131F),
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = activeTab == ScreenTab.DASHBOARD,
                    onClick = { activeTab = ScreenTab.DASHBOARD },
                    icon = { Icon(Icons.Default.Home, contentDescription = "الرئيسية") },
                    label = { Text("الرئيسية", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AmberAccent,
                        selectedTextColor = AmberAccent,
                        indicatorColor = Color.Transparent,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = activeTab == ScreenTab.CHAT,
                    onClick = { activeTab = ScreenTab.CHAT },
                    icon = { Icon(Icons.Default.Forum, contentDescription = "الدردشة 3000$") },
                    label = { Text("الدردشة 3000$", fontSize = 9.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AmberAccent,
                        selectedTextColor = AmberAccent,
                        indicatorColor = Color.Transparent,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = activeTab == ScreenTab.HISTORY,
                    onClick = { activeTab = ScreenTab.HISTORY },
                    icon = { Icon(Icons.Default.Description, contentDescription = "سجل الصفقات") },
                    label = { Text("سجل الصفقات", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AmberAccent,
                        selectedTextColor = AmberAccent,
                        indicatorColor = Color.Transparent,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = activeTab == ScreenTab.ROADMAP,
                    onClick = { activeTab = ScreenTab.ROADMAP },
                    icon = { Icon(Icons.Default.Map, contentDescription = "المحطات") },
                    label = { Text("المحطات", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AmberAccent,
                        selectedTextColor = AmberAccent,
                        indicatorColor = Color.Transparent,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = activeTab == ScreenTab.SETTINGS,
                    onClick = { activeTab = ScreenTab.SETTINGS },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "الإعدادات") },
                    label = { Text("الإعدادات", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AmberAccent,
                        selectedTextColor = AmberAccent,
                        indicatorColor = Color.Transparent,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
            }
        },
        containerColor = DarkBg
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(DarkBg)
        ) {
            val ch = challenge
            if (ch != null) {
                // Background image ONLY on Dashboard screen (and Login screen)
                if (activeTab == ScreenTab.DASHBOARD) {
                    LoopingBackgroundVideo(rawResId = R.drawable.background_image, overlayAlpha = 0.65f)
                }

                when (activeTab) {
                    ScreenTab.DASHBOARD -> DashboardContent(
                        challenge = ch,
                        trades = trades,
                        notificationMessage = notificationMessage,
                        onOpenSettings = { activeTab = ScreenTab.SETTINGS },
                        onOpenAddTrade = { showAddTradeModal = true },
                        onStartChallenge = { showStartDialog = true },
                        onNewChallenge = {
                            newCapitalInput = (ch.initialCapitalCents / 100L).toString()
                            showNewChallengeDialog = true
                        }
                    )
                    ScreenTab.CHAT -> AndroidGroupChatScreen(
                        currentUser = activeUser
                    )
                    ScreenTab.HISTORY -> HistoryContent(
                        trades = trades,
                        onSharePdf = {
                            viewModel.sharePdfReport(context) { errMsg ->
                                notificationMessage = errMsg
                            }
                        },
                        onSelectTrade = { selectedTrade = it },
                        onOpenAddTrade = { showAddTradeModal = true }
                    )
                    ScreenTab.ROADMAP -> RoadmapContent(
                        milestones = milestones,
                        trades = trades,
                        onSelectMilestone = { selectedMilestone = it }
                    )
                    ScreenTab.SETTINGS -> SettingsContent(
                        challenge = ch,
                        currentUser = activeUser,
                        onLogout = {
                            val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                            prefs.edit().clear().apply()
                            viewModel.clearSession()
                            selectedTrade = null
                            selectedMilestone = null
                            viewingImageUrl = null
                            activeTab = ScreenTab.DASHBOARD
                            currentUser = null
                        },
                        onSave = { name, initCap, target ->
                            viewModel.saveSettings(name, initCap, target)
                        },
                        onResetClick = { showResetDialog = true },
                        onNewChallengeClick = {
                            newCapitalInput = (ch.initialCapitalCents / 100L).toString()
                            showNewChallengeDialog = true
                        }
                    )
                }
            } else {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = AmberAccent
                )
            }
        }
    }

    // Add Trade Modal Dialog with Gallery & Camera Image Attachment
    val activeChallengeForTrade = challenge
    if (showAddTradeModal && activeChallengeForTrade != null) {
        var tradeInput by remember { mutableStateOf("") }
        var isLossSign by remember { mutableStateOf(false) }
        var attachmentUri by remember { mutableStateOf<Uri?>(null) }
        var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
        var errorMsg by remember { mutableStateOf<String?>(null) }
        var isSubmitting by remember { mutableStateOf(false) }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            if (uri != null) {
                attachmentUri = uri
                errorMsg = null
            }
        }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicture()
        ) { success: Boolean ->
            if (success && pendingCameraUri != null) {
                attachmentUri = pendingCameraUri
                errorMsg = null
            }
        }

        val cameraPermissionLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestPermission()
        ) { isGranted: Boolean ->
            if (isGranted) {
                val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
                pendingCameraUri = outUri
                cameraLauncher.launch(outUri)
            } else {
                errorMsg = "يرجى السماح بصلاحية الكاميرا لالتقاط صورة الصفقة."
            }
        }

        val projectedBalanceCents = remember(tradeInput, isLossSign, activeChallengeForTrade.currentBalanceCents) {
            val raw = tradeInput.trim()
            if (raw.isEmpty()) {
                activeChallengeForTrade.currentBalanceCents
            } else {
                val withSign = if (!raw.startsWith("+") && !raw.startsWith("-")) {
                    if (isLossSign) "-$raw" else "+$raw"
                } else raw
                val parsed = Money.parseToCents(withSign)
                if (parsed.isSuccess) {
                    activeChallengeForTrade.currentBalanceCents + parsed.getOrThrow()
                } else {
                    activeChallengeForTrade.currentBalanceCents
                }
            }
        }

        AlertDialog(
            onDismissRequest = { if (!isSubmitting) showAddTradeModal = false },
            title = {
                Text(
                    "إضافة صفقة جديدة (الصفقة #${activeChallengeForTrade.tradeCount + 1})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.White
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(
                        color = Color(0xFF141B2A),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("الرصيد الحالي", fontSize = 11.sp, color = TextMuted)
                            Text(
                                Money.format(activeChallengeForTrade.currentBalanceCents),
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                                color = Color.White
                            )
                            if (tradeInput.isNotBlank()) {
                                Text(
                                    "الرصيد المتوقع بعد الصفقة: ${Money.format(projectedBalanceCents)}",
                                    fontSize = 11.sp,
                                    color = AmberAccent,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = { isLossSign = false },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (!isLossSign) ProfitGreen else Color(0xFF1E293B)
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("ربح (+)", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { isLossSign = true },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isLossSign) LossRed else Color(0xFF1E293B)
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("خسارة (-)", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }

                    OutlinedTextField(
                        value = tradeInput,
                        onValueChange = { tradeInput = it; errorMsg = null },
                        placeholder = { Text("أدخل القيمة (مثال: 20 أو -15)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    // Image Attachment Section (Gallery + Camera)
                    Text("إرفاق صورة الصفقة (اختياري • سحابي)", fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.Bold)

                    if (attachmentUri != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(130.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, AmberAccent, RoundedCornerShape(12.dp))
                        ) {
                            AsyncImage(
                                model = attachmentUri,
                                contentDescription = "مرفق الصفقة",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            IconButton(
                                onClick = { attachmentUri = null },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(6.dp)
                                    .background(Color.Black.copy(alpha = 0.7f), CircleShape)
                                    .size(28.dp)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "حذف الصورة", tint = LossRed, modifier = Modifier.size(16.dp))
                            }
                        }
                    } else {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            OutlinedButton(
                                onClick = { galleryLauncher.launch("image/*") },
                                modifier = Modifier.weight(1f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                            ) {
                                Icon(Icons.Default.Image, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("المعرض", fontSize = 11.sp, color = Color.White)
                            }
                            OutlinedButton(
                                onClick = {
                                    val hasCamPerm = ContextCompat.checkSelfPermission(
                                        context,
                                        Manifest.permission.CAMERA
                                    ) == PackageManager.PERMISSION_GRANTED
                                    if (hasCamPerm) {
                                        val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
                                        pendingCameraUri = outUri
                                        cameraLauncher.launch(outUri)
                                    } else {
                                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                            ) {
                                Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("الكاميرا", fontSize = 11.sp, color = Color.White)
                            }
                        }
                    }

                    val currentErrorMsg = errorMsg
                    if (currentErrorMsg != null) {
                        Text(currentErrorMsg, color = LossRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting,
                    onClick = {
                        val raw = tradeInput.trim()
                        val inputWithSign = if (!raw.startsWith("+") && !raw.startsWith("-")) {
                            if (isLossSign) "-$raw" else "+$raw"
                        } else raw
                        val parseResult = Money.parseToCents(inputWithSign)
                        if (parseResult.isSuccess) {
                            val cents = parseResult.getOrThrow()
                            isSubmitting = true
                            viewModel.recordTrade(
                                resultCents = cents,
                                attachmentUri = attachmentUri,
                                onSuccess = { num ->
                                    isSubmitting = false
                                    showAddTradeModal = false
                                    notificationMessage = "تم تسجيل الصفقة #$num بنجاح"
                                },
                                onError = {
                                    isSubmitting = false
                                    errorMsg = it
                                }
                            )
                        } else {
                            errorMsg = parseResult.exceptionOrNull()?.message ?: "رقم غير صحيح"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text(
                        if (isSubmitting) "جاري الحفظ..." else "تأكيد الصفقة",
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            dismissButton = {
                TextButton(
                    enabled = !isSubmitting,
                    onClick = { showAddTradeModal = false }
                ) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // Trade Detail Dialog
    val activeSelectedTrade = selectedTrade
    if (activeSelectedTrade != null) {
        val trade = activeSelectedTrade
        val isWin = trade.type == TradeType.WIN
        AlertDialog(
            onDismissRequest = { selectedTrade = null },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("تفاصيل الصفقة #${trade.tradeNumber}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
                    Surface(
                        color = if (isWin) Color(0x2210B981) else Color(0x22EF4444),
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = if (isWin) "WIN ✔" else "LOSS ✕",
                            color = if (isWin) ProfitGreen else LossRed,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(
                        color = Color(0xFF141B2A),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("النتيجة", fontSize = 11.sp, color = TextMuted)
                            Text(
                                Money.format(trade.resultCents, true),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isWin) ProfitGreen else LossRed
                            )
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الرصيد السابق:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.format(trade.oldBalanceCents), color = Color.LightGray, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الرصيد الجديد:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.format(trade.newBalanceCents), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("التاريخ والوقت:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.formatDateTime(trade.timestamp), color = Color.LightGray, fontSize = 12.sp)
                    }

                    if (!trade.attachmentPath.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("المرفقات:", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { viewingImageUrl = trade.attachmentPath }
                        ) {
                            CloudAsyncImage(
                                imageUrl = trade.attachmentPath,
                                contentDescription = "مرفق الصفقة",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        TextButton(
                            onClick = { viewingImageUrl = trade.attachmentPath },
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        ) {
                            Icon(Icons.Default.Visibility, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("عرض الصورة بحجم كامل", color = AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedTrade = null },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("إغلاق", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = CardBg
        )
    }

    // Milestone Detail Dialog
    val activeSelectedMilestone = selectedMilestone
    if (activeSelectedMilestone != null) {
        val m = activeSelectedMilestone
        val isWin = m.status == MilestoneStatus.WIN
        val isLoss = m.status == MilestoneStatus.LOSS
        AlertDialog(
            onDismissRequest = { selectedMilestone = null },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("تفاصيل المحطة #${m.milestoneNumber}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
                    Text(
                        text = when {
                            isWin -> "WIN ✔"
                            isLoss -> "LOSS ✕"
                            else -> "لم تبدأ بعد"
                        },
                        color = when {
                            isWin -> ProfitGreen
                            isLoss -> LossRed
                            else -> TextMuted
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الربح / النتيجة:", color = TextMuted, fontSize = 12.sp)
                        Text(
                            Money.format(m.profitCents, true),
                            color = if (isWin) ProfitGreen else if (isLoss) LossRed else TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("رصيد الحساب:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.format(m.balanceCents), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("تاريخ الصفقة:", color = TextMuted, fontSize = 12.sp)
                        val milestoneTimestamp = m.timestamp
                        Text(
                            if (milestoneTimestamp != null) Money.formatDateTime(milestoneTimestamp) else "-",
                            color = Color.LightGray,
                            fontSize = 12.sp
                        )
                    }

                    if (!m.attachmentPath.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("صورة الصفقة المرفقة:", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { viewingImageUrl = m.attachmentPath }
                        ) {
                            CloudAsyncImage(
                                imageUrl = m.attachmentPath,
                                contentDescription = "مرفق المحطة",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        TextButton(
                            onClick = { viewingImageUrl = m.attachmentPath },
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        ) {
                            Icon(Icons.Default.Visibility, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("عرض الصورة بحجم كامل", color = AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedMilestone = null },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("إغلاق", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = CardBg
        )
    }

    // Fullscreen Image Lightbox Dialog
    val activeViewingImageUrl = viewingImageUrl
    if (activeViewingImageUrl != null) {
        FullScreenImageViewerDialog(
            imageUrl = activeViewingImageUrl,
            onDismiss = { viewingImageUrl = null }
        )
    }

    // Reset Confirmation
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("إعادة الرحلة؟", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
                Text(
                    "سيؤدي هذا الإجراء إلى حذف سجل الصفقات وإعادة جميع المحطات إلى حالتها الأولية.\nهل أنت متأكد؟",
                    color = Color.LightGray
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.resetChallenge {
                            showResetDialog = false
                            notificationMessage = "تم إعادة ضبط الرحلة بنجاح"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LossRed)
                ) {
                    Text("تأكيد", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // Start Challenge Confirmation
    val activeChallengeForStart = challenge
    if (showStartDialog && activeChallengeForStart != null) {
        AlertDialog(
            onDismissRequest = { showStartDialog = false },
            title = { Text("تأكيد بدء الرحلة", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
                Text(
                    "سيتم بدء الرحلة برأس مال ${Money.format(activeChallengeForStart.initialCapitalCents)}.\nهل أنت متأكد من بدء الرحلة؟",
                    color = Color.LightGray
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.startChallenge()
                        showStartDialog = false
                        notificationMessage = "تم بدء الرحلة برأس مال ${Money.format(activeChallengeForStart.initialCapitalCents)}"
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("تأكيد", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartDialog = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // New Challenge Dialog with Quick Capital Presets
    if (showNewChallengeDialog) {
        var error by remember { mutableStateOf<String?>(null) }
        AlertDialog(
            onDismissRequest = { showNewChallengeDialog = false },
            title = { Text("بدء رحلة جديدة", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("أدخل رأس المال الابتدائي للرحلة الجديدة ($):", color = Color.LightGray, fontSize = 12.sp)
                    OutlinedTextField(
                        value = newCapitalInput,
                        onValueChange = { newCapitalInput = it; error = null },
                        placeholder = { Text("500") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        listOf(50, 100, 250, 500, 1000).forEach { preset ->
                            Surface(
                                color = Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        newCapitalInput = preset.toString()
                                        error = null
                                    }
                            ) {
                                Text(
                                    text = "$$preset",
                                    color = AmberAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }
                    val currentError = error
                    if (currentError != null) {
                        Text(currentError, color = LossRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val parsed = Money.parseCapitalToCents(newCapitalInput)
                        if (parsed.isSuccess) {
                            val newCap = parsed.getOrThrow()
                            viewModel.startNewChallenge(newCap) {
                                showNewChallengeDialog = false
                                notificationMessage = "تم بدء الرحلة الجديدة برأس مال ${Money.format(newCap)}"
                            }
                        } else {
                            error = parsed.exceptionOrNull()?.message ?: "قيمة غير صحيحة"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("بدء الرحلة", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showNewChallengeDialog = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }
}

@Composable
fun DashboardContent(
    challenge: ChallengeEntity,
    trades: List<TradeEntity>,
    notificationMessage: String?,
    onOpenSettings: () -> Unit,
    onOpenAddTrade: () -> Unit,
    onStartChallenge: () -> Unit,
    onNewChallenge: () -> Unit
) {
    val progress = Money.calculateProgress(challenge.currentBalanceCents, challenge.targetBalanceCents)
    val isTargetReached = challenge.currentBalanceCents >= challenge.targetBalanceCents
    val completedTradesCount = trades.count { it.type == TradeType.WIN }
    val remainingTrades = (150 - completedTradesCount).coerceAtLeast(0)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color(0xFF1E293B), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = AmberAccent)
                }
                Column {
                    Text("Sami", fontSize = 11.sp, color = TextMuted)
                    Text(
                        challenge.userName.ifEmpty { "المتداول" },
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Default.Settings, contentDescription = "الإعدادات", tint = TextMuted)
            }
        }

        // In-App Notification Banner
        if (notificationMessage != null) {
            Surface(
                color = Color(0x2610B981),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, ProfitGreen.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ProfitGreen, modifier = Modifier.size(18.dp))
                    Text(notificationMessage, color = ProfitGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Target Reached Banner
        if (isTargetReached) {
            Surface(
                color = Color(0x33F59E0B),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("🎯 تم الوصول إلى الهدف النهائي!", color = AmberAccent, fontWeight = FontWeight.Black, fontSize = 14.sp)
                    Text("تهانينا! يمكنك الاستمرار في التداول حتى المحطة الـ150.", color = Color.LightGray, fontSize = 11.sp)
                }
            }
        }

        // Hero Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("الرصيد الحالي", fontSize = 12.sp, color = TextMuted)
                    Text(
                        "البدء: ${Money.format(challenge.initialCapitalCents)}",
                        fontSize = 11.sp,
                        color = AmberAccent
                    )
                }
                Text(
                    Money.format(challenge.currentBalanceCents),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )

                // Progress Bar
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("الهدف: ${Money.format(challenge.targetBalanceCents)}", fontSize = 12.sp, color = TextMuted)
                        Text("${String.format(java.util.Locale.US, "%.2f", progress)}%", fontSize = 12.sp, color = AmberAccent, fontWeight = FontWeight.Bold)
                    }
                    LinearProgressIndicator(
                        progress = { progress / 100f },
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = AmberAccent,
                        trackColor = Color(0xFF1E293B),
                    )
                }
            }
        }

        // 4 Stat Cards
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatCard(
                title = "رأس المال الابتدائي",
                value = Money.format(challenge.initialCapitalCents),
                sub = "نقطة الانطلاق",
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "عدد الصفقات",
                value = "$completedTradesCount / 150",
                sub = "متبقي $remainingTrades",
                modifier = Modifier.weight(1f)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatCard(
                title = "الرصيد الحالي",
                value = Money.format(challenge.currentBalanceCents),
                sub = if (challenge.tradeCount == 0) "قبل البدء" else "رصيد الحساب",
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "الهدف النهائي",
                value = Money.format(challenge.targetBalanceCents),
                sub = "خطة النهاية",
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Actions
        if (!challenge.challengeStarted) {
            Button(
                onClick = onStartChallenge,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
            ) {
                Text("بدء الرحلة برأس مال ${Money.format(challenge.initialCapitalCents)}", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        } else {
            Button(
                onClick = onOpenAddTrade,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AmberAccent),
                enabled = completedTradesCount < 150
            ) {
                Text(
                    if (completedTradesCount < 150) "إضافة صفقة جديدة (الصفقة #${challenge.tradeCount + 1})" else "🎉 تم إكمال الـ 150 محطة",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold
                )
            }
            OutlinedButton(
                onClick = onNewChallenge,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("ابدأ رحلة جديدة (تجديد 150 محطة تداول)", color = AmberAccent, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun StatCard(title: String, value: String, sub: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontSize = 11.sp, color = TextMuted)
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text(sub, fontSize = 10.sp, color = TextMuted)
        }
    }
}

@Composable
fun HistoryContent(
    trades: List<TradeEntity>,
    onSharePdf: () -> Unit,
    onSelectTrade: (TradeEntity) -> Unit,
    onOpenAddTrade: () -> Unit
) {
    var filter by remember { mutableStateOf("all") }

    var totalProfits = 0L
    var totalLosses = 0L
    var netResult = 0L
    trades.forEach { t ->
        if (t.resultCents > 0) totalProfits += t.resultCents
        else if (t.resultCents < 0) totalLosses += Math.abs(t.resultCents)
        netResult += t.resultCents
    }

    val filtered = trades.filter {
        when (filter) {
            "win" -> it.type == TradeType.WIN
            "loss" -> it.type == TradeType.LOSS
            "image" -> !it.attachmentPath.isNullOrBlank()
            else -> true
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("سجل الصفقات", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            OutlinedButton(
                onClick = onSharePdf,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = AmberAccent),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent)
            ) {
                Text("مشاركة التقرير (PDF)", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }

        // 4 Metric Boxes
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("صافي النتائج", fontSize = 9.sp, color = TextMuted)
                    Text(Money.format(netResult, true), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (netResult >= 0) ProfitGreen else LossRed)
                }
            }
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("إجمالي الخسائر", fontSize = 9.sp, color = TextMuted)
                    Text(if (totalLosses > 0) "-${Money.format(totalLosses)}" else "$0.00", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LossRed)
                }
            }
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("إجمالي الأرباح", fontSize = 9.sp, color = TextMuted)
                    Text(Money.format(totalProfits, true), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ProfitGreen)
                }
            }
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("عدد الصفقات", fontSize = 9.sp, color = TextMuted)
                    Text("${trades.size}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }

        // Filter tabs
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChipItem("الكل", filter == "all") { filter = "all" }
            FilterChipItem("الربح ↑", filter == "win") { filter = "win" }
            FilterChipItem("الخسارة ↓", filter == "loss") { filter = "loss" }
            FilterChipItem("مع صورة 📷", filter == "image") { filter = "image" }
        }

        if (filtered.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("لا توجد صفقات حتى الآن", fontWeight = FontWeight.Bold, color = Color.White)
                    Text("ابدأ بإضافة أول صفقة لمتابعة تقدمك.", fontSize = 12.sp, color = TextMuted)
                    Button(
                        onClick = onOpenAddTrade,
                        colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                    ) {
                        Text("إضافة صفقة", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
                items(filtered, key = { it.id }) { trade ->
                    val isWin = trade.type == TradeType.WIN
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onSelectTrade(trade) },
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("#${trade.tradeNumber}", fontWeight = FontWeight.Bold, color = Color.White)
                                    Box(
                                        modifier = Modifier
                                            .background(if (isWin) Color(0x2210B981) else Color(0x22EF4444), RoundedCornerShape(6.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(if (isWin) "✔ ربح" else "✕ خسارة", fontSize = 10.sp, color = if (isWin) ProfitGreen else LossRed, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Text(Money.formatDateTime(trade.timestamp), fontSize = 10.sp, color = TextMuted)
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (!trade.attachmentPath.isNullOrBlank()) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                                    ) {
                                        CloudAsyncImage(
                                            imageUrl = trade.attachmentPath,
                                            contentDescription = "مرفق",
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop
                                        )
                                    }
                                }
                                Column {
                                    Text("نتيجة الصفقة", fontSize = 10.sp, color = TextMuted)
                                    Text(Money.format(trade.resultCents, true), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (isWin) ProfitGreen else LossRed)
                                }
                                Column {
                                    Text("الرصيد السابق", fontSize = 10.sp, color = TextMuted)
                                    Text(Money.format(trade.oldBalanceCents), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.LightGray)
                                }
                                Column {
                                    Text("الرصيد الجديد", fontSize = 10.sp, color = TextMuted)
                                    Text(Money.format(trade.newBalanceCents), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RowScope.FilterChipItem(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .weight(1f)
            .background(if (selected) AmberAccent else Color(0xFF1E293B), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (selected) Color.Black else TextMuted)
    }
}

@Composable
fun RoadmapContent(
    milestones: List<MilestoneEntity>,
    trades: List<TradeEntity>,
    onSelectMilestone: (MilestoneEntity) -> Unit
) {
    val completed = trades.count { it.type == TradeType.WIN }
    val failed = trades.count { it.type == TradeType.LOSS }
    val remaining = (150 - completed).coerceAtLeast(0)

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("خريطة المحطات", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("جدول المحطات التفاعلي (150 محطة)", fontSize = 12.sp, color = TextMuted)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(10.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("المنجزة", fontSize = 11.sp, color = TextMuted)
                    Text("$completed", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ProfitGreen)
                }
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(CardBg, RoundedCornerShape(12.dp))
                    .border(1.dp, LossRed.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                    .padding(10.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("الفاشلة", fontSize = 11.sp, color = LossRed)
                    Text("$failed", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = LossRed)
                }
            }
            Box(modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(10.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("المتبقية", fontSize = 11.sp, color = TextMuted)
                    Text("$remaining", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = AmberAccent)
                }
            }
            Box(modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(10.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("الإجمالي", fontSize = 11.sp, color = TextMuted)
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("150", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            if (failed > 0) {
                                Text("+$failed", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LossRed)
                            }
                        }
                    }
                }
            }
        }

        // Table Header
        Row(
            modifier = Modifier.fillMaxWidth().background(Color(0xFF1E293B), RoundedCornerShape(8.dp)).padding(vertical = 8.dp, horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("حالة الصفقة", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            Text("الربح", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            Text("رصيد الحساب", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            Text("المحطة", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f)) {
            items(milestones, key = { it.id }) { m ->
                val isWin = m.status == MilestoneStatus.WIN
                val isLoss = m.status == MilestoneStatus.LOSS
                val isPending = m.status == MilestoneStatus.PENDING

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(CardBg, RoundedCornerShape(8.dp))
                        .clickable { onSelectMilestone(m) }
                        .padding(vertical = 10.dp, horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        when {
                            isWin -> Text("✔", color = ProfitGreen, fontWeight = FontWeight.Bold)
                            isLoss -> Text("✕", color = LossRed, fontWeight = FontWeight.Bold)
                            else -> Text("○", color = TextMuted)
                        }
                    }
                    Text(
                        Money.format(m.profitCents, true),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isWin) ProfitGreen else if (isLoss) LossRed else TextMuted,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    Text(
                        Money.format(m.balanceCents),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isPending) TextMuted else Color.White,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "#${m.milestoneNumber}",
                        fontSize = 12.sp,
                        color = TextMuted,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
fun SettingsContent(
    challenge: ChallengeEntity,
    currentUser: AndroidAuthUser,
    onLogout: () -> Unit,
    onSave: (String, Long, Long) -> Unit,
    onResetClick: () -> Unit,
    onNewChallengeClick: () -> Unit
) {
    var nameInput by remember(challenge.userName) { mutableStateOf(challenge.userName) }
    var capitalInput by remember(challenge.initialCapitalCents) { mutableStateOf((challenge.initialCapitalCents / 100L).toString()) }
    var targetInput by remember(challenge.targetBalanceCents) { mutableStateOf((challenge.targetBalanceCents / 100L).toString()) }
    var savedAlert by remember { mutableStateOf(false) }
    var errorAlert by remember { mutableStateOf<String?>(null) }
    var showInstructions by remember { mutableStateOf(false) }

    if (showInstructions) {
        InstructionsContent(onBack = { showInstructions = false })
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("إعدادات الرحلة", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)

        // Active User & Logout Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Sami", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text(
                        "الحساب النشط: ${currentUser.displayName} (#${currentUser.id})",
                        fontSize = 12.sp,
                        color = AmberAccent,
                        fontWeight = FontWeight.Bold
                    )
                }
                OutlinedButton(
                    onClick = onLogout,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = LossRed),
                    border = androidx.compose.foundation.BorderStroke(1.dp, LossRed.copy(alpha = 0.6f))
                ) {
                    Icon(Icons.Default.Logout, contentDescription = "تسجيل الخروج", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("خروج", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("اسم المتداول", fontSize = 12.sp, color = TextMuted)
                OutlinedTextField(
                    value = nameInput,
                    onValueChange = { nameInput = it; savedAlert = false },
                    placeholder = { Text("مثال: Sami") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("رأس المال الابتدائي ($)", fontSize = 12.sp, color = TextMuted)
                OutlinedTextField(
                    value = capitalInput,
                    onValueChange = { capitalInput = it; savedAlert = false; errorAlert = null },
                    enabled = !challenge.challengeStarted,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                if (!challenge.challengeStarted) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        listOf(50, 100, 250, 500, 1000, 5000).forEach { opt ->
                            Surface(
                                color = if (capitalInput == opt.toString()) AmberAccent else Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { capitalInput = opt.toString() }
                            ) {
                                Text(
                                    text = "$$opt",
                                    color = if (capitalInput == opt.toString()) Color.Black else Color.LightGray,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }
                }

                Text("الهدف النهائي ($)", fontSize = 12.sp, color = TextMuted)
                OutlinedTextField(
                    value = targetInput,
                    onValueChange = { targetInput = it; savedAlert = false; errorAlert = null },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                val currentErrorAlert = errorAlert
                if (currentErrorAlert != null) {
                    Text(currentErrorAlert, color = LossRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = {
                        val capRes = Money.parseCapitalToCents(capitalInput)
                        val tarRes = Money.parseCapitalToCents(targetInput)
                        if (capRes.isFailure) {
                            errorAlert = "يرجى إدخال رأس مال أكبر من صفر."
                            return@Button
                        }
                        if (tarRes.isFailure) {
                            errorAlert = "يرجى إدخال هدف أكبر من صفر."
                            return@Button
                        }
                        onSave(nameInput, capRes.getOrThrow(), tarRes.getOrThrow())
                        errorAlert = null
                        savedAlert = true
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("حفظ الإعدادات", color = Color.Black, fontWeight = FontWeight.Bold)
                }

                if (savedAlert) {
                    Text("تم حفظ الإعدادات بنجاح.", color = ProfitGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Text("دليل وقواعد الرحلة", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextMuted)

        Card(
            modifier = Modifier.fillMaxWidth().clickable { showInstructions = true },
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.45f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("📖 التعليمات والإرشادات", fontWeight = FontWeight.Black, color = AmberAccent, fontSize = 15.sp)
                    Text("دليل وقواعد رحلة التداول الكامل وجدول استراتيجية النمو المتراكم (150 صفقة)", fontSize = 11.sp, color = TextMuted)
                }
                Icon(Icons.Default.MenuBook, contentDescription = null, tint = AmberAccent)
            }
        }

        Text("إدارة البيانات والرحلة", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextMuted)

        Card(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onResetClick),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("إعادة الرحلة", fontWeight = FontWeight.Bold, color = LossRed)
                    Text("حذف سجل الصفقات وإعادة جميع المحطات إلى حالتها الأولية", fontSize = 11.sp, color = TextMuted)
                }
                Icon(Icons.Default.Refresh, contentDescription = null, tint = LossRed)
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onNewChallengeClick),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("ابدأ رحلة جديدة", fontWeight = FontWeight.Bold, color = AmberAccent)
                    Text("إنشاء رحلة جديدة برأس مال مختلف وإعادة ضبط الـ 150 محطة", fontSize = 11.sp, color = TextMuted)
                }
                Icon(Icons.Default.AddCircle, contentDescription = null, tint = AmberAccent)
            }
        }
    }
}

@Composable
fun InstructionsContent(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "التعليمات والإرشادات",
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
            OutlinedButton(
                onClick = onBack,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = AmberAccent),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.5f))
            ) {
                Text("رجوع", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Main Banner Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "📌 دليل وقواعد رحلة التداول (استراتيجية 150 صفقة)",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = AmberAccent
                )
                Text(
                    "يرجى قراءة القواعد التالية بعناية والالتزام الكامل بها طوال مراحل الرحلة لضمان حماية الحساب والوصول إلى الهدف النهائي بنجاح.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
            }
        }

        // Rule Card 1
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, LossRed.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "1️⃣ شبكة الأمان وحماية الحساب (هامش الخسارة):",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    "• عند بداية الرحلة، نعتبر مبلغ 50$ من رأس المال بمثابة حاجز أمان / خط أحمر.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
                Text(
                    "• تنبيه مهم: إذا تعرض حساب أي مشترك لخسارة وصلت إلى 50$ في بداية الرحلة، يجب عليه إبلاغ قائد/منظم الرحلة فوراً لمراجعة الصفقات وإيقاف النزيف.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = LossRed
                )
            }
        }

        // Rule Card 2
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "2️⃣ مرحلة الأمان (تجاوز نقطة التعادل وسحب رأس المال):",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    "• المرحلة الذهبية: تكمن الخطوة الأهم والأصعب في الوصول بالحساب إلى ضعف رأس المال (300$)، أي تحقيق أرباح صافية تساوي 150$.",
                    fontSize = 12.sp,
                    color = AmberAccent
                )
                Text(
                    "• الخطوة التالية: بمجرد الوصول إلى هذا الهدف، يقوم جميع المشتركين بسحب مبلغ رأس المال الأساسي (150$) فوراً.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
                Text(
                    "• النتيجة: نكتمل باقي رحلة الـ 150 صفقة باستخدام أرباح السوق فقط (150$)، مما يلغي أي مخاطرة على رأس مالك الشخصي.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = ProfitGreen
                )
            }
        }

        // Rule Card 3
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "3️⃣ آلية التعامل مع الصفقات الخاسرة (نظام الرجوع للخلف):",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    "الهدف هو إتمام 150 صفقة ناجحة. عند ضرب وقف الخسارة في أي صفقة، يتعامل الحساب مع الأمر بمرونة وفق القاعدة التالية:",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
                Text(
                    "• القاعدة: كل صفقة خاسرة تُرجعك خطوة واحدة إلى الخلف في الجدول.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF38BDF8)
                )
                Text(
                    "• مثال توضيحي: إذا أتممت الصفقة رقم 25 بنجاح، ثم فتحت الصفقة رقم 26 وخسرت، يتم احتساب رصيدك الحالي وكأنك في الصفقة رقم 24. الصفقة القادمة التي ستدخلها ستكون لتعويض الخسارة والعودة إلى الصفقة رقم 25، وهكذا حتى نصل جميعاً إلى الصفقة 150 بنجاح.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
            }
        }

        // Strategy Table Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "جدول استراتيجية النمو المتراكم (150 صفقة)",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )

                Text("• رأس المال الابتدائي: $150", fontSize = 12.sp, color = AmberAccent, fontWeight = FontWeight.Bold)
                Text("• الربح الثابت لكل صفقة ادنى شيئ: $20", fontSize = 12.sp, color = ProfitGreen, fontWeight = FontWeight.Bold)
                Text("• إجمالي الأرباح المكتسبة: $3,000", fontSize = 12.sp, color = ProfitGreen, fontWeight = FontWeight.Bold)
                Text("• إجمالي رأس المال النهائي: $3,150", fontSize = 12.sp, color = AmberAccent, fontWeight = FontWeight.Bold)

                Spacer(modifier = Modifier.height(4.dp))

                // Table Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                        .padding(vertical = 8.dp, horizontal = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("رقم الصفقة", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                    Text("رأس المال قبل الصفقة ($)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                    Text("الربح ($)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                    Text("رأس المال بعد الربح ($)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                }

                // 150 Rows
                for (i in 1..150) {
                    val beforeVal = 150 + (i - 1) * 20
                    val profitVal = 20
                    val afterVal = beforeVal + profitVal
                    val beforeStr = String.format(java.util.Locale.US, "%,d", beforeVal)
                    val afterStr = String.format(java.util.Locale.US, "%,d", afterVal)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                if (i == 150) Color(0x33F59E0B)
                                else if (i % 2 == 0) Color(0xFF141B2A)
                                else Color(0xFF0E1420),
                                RoundedCornerShape(6.dp)
                            )
                            .padding(vertical = 7.dp, horizontal = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("$i", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberAccent, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                        Text(beforeStr, fontSize = 11.sp, color = Color.LightGray, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                        Text("$profitVal", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ProfitGreen, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                        Text(afterStr, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                    }
                }

                // Footer Summary
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("إجمالي عدد الصفقات: 150 صفقة", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberAccent)
                    Text("رأس المال النهائي: 3,150$", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ProfitGreen)
                }
            }
        }
    }
}
