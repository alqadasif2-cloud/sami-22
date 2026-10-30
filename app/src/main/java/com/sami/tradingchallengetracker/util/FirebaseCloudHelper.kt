package com.sami.tradingchallengetracker.util

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.util.Log
import androidx.core.content.FileProvider
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageMetadata
import com.sami.tradingchallengetracker.data.ChallengeEntity
import com.sami.tradingchallengetracker.data.TradeEntity
import com.sami.tradingchallengetracker.data.TradeType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * Shared Firebase Cloud Helper for Android App
 * Connects to shared Firestore database (`ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72`)
 * and shared Storage bucket (`majestic-interface-ksmzh.firebasestorage.app`).
 */
object FirebaseCloudHelper {

    private const val TAG = "FirebaseCloudHelper"
    private const val SHARED_FIREBASE_PROJECT_ID = "majestic-interface-ksmzh"
    private const val SHARED_FIREBASE_STORAGE_BUCKET = "majestic-interface-ksmzh.firebasestorage.app"
    private const val SHARED_FIRESTORE_DB_ID = "ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72"
    private const val SHARED_FIREBASE_API_KEY = "AIzaSyCWSCiM0EVatqiBL5wUO8ZAfKcJHqud9dU"
    private const val SHARED_FIREBASE_APP_ID = "1:462035009117:web:ef127abfd25d8ff2ec17b4"
    private const val SHARED_FIREBASE_SENDER_ID = "462035009117"

    private const val SHARED_FIRESTORE_APP_NAME = "sami_shared_firestore"
    const val DEFAULT_REMOTE_SERVER_URL = "https://ais-pre-v2pd4io33vpee4p7cqhqoz-27831794049.europe-west2.run.app"

    // Shared Firestore collections
    const val COLLECTION_NOTIFICATIONS = "community_notifications"
    const val COLLECTION_CHANNELS = "community_channels"
    private const val COLLECTION_USER_CHALLENGES = "user_challenges"
    private const val COLLECTION_MEDIA_FILES = "media_files"

    @Volatile
    private var notificationListenerReg: ListenerRegistration? = null

    @Volatile
    private var listeningForUserId: Int = 0

    private fun buildSharedFirestoreOptions(): FirebaseOptions {
        return FirebaseOptions.Builder()
            .setProjectId(SHARED_FIREBASE_PROJECT_ID)
            .setApplicationId(SHARED_FIREBASE_APP_ID)
            .setApiKey(SHARED_FIREBASE_API_KEY)
            .setGcmSenderId(SHARED_FIREBASE_SENDER_ID)
            .setStorageBucket(SHARED_FIREBASE_STORAGE_BUCKET)
            .build()
    }

    @Synchronized
    fun ensureInitialized(context: Context): Boolean {
        return try {
            val appCtx = context.applicationContext
            if (FirebaseApp.getApps(appCtx).isNotEmpty()) {
                return true
            }
            val defaultApp = FirebaseApp.initializeApp(appCtx)
            if (defaultApp != null) {
                return true
            }
            FirebaseApp.initializeApp(appCtx, buildSharedFirestoreOptions())
            Log.d(TAG, "Initialized FirebaseApp explicitly with shared Sami configuration.")
            true
        } catch (e: Exception) {
            Log.w(TAG, "Firebase initialization check notice: ${e.message}")
            FirebaseApp.getApps(context.applicationContext).isNotEmpty()
        }
    }

    @Synchronized
    private fun getSharedFirestoreApp(context: Context): FirebaseApp {
        ensureInitialized(context)
        val appCtx = context.applicationContext
        val defaultApp = FirebaseApp.getInstance()
        if (defaultApp.options.projectId == SHARED_FIREBASE_PROJECT_ID) {
            return defaultApp
        }
        val existingNamed = FirebaseApp.getApps(appCtx).firstOrNull { it.name == SHARED_FIRESTORE_APP_NAME }
        if (existingNamed != null) {
            return existingNamed
        }
        return FirebaseApp.initializeApp(appCtx, buildSharedFirestoreOptions(), SHARED_FIRESTORE_APP_NAME)
    }

