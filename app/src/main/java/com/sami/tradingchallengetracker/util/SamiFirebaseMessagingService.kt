package com.sami.tradingchallengetracker.util

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.sami.tradingchallengetracker.MainActivity
import com.sami.tradingchallengetracker.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SamiFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        const val PREFS_NAME = "sami_fcm_prefs"
        const val KEY_FCM_TOKEN = "key_fcm_token"
        const val KEY_CURRENT_USER_ID = "key_current_user_id"
        const val KEY_CURRENT_USERNAME = "key_current_username"
        const val KEY_HAS_PROMPTED_NOTIF_PERM = "key_has_prompted_post_notifications"
        private const val KEY_RECENT_MSG_IDS = "key_recent_notified_msg_ids"

        const val CHANNEL_ID_PUBLIC = "sami_channel_messages_v2"
        const val CHANNEL_ID_PRIVATE = "sami_private_messages_v2"
        private const val LEGACY_CHANNEL_ID_PUBLIC = "sami_channel_messages"
        private const val LEGACY_CHANNEL_ID_PRIVATE = "sami_private_messages"

        @Volatile
        var isAppInForeground: Boolean = false

        @Volatile
        private var activeChatType: String? = null

        @Volatile
        private var activeChannelId: String? = null

        @Volatile
        private var activePartnerId: Int? = null

        fun setForegroundState(inForeground: Boolean) {
            isAppInForeground = inForeground
        }

        fun setActiveConversation(chatType: String?, channelId: String?, partnerId: Int?) {
            activeChatType = chatType?.trim()?.ifEmpty { null }
            activeChannelId = channelId?.trim()?.ifEmpty { null }
            activePartnerId = if (partnerId != null && partnerId > 0) partnerId else null
        }

        fun isViewingExactConversation(chatType: String, channelId: String, partnerId: Int?): Boolean {
            if (!isAppInForeground) return false
            val curType = activeChatType ?: return false
            if (curType != chatType) return false
            return if (chatType == "private") {
                partnerId != null && partnerId > 0 && activePartnerId == partnerId
            } else {
                channelId.isNotBlank() && activeChannelId == channelId
            }
        }

        fun createNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                    ?: return

                fun buildPub(id: String) = NotificationChannel(
                    id,
                    "رسائل القنوات والتوصيات",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "إشعارات الرسائل الجديدة والتوصيات في قنوات Sami"
                    enableLights(true)
                    lightColor = Color.rgb(245, 158, 11)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 150, 250)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                }

                fun buildPriv(id: String) = NotificationChannel(
                    id,
                    "المحادثات الخاصة وإشعارات المشرف",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "إشعارات الرسائل الخاصة والمحادثات المباشرة مع القائد Sami والمشرفين"
                    enableLights(true)
                    lightColor = Color.rgb(234, 179, 8)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 300, 200, 300)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
                }

                notificationManager.createNotificationChannel(buildPub(CHANNEL_ID_PUBLIC))
                notificationManager.createNotificationChannel(buildPriv(CHANNEL_ID_PRIVATE))
                notificationManager.createNotificationChannel(buildPub(LEGACY_CHANNEL_ID_PUBLIC))
                notificationManager.createNotificationChannel(buildPriv(LEGACY_CHANNEL_ID_PRIVATE))
            }
        }

        fun getSavedToken(context: Context): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_FCM_TOKEN, null)
        }

        fun saveCurrentSession(context: Context, userId: Int, username: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putInt(KEY_CURRENT_USER_ID, userId)
                .putString(KEY_CURRENT_USERNAME, username)
                .apply()
            if (userId > 0) {
                FirebaseCloudHelper.startNotificationPushListener(context.applicationContext, userId)
            }
        }

        fun clearCurrentSession(context: Context) {
            FirebaseCloudHelper.stopNotificationPushListener()
            setActiveConversation(null, null, null)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .remove(KEY_CURRENT_USER_ID)
                .remove(KEY_CURRENT_USERNAME)
                .apply()
        }

        fun getCurrentUserId(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getInt(KEY_CURRENT_USER_ID, 0)
        }

        @Synchronized
        fun isDuplicateAndRecord(context: Context, dedupKey: String): Boolean {
            if (dedupKey.isBlank()) return false
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString(KEY_RECENT_MSG_IDS, "") ?: ""
            val list = raw.split("|").filter { it.isNotBlank() }.toMutableList()
            if (list.contains(dedupKey)) {
                return true
            }
            list.add(dedupKey)
            while (list.size > 100) {
                list.removeAt(0)
            }
            prefs.edit().putString(KEY_RECENT_MSG_IDS, list.joinToString("|")).apply()
            return false
        }

        private fun isAlreadyActiveInSystemTray(context: Context, tag: String): Boolean {
            if (tag.isBlank()) return false
            return try {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                nm?.activeNotifications?.any { it.tag == tag } == true
            } catch (_: Exception) {
                false
            }
        }

        fun postAuthorizedSystemNotification(
            context: Context,
            title: String,
            body: String,
            chatType: String,
            channelId: String,
            partnerId: Int?,
            messageId: String,
            senderId: Int?,
            senderName: String,
            targetRecipientId: Int? = null
        ) {
            val appCtx = context.applicationContext
            val currentUserId = getCurrentUserId(appCtx)

            // Require an active logged-in session so logged-out devices never display private/channel pushes
            if (currentUserId <= 0) return

            // Never notify sender about their own sent message
            if (senderId != null && senderId > 0 && senderId == currentUserId) return

            // Enforce strict recipient binding when specified
            if (targetRecipientId != null && targetRecipientId > 0 && targetRecipientId != currentUserId) {
                return
            }

            // Suppress duplicate noisy OS alert when the exact target conversation is already open in foreground
            if (isViewingExactConversation(chatType, channelId, partnerId)) {
                return
            }

            val normTag = messageId.trim().take(64)

            // Deduplicate across FCM system tray + onMessageReceived + background Firestore listener
            val dedupKey = if (normTag.isNotBlank()) {
                "u${currentUserId}_$normTag"
            } else {
                "u${currentUserId}_${chatType}_${channelId}_${partnerId ?: 0}_${title.hashCode()}_${body.hashCode()}"
            }
            if (isDuplicateAndRecord(appCtx, dedupKey)) {
                return
            }
            if (normTag.isNotBlank() && isAlreadyActiveInSystemTray(appCtx, normTag)) {
                return
            }

            createNotificationChannels(appCtx)

            if (Build.VERSION.SDK_INT >= 33) {
                if (ContextCompat.checkSelfPermission(
                        appCtx,
                        Manifest.permission.POST_NOTIFICATIONS
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    return
                }
            }

            val channelIdNotification = if (chatType == "private") CHANNEL_ID_PRIVATE else CHANNEL_ID_PUBLIC
            // Match FCM system-tray (tag, 0) slot when messageId is present so OS coalesces instead of duplicating
            val notificationId = if (normTag.isNotEmpty()) {
                0
            } else {
                (System.currentTimeMillis() % 100000).toInt()
            }
            val requestCode = if (normTag.isNotEmpty()) normTag.hashCode() else notificationId

            val intent = Intent(appCtx, MainActivity::class.java).apply {
                action = "OPEN_SAMI_CHAT"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("fromNotification", true)
                putExtra("chatType", chatType)
                putExtra("recipientUserId", currentUserId.toString())
                if (channelId.isNotEmpty()) putExtra("channelId", channelId)
                if (partnerId != null && partnerId > 0) {
                    putExtra("partnerId", partnerId)
                    putExtra("partnerIdStr", partnerId.toString())
                }
                if (messageId.isNotEmpty()) putExtra("messageId", messageId)
                if (senderName.isNotEmpty()) putExtra("senderName", senderName)
            }

            val pendingIntent = PendingIntent.getActivity(
                appCtx,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val publicLockscreenNotification = if (chatType == "private") {
                NotificationCompat.Builder(appCtx, channelIdNotification)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("Sami")
                    .setContentText("لديك رسالة خاصة جديدة")
                    .setColor(0xFFF59E0B.toInt())
                    .build()
            } else null

            val builder = NotificationCompat.Builder(appCtx, channelIdNotification)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setSound(defaultSound)
                .setColor(0xFFF59E0B.toInt())
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(
                    if (chatType == "private") NotificationCompat.VISIBILITY_PRIVATE
                    else NotificationCompat.VISIBILITY_PUBLIC
                )
                .setContentIntent(pendingIntent)

            if (publicLockscreenNotification != null) {
                builder.setPublicVersion(publicLockscreenNotification)
            }

            try {
                val notificationManager = NotificationManagerCompat.from(appCtx)
                if (notificationManager.areNotificationsEnabled()) {
                    notificationManager.notify(
                        normTag.ifEmpty { "sami_notif_$notificationId" },
                        notificationId,
                        builder.build()
                    )
                }
            } catch (_: SecurityException) {
                // Permission revoked at OS level
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val cleanToken = token.trim()
        if (cleanToken.isEmpty()) return

        FirebaseCloudHelper.ensureInitialized(applicationContext)

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_FCM_TOKEN, cleanToken).apply()

        val userId = getCurrentUserId(this)
        if (userId > 0) {
            val username = prefs.getString(KEY_CURRENT_USERNAME, "") ?: ""
            CoroutineScope(Dispatchers.IO).launch {
                FirebaseCloudHelper.syncDeviceFcmToken(
                    context = applicationContext,
                    token = cleanToken,
                    userId = userId,
                    username = username
                )
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // Ensure Firebase & channels work independently even when MainActivity/WebView is completely closed
        FirebaseCloudHelper.ensureInitialized(applicationContext)

        val data = remoteMessage.data
        val notification = remoteMessage.notification

        val title = data["title"]?.takeIf { it.isNotBlank() }
            ?: notification?.title?.takeIf { it.isNotBlank() }
            ?: "رسالة جديدة - Sami"
        val body = data["body"]?.takeIf { it.isNotBlank() }
            ?: notification?.body?.takeIf { it.isNotBlank() }
            ?: "لديك إشعار جديد في تطبيق Sami"
        val chatType = data["chatType"]?.takeIf { it.isNotBlank() }
            ?: if (!data["partnerId"].isNullOrBlank() || data["type"] == "private_message") "private" else "channel"
        val channelId = data["channelId"] ?: ""
        val senderId = data["senderId"]?.toIntOrNull()
        val partnerId = data["partnerId"]?.toIntOrNull()
            ?: data["partnerIdStr"]?.toIntOrNull()
            ?: data["privateChatWithUserId"]?.toIntOrNull()
            ?: if (chatType == "private") senderId else null
        val messageId = data["messageId"]?.takeIf { it.isNotBlank() }
            ?: notification?.tag?.takeIf { it.isNotBlank() }
            ?: remoteMessage.messageId
            ?: ""
        val senderName = data["senderName"] ?: ""
        val targetRecipientId = data["recipientUserId"]?.toIntOrNull()
            ?: data["recipientId"]?.toIntOrNull()

        postAuthorizedSystemNotification(
            context = applicationContext,
            title = title,
            body = body,
            chatType = chatType,
            channelId = channelId,
            partnerId = partnerId,
            messageId = messageId,
            senderId = senderId,
            senderName = senderName,
            targetRecipientId = targetRecipientId
        )
    }
}