    fun isFirebaseConfigured(context: Context): Boolean {
        return ensureInitialized(context)
    }

    fun getFirestore(context: Context): FirebaseFirestore {
        return try {
            val sharedApp = getSharedFirestoreApp(context)
            FirebaseFirestore.getInstance(sharedApp, SHARED_FIRESTORE_DB_ID)
        } catch (e: Exception) {
            Log.w(TAG, "Named Firestore fallback to default: ${e.message}")
            FirebaseFirestore.getInstance()
        }
    }

    fun getStorage(context: Context): FirebaseStorage {
        return try {
            val sharedApp = getSharedFirestoreApp(context)
            FirebaseStorage.getInstance(sharedApp, "gs://$SHARED_FIREBASE_STORAGE_BUCKET")
        } catch (e: Exception) {
            FirebaseStorage.getInstance()
        }
    }

    /**
     * Creates a FileProvider content Uri in cacheDir for capturing camera photos safely on Android 7+.
     */
    fun createCameraOutputUri(context: Context): Uri {
        val cameraDir = File(context.cacheDir, "camera_captures").apply { mkdirs() }
        val imageFile = File(
            cameraDir,
            "sami_cam_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}.jpg"
        )
        return FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            imageFile
        )
    }

    /**
     * Generates or retrieves a persistent unique device identifier for multi-device FCM support
     */
    fun getStableDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences(SamiFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
        val cached = prefs.getString("stable_device_id", null)
        if (!cached.isNullOrBlank()) return cached

        val androidId = try {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        } catch (_: Exception) {
            null
        }
        val rawGenerated = if (!androidId.isNullOrBlank() && androidId != "9774d56d682e549c") {
            "and_$androidId"
        } else {
            "and_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        }
        val cleanId = rawGenerated.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(64)
        prefs.edit().putString("stable_device_id", cleanId).apply()
        return cleanId
    }

    private fun buildTokenDocId(userId: Int, deviceId: String): String {
        val safeDev = deviceId.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(64).ifEmpty { "android" }
        return "fcm_tok_${userId}_$safeDev"
    }

    private fun postFcmApiSync(
        endpointPath: String,
        userId: Int,
        username: String,
        bodyJson: String
    ) {
        if (userId <= 0 || username.isBlank()) return
        try {
            val sessionJson = org.json.JSONObject()
                .put("id", userId)
                .put("username", username)
                .put("displayName", username)
                .toString()
            val encodedSession = java.net.URLEncoder.encode(sessionJson, "UTF-8")
            val conn = (URL("$DEFAULT_REMOTE_SERVER_URL$endpointPath").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 8_000
                readTimeout = 8_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("X-Sami-Session", encodedSession)
            }
            try {
                conn.outputStream.use { it.write(bodyJson.toByteArray(Charsets.UTF_8)) }
                conn.responseCode
            } finally {
                conn.disconnect()
            }
        } catch (_: Exception) {
            // Firestore registration remains primary shared source of truth
        }
    }

    /**
     * Registers or refreshes the device's FCM token in the authorized shared Firestore
     * collection (`community_notifications/fcm_tok_{userId}_{deviceId}`), unbinding any
     * stale account previously signed in on the same physical device.
     */
    suspend fun syncDeviceFcmToken(
        context: Context,
        token: String,
        userId: Int,
        username: String
    ): Boolean = withContext(Dispatchers.IO) {
        val cleanToken = token.trim()
        if (cleanToken.isEmpty() || userId <= 0) return@withContext false

        // Check local cache to avoid burning Firestore reads on every app launch
        val prefs = context.getSharedPreferences("sami_fcm_sync_cache", Context.MODE_PRIVATE)
        val lastTok = prefs.getString("last_synced_token", null)
        val lastUid = prefs.getInt("last_synced_uid", -1)
        val lastSync = prefs.getLong("last_sync_time", 0L)
        val now = System.currentTimeMillis()
        if (lastTok == cleanToken && lastUid == userId && now - lastSync < 12 * 3600 * 1000L) {
            return@withContext true
        }

        val db = runCatching { getFirestore(context) }.getOrNull() ?: return@withContext false
        val deviceId = getStableDeviceId(context)
        val docId = buildTokenDocId(userId, deviceId)
        val model = "${Build.MANUFACTURER} ${Build.MODEL}".trim()

        val firestoreOk = try {
            try {
                val sameDeviceDocs = db.collection(COLLECTION_NOTIFICATIONS)
                    .whereEqualTo("type", "fcm_device_token")
                    .whereEqualTo("deviceId", deviceId)
                    .limit(5)
                    .get()
                    .await()
                for (doc in sameDeviceDocs.documents) {
                    if (doc.id != docId) {
                        doc.reference.delete().await()
                    }
                }
            } catch (_: Exception) {}

            try {
                val sameTokenDocs = db.collection(COLLECTION_NOTIFICATIONS)
                    .whereEqualTo("type", "fcm_device_token")
                    .whereEqualTo("token", cleanToken)
                    .limit(5)
                    .get()
                    .await()
                for (doc in sameTokenDocs.documents) {
                    if (doc.id != docId) {
                        doc.reference.delete().await()
                    }
                }
            } catch (_: Exception) {}

            val payload = hashMapOf<String, Any>(
                "id" to docId,
                "type" to "fcm_device_token",
                "title" to "fcm_token",
                "body" to "",
                "token" to cleanToken,
                "userId" to userId,
                "senderId" to userId,
                "username" to username,
                "senderName" to username,
                "deviceId" to deviceId,
                "platform" to "android",
                "deviceModel" to model,
                "targetUserIds" to emptyList<Int>(),
                "timestamp" to now,
                "updatedAt" to now,
                "createdAt" to now
            )

            db.collection(COLLECTION_NOTIFICATIONS)
                .document(docId)
                .set(payload, SetOptions.merge())
                .await()

            Log.d(TAG, "Synced FCM token to shared Firestore for user=$userId device=$deviceId")
            true
        } catch (e: Exception) {
            Log.w(TAG, "Failed to sync FCM token to Firestore: ${e.message}")
            false
        }

        val reqBody = org.json.JSONObject()
            .put("token", cleanToken)
            .put("deviceId", deviceId)
            .put("platform", "android")
            .put("deviceModel", model)
            .toString()
        postFcmApiSync("/api/fcm/register", userId, username, reqBody)

        if (firestoreOk) {
            prefs.edit()
                .putString("last_synced_token", cleanToken)
                .putInt("last_synced_uid", userId)
                .putLong("last_sync_time", now)
                .apply()
        }

        firestoreOk
    }

    /**
     * Removes this device's FCM token binding on logout or account switch so private notifications
     * are never delivered after sign-out.
     */
    suspend fun removeDeviceFcmToken(context: Context, userId: Int): Boolean = withContext(Dispatchers.IO) {
        if (userId <= 0) return@withContext false
        context.getSharedPreferences("sami_fcm_sync_cache", Context.MODE_PRIVATE).edit().clear().apply()
        val deviceId = getStableDeviceId(context)
        val prefs = context.getSharedPreferences(SamiFirebaseMessagingService.PREFS_NAME, Context.MODE_PRIVATE)
        val savedTok = prefs.getString(SamiFirebaseMessagingService.KEY_FCM_TOKEN, "") ?: ""
        val savedUser = prefs.getString(SamiFirebaseMessagingService.KEY_CURRENT_USERNAME, "") ?: ""

        if (savedUser.isNotBlank()) {
            val reqBody = org.json.JSONObject()
                .put("deviceId", deviceId)
                .apply { if (savedTok.isNotBlank()) put("token", savedTok) }
                .toString()
            postFcmApiSync("/api/fcm/unregister", userId, savedUser, reqBody)
        }

        val db = runCatching { getFirestore(context) }.getOrNull() ?: return@withContext false
        val docId = buildTokenDocId(userId, deviceId)
        try {
            db.collection(COLLECTION_NOTIFICATIONS)
                .document(docId)
                .delete()
                .await()
            Log.d(TAG, "Removed FCM token doc $docId on logout")
            true
        } catch (e: Exception) {
            Log.w(TAG, "Notice removing FCM token doc: ${e.message}")
            false
        }
    }

    /**
     * Real-time authorized push notification listener on `community_notifications`.
     * Delivers OS notifications when the app is in background or viewing another screen,
     * strictly filtered by recipient userId and deduplicated atomically with FCM by messageId.
     */
    @Synchronized
    fun startNotificationPushListener(context: Context, userId: Int) {
        if (userId <= 0) {
            stopNotificationPushListener()
            return
        }
        if (listeningForUserId == userId && notificationListenerReg != null) {
            return
        }
        stopNotificationPushListener()

        val appCtx = context.applicationContext
        val db = runCatching { getFirestore(appCtx) }.getOrNull() ?: return
        val listenerStartMs = System.currentTimeMillis() - 4_000L
        listeningForUserId = userId

        try {
            notificationListenerReg = db.collection(COLLECTION_NOTIFICATIONS)
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .limit(20)
                .addSnapshotListener { snapshot, error ->
                    if (error != null || snapshot == null) return@addSnapshotListener
                    val activeUid = SamiFirebaseMessagingService.getCurrentUserId(appCtx)
                    if (activeUid <= 0 || activeUid != userId) return@addSnapshotListener

                    for (change in snapshot.documentChanges) {
                        if (change.type != DocumentChange.Type.ADDED) continue
                        val data = change.document.data
                        val type = (data["type"] as? String) ?: ""
                        if (type == "fcm_device_token") continue

                        val ts = (data["timestamp"] as? Number)?.toLong() ?: 0L
                        if (ts < listenerStartMs) continue

                        val senderId = (data["senderId"] as? Number)?.toInt() ?: 0
                        if (senderId == activeUid) continue

                        val rawTargets = data["targetUserIds"] as? List<*>
                        val targetIds = rawTargets?.mapNotNull { (it as? Number)?.toInt() } ?: emptyList()
                        if (!targetIds.contains(activeUid)) continue

                        val chatType = if (
                            (data["chatType"] as? String) == "private" || type == "private_message"
                        ) "private" else "channel"

                        val title = (data["title"] as? String)?.ifBlank { "رسالة جديدة - Sami" }
                            ?: "رسالة جديدة - Sami"
                        val body = (data["body"] as? String)?.ifBlank { "لديك رسالة جديدة" }
                            ?: "لديك رسالة جديدة"
                        val channelId = (data["channelId"] as? String) ?: ""
                        val partnerId = ((data["partnerId"] as? Number)
                            ?: (data["privateChatWithUserId"] as? Number))?.toInt()
                            ?: if (chatType == "private") senderId else null
                        val messageId = (data["messageId"] as? String)?.ifBlank { null }
                            ?: (data["id"] as? String)
                            ?: change.document.id
                        val senderName = (data["senderName"] as? String) ?: "Sami"

                        SamiFirebaseMessagingService.postAuthorizedSystemNotification(
                            context = appCtx,
                            title = title,
                            body = body,
                            chatType = chatType,
                            channelId = channelId,
                            partnerId = partnerId,
                            messageId = messageId,
                            senderId = senderId,
                            senderName = senderName,
                            targetRecipientId = activeUid
                        )
                    }
                }
        } catch (e: Exception) {
            Log.w(TAG, "Failed starting notification push listener: ${e.message}")
        }
    }

    @Synchronized
    fun stopNotificationPushListener() {
        try {
            notificationListenerReg?.remove()
        } catch (_: Exception) {}
        notificationListenerReg = null
        listeningForUserId = 0
    }

    /**
     * Uploads a compressed image Uri to Firebase Cloud Storage (falling back to shared Firestore
     * `media_files` if Storage bucket is unavailable) and returns Pair(downloadUrl, storagePath).
     */
    suspend fun uploadImageToCloud(
        context: Context,
        imageUri: Uri,
        folder: String = "chat_images",
        userId: Int = 0
    ): Pair<String, String> = withContext(Dispatchers.IO) {
        val bytes = compressUriToJpeg(context, imageUri, 1280, 80)
            ?: throw IllegalStateException("تعذر قراءة الصورة المختارة أو معالجتها.")
        val fileId = "${folder}_${userId}_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}"
        val storagePath = "$folder/$fileId.jpg"

        val storageResult = runCatching {
            val storage = getStorage(context)
            val storageRef = storage.reference.child(storagePath)
            val metadata = StorageMetadata.Builder()
                .setContentType("image/jpeg")
                .setCustomMetadata("uploaderId", userId.toString())
                .build()
            storageRef.putBytes(bytes, metadata).await()
            val downloadUrl = storageRef.downloadUrl.await().toString()
            Pair(downloadUrl, storagePath)
        }.getOrNull()

        if (storageResult != null) {
            return@withContext storageResult
        }

        // Resilient fallback to shared Firestore `media_files` when Storage bucket is not provisioned
        val compactBytes = if (bytes.size > 480_000) {
            compressUriToJpeg(context, imageUri, 960, 72) ?: bytes
        } else {
            bytes
        }
        val base64Data = Base64.encodeToString(compactBytes, Base64.NO_WRAP)
        val dataUrl = "data:image/jpeg;base64,$base64Data"
        val docId = "img_${System.currentTimeMillis()}_${userId}_${UUID.randomUUID().toString().take(5)}"
        try {
            val db = getFirestore(context)
            val docPayload = hashMapOf<String, Any>(
                "id" to docId,
                "folder" to folder,
                "userId" to userId,
                "mimeType" to "image/jpeg",
                "size" to compactBytes.size,
                "dataUrl" to dataUrl,
                "createdAt" to System.currentTimeMillis()
            )
            db.collection(COLLECTION_MEDIA_FILES).document(docId).set(docPayload).await()
        } catch (e: Exception) {
            Log.w(TAG, "Firestore media_files backup notice: ${e.message}")
        }
        Pair(dataUrl, "firestore_media/$docId")
    }

    /**
     * Convenience wrapper returning nullable Pair for callers expecting nullable upload result.
     */
    suspend fun uploadChatImage(
        context: Context,
        imageUri: Uri,
        userId: Int,
        folder: String = "chat_images"
    ): Pair<String, String>? {
        return runCatching { uploadImageToCloud(context, imageUri, folder, userId) }.getOrNull()
    }

    suspend fun deleteStoragePath(context: Context, storagePath: String?) {
        if (storagePath.isNullOrBlank()) return
        if (storagePath.startsWith("firestore_media/")) {
            val docId = storagePath.removePrefix("firestore_media/").trim()
            if (docId.isNotEmpty()) {
                runCatching {
                    getFirestore(context).collection(COLLECTION_MEDIA_FILES).document(docId).delete().await()
                }
            }
            return
        }
        val storage = runCatching { getStorage(context) }.getOrNull() ?: return
        try {
            if (storagePath.startsWith("http://") || storagePath.startsWith("https://") || storagePath.startsWith("gs://")) {
                storage.getReferenceFromUrl(storagePath).delete().await()
            } else {
                storage.reference.child(storagePath).delete().await()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error deleting file at $storagePath: ${e.message}")
        }
    }

    /**
     * Deletes multiple cloud image paths or download URLs safely without throwing on missing files.
     */
    suspend fun deleteMultipleCloudImages(context: Context, pathsOrUrls: List<String?>) {
        for (item in pathsOrUrls) {
            if (item.isNullOrBlank() || item.startsWith("data:")) continue
            deleteStoragePath(context, item)
        }
    }

    /**
     * Downloads or decodes an image URL (`https://`, `data:image/...`, `content://`, or `firestore_media/...`)
     * and saves it into the device Gallery (`Pictures/Sami`) via MediaStore.
     */
    suspend fun saveImageToGallery(context: Context, imageUrl: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val cleanUrl = imageUrl.trim()
            if (cleanUrl.isEmpty()) {
                return@withContext Result.failure(IllegalArgumentException("رابط الصورة غير صالح."))
            }

            val rawBytes: ByteArray = when {
                cleanUrl.startsWith("data:") -> {
                    val commaIdx = cleanUrl.indexOf(',')
                    if (commaIdx <= 0) throw IllegalArgumentException("بيانات الصورة غير صالحة.")
                    Base64.decode(cleanUrl.substring(commaIdx + 1), Base64.DEFAULT)
                }
                cleanUrl.startsWith("firestore_media/") -> {
                    val docId = cleanUrl.removePrefix("firestore_media/").trim()
                    val snap = getFirestore(context).collection(COLLECTION_MEDIA_FILES).document(docId).get().await()
                    val dUrl = snap.getString("dataUrl") ?: throw IllegalStateException("تعذر العثور على الصورة السحابية.")
                    val commaIdx = dUrl.indexOf(',')
                    if (commaIdx <= 0) throw IllegalStateException("بيانات الصورة السحابية غير مكتملة.")
                    Base64.decode(dUrl.substring(commaIdx + 1), Base64.DEFAULT)
                }
                cleanUrl.startsWith("content://") || cleanUrl.startsWith("file://") -> {
                    context.contentResolver.openInputStream(Uri.parse(cleanUrl))?.use { it.readBytes() }
                        ?: throw IllegalStateException("تعذر فتح ملف الصورة المحلي.")
                }
                else -> {
                    val conn = (URL(cleanUrl).openConnection() as HttpURLConnection).apply {
                        connectTimeout = 15_000
                        readTimeout = 20_000
                        instanceFollowRedirects = true
                    }
                    try {
                        conn.inputStream.use { it.readBytes() }
                    } finally {
                        conn.disconnect()
                    }
                }
            }

            val bitmap = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
                ?: return@withContext Result.failure(IllegalStateException("تعذر فك تشفير الصورة لحفظها."))

            val fileName = "Sami_${System.currentTimeMillis()}.jpg"
            val resolver = context.contentResolver
            val contentValues = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Sami")
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
            }

            val targetUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                ?: return@withContext Result.failure(IllegalStateException("تعذر إنشاء ملف الصورة في المعرض."))

            resolver.openOutputStream(targetUri)?.use { outStream ->
                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 95, outStream)) {
                    throw IllegalStateException("فشل حفظ بيانات الصورة.")
                }
            } ?: throw IllegalStateException("تعذر الكتابة إلى المعرض.")

            bitmap.recycle()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val finishValues = ContentValues().apply {
                    put(MediaStore.Images.Media.IS_PENDING, 0)
                }
                resolver.update(targetUri, finishValues, null, null)
            }

            Result.success("تم حفظ الصورة في المعرض بنجاح")
        } catch (e: Exception) {
            Log.e(TAG, "saveImageToGallery failed", e)
            Result.failure(Exception("تعذر حفظ الصورة في المعرض"))
        }
    }

    /**
     * Fetches the user's trading challenge and trade history from shared Firestore (`user_challenges/{userId}`).
     */
    suspend fun fetchUserChallengeFromFirestore(
        context: Context,
        userId: Int
    ): Pair<ChallengeEntity, List<TradeEntity>>? = withContext(Dispatchers.IO) {
        if (userId <= 0) return@withContext null
        try {
            val db = getFirestore(context)
            val doc = db.collection(COLLECTION_USER_CHALLENGES)
                .document(userId.toString())
                .get()
                .await()

            if (!doc.exists()) return@withContext null
            val chMap = doc.get("challenge") as? Map<*, *> ?: return@withContext null
            val now = System.currentTimeMillis()
            val challengeId = (chMap["id"] as? String)?.takeIf { it.isNotBlank() }
                ?: "challenge_u${userId}_$now"
            val userName = (chMap["userName"] as? String)
                ?: doc.getString("username")
                ?: ""
            val initialCapitalCents = (chMap["initialCapitalCents"] as? Number)?.toLong() ?: 10_000L
            val currentBalanceCents = (chMap["currentBalanceCents"] as? Number)?.toLong() ?: initialCapitalCents
            val targetBalanceCents = (chMap["targetBalanceCents"] as? Number)?.toLong() ?: 300_000L
            val tradeCount = (chMap["tradeCount"] as? Number)?.toInt() ?: 0
            val challengeStarted = (chMap["challengeStarted"] as? Boolean) ?: false
            val createdAt = (chMap["createdAt"] as? Number)?.toLong() ?: now
            val updatedAt = (chMap["updatedAt"] as? Number)?.toLong()
                ?: (doc.getLong("updatedAt") ?: now)

            val challenge = ChallengeEntity(
                id = challengeId,
                userId = userId,
                userName = userName,
                initialCapitalCents = initialCapitalCents,
                currentBalanceCents = currentBalanceCents,
                targetBalanceCents = targetBalanceCents,
                tradeCount = tradeCount,
                challengeStarted = challengeStarted,
                createdAt = createdAt,
                updatedAt = updatedAt
            )

            val rawTrades = doc.get("trades") as? List<*> ?: emptyList<Any>()
            val parsedTrades = mutableListOf<TradeEntity>()
            for (item in rawTrades) {
                val tMap = item as? Map<*, *> ?: continue
                val tNum = (tMap["tradeNumber"] as? Number)?.toInt() ?: continue
                val resCents = (tMap["resultCents"] as? Number)?.toLong() ?: 0L
                val oldBal = (tMap["oldBalanceCents"] as? Number)?.toLong() ?: initialCapitalCents
                val newBal = (tMap["newBalanceCents"] as? Number)?.toLong() ?: (oldBal + resCents)
                val typeStr = (tMap["type"] as? String)?.uppercase()
                    ?: if (resCents >= 0L) "WIN" else "LOSS"
                val tradeType = if (typeStr == "LOSS") TradeType.LOSS else TradeType.WIN
                val attPath = (tMap["attachmentPath"] as? String)?.takeIf { it.isNotBlank() }
                val ts = (tMap["timestamp"] as? Number)?.toLong() ?: now
                val tId = (tMap["id"] as? String)?.takeIf { it.isNotBlank() }
                    ?: UUID.randomUUID().toString()

                parsedTrades.add(
                    TradeEntity(
                        id = tId,
                        challengeId = challengeId,
                        tradeNumber = tNum,
                        resultCents = resCents,
                        oldBalanceCents = oldBal,
                        newBalanceCents = newBal,
                        type = tradeType,
                        attachmentPath = attPath,
                        timestamp = ts
                    )
                )
            }
            parsedTrades.sortBy { it.tradeNumber }
            Pair(challenge, parsedTrades)
        } catch (e: Exception) {
            Log.w(TAG, "fetchUserChallengeFromFirestore failed: ${e.message}")
            null
        }
    }

    /**
     * Syncs the user's trading challenge, trades, and milestones to shared Firestore (`user_challenges/{userId}`)
     * using the exact schema shared with the Web app.
     */
    suspend fun syncUserChallengeToFirestore(
        context: Context,
        userId: Int,
        challenge: ChallengeEntity,
        trades: List<TradeEntity>
    ) {
        if (userId <= 0) return
        withContext(Dispatchers.IO) {
            try {
                val db = getFirestore(context)
                val sortedTrades = trades.sortedBy { it.tradeNumber }
                val completedCount = sortedTrades.count { it.type == TradeType.WIN }
                val failedCount = sortedTrades.count { it.type == TradeType.LOSS }
                val remainingCount = (150 - completedCount).coerceAtLeast(0)
                val totalMilestones = 150 + failedCount
                val updatedAt = if (challenge.updatedAt > 0L) challenge.updatedAt else System.currentTimeMillis()

                val tradeMaps = sortedTrades.map { t ->
                    val safeAttachment = t.attachmentPath?.takeIf { !it.startsWith("data:") }
                    hashMapOf<String, Any?>(
                        "id" to t.id,
                        "challengeId" to challenge.id,
                        "tradeNumber" to t.tradeNumber,
                        "resultCents" to t.resultCents,
                        "oldBalanceCents" to t.oldBalanceCents,
                        "newBalanceCents" to t.newBalanceCents,
                        "type" to t.type.name,
                        "attachmentPath" to safeAttachment,
                        "timestamp" to t.timestamp
                    )
                }

                val milestoneMaps = (1..totalMilestones).map { num ->
                    val t = sortedTrades.find { it.tradeNumber == num }
                    val safeAttachment = t?.attachmentPath?.takeIf { !it.startsWith("data:") }
                    hashMapOf<String, Any?>(
                        "id" to "${challenge.id}_milestone_$num",
                        "challengeId" to challenge.id,
                        "milestoneNumber" to num,
                        "profitCents" to t?.resultCents,
                        "balanceCents" to t?.newBalanceCents,
                        "status" to (t?.type?.name ?: "PENDING"),
                        "tradeId" to t?.id,
                        "timestamp" to t?.timestamp,
                        "attachmentPath" to safeAttachment
                    )
                }

                val challengeMap = hashMapOf<String, Any>(
                    "id" to challenge.id,
                    "userId" to userId,
                    "userName" to challenge.userName,
                    "initialCapitalCents" to challenge.initialCapitalCents,
                    "currentBalanceCents" to challenge.currentBalanceCents,
                    "targetBalanceCents" to challenge.targetBalanceCents,
                    "tradeCount" to challenge.tradeCount,
                    "challengeStarted" to challenge.challengeStarted,
                    "createdAt" to challenge.createdAt,
                    "updatedAt" to updatedAt
                )

                val settingsMap = hashMapOf<String, Any>(
                    "userName" to challenge.userName,
                    "initialCapitalCents" to challenge.initialCapitalCents,
                    "targetBalanceCents" to challenge.targetBalanceCents
                )

                val docPayload = hashMapOf<String, Any>(
                    "userId" to userId,
                    "username" to challenge.userName,
                    "challenge" to challengeMap,
                    "completedCount" to completedCount,
                    "remainingCount" to remainingCount,
                    "failedCount" to failedCount,
                    "trades" to tradeMaps,
                    "milestones" to milestoneMaps,
                    "settings" to settingsMap,
                    "updatedAt" to updatedAt
                )

                db.collection(COLLECTION_USER_CHALLENGES)
                    .document(userId.toString())
                    .set(docPayload)
                    .await()
            } catch (e: Exception) {
                Log.w(TAG, "syncUserChallengeToFirestore failed: ${e.message}")
            }
        }
    }

    private fun compressUriToJpeg(
        context: Context,
        uri: Uri,
        maxDimension: Int,
        quality: Int
    ): ByteArray? {
        return try {
            val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, boundsOptions)
            }
            var inSampleSize = 1
            val rawW = boundsOptions.outWidth
            val rawH = boundsOptions.outHeight
            if (rawW > maxDimension || rawH > maxDimension) {
                val halfW = rawW / 2
                val halfH = rawH / 2
                while ((halfW / inSampleSize) >= maxDimension || (halfH / inSampleSize) >= maxDimension) {
                    inSampleSize *= 2
                }
            }

            val decodeOptions = BitmapFactory.Options().apply { this.inSampleSize = inSampleSize }
            val decoded = context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, decodeOptions)
            } ?: return null

            val scaled = scaleDownBitmap(decoded, maxDimension)
            val baos = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, quality, baos)
            if (scaled != decoded) scaled.recycle()
            decoded.recycle()
            baos.toByteArray()
        } catch (e: Exception) {
            Log.e(TAG, "Image compression failed", e)
            null
        }
    }

    private fun scaleDownBitmap(src: Bitmap, maxDim: Int): Bitmap {
        val w = src.width
        val h = src.height
        if (w <= maxDim && h <= maxDim) return src
        val ratio = w.toFloat() / h.toFloat()
        val (targetW, targetH) = if (w > h) {
            maxDim to (maxDim / ratio).toInt().coerceAtLeast(1)
        } else {
            (maxDim * ratio).toInt().coerceAtLeast(1) to maxDim
        }
        return Bitmap.createScaledBitmap(src, targetW, targetH, true)
    }
}
