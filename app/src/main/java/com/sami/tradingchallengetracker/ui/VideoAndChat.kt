package com.sami.tradingchallengetracker.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.google.firebase.firestore.Query
import com.sami.tradingchallengetracker.R
import com.sami.tradingchallengetracker.util.CloudAsyncImage
import com.sami.tradingchallengetracker.util.FirebaseCloudHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

data class AndroidAuthUser(
    val id: Int,
    val username: String,
    val displayName: String,
    val password: String
)

val AUTHORIZED_ANDROID_USERS = listOf(
    AndroidAuthUser(1, "Sami", "Sami", "12345678"),
    AndroidAuthUser(2, "Hani Alqadasi", "Hani Alqadasi", "Hani33334"),
    AndroidAuthUser(3, "Eslam Alqadasi", "Eslam Alqadasi", "55555555"),
    AndroidAuthUser(4, "Omar Ali", "Omar Ali", "Omar1234"),
    AndroidAuthUser(5, "Ahmed Saleh", "Ahmed Saleh", "Ahmed123"),
    AndroidAuthUser(6, "Mohammed Ali", "Mohammed Ali", "Mo2025"),
    AndroidAuthUser(7, "Khaled Nasser", "Khaled Nasser", "Khaled22"),
    AndroidAuthUser(8, "Yasser Ahmed", "Yasser Ahmed", "Yasser11"),
    AndroidAuthUser(9, "Ali Hassan", "Ali Hassan", "Ali2025"),
    AndroidAuthUser(10, "Abdullah Sami", "Abdullah Sami", "Abd12345"),
    AndroidAuthUser(11, "Faisal Omar", "Faisal Omar", "Faisal88"),
    AndroidAuthUser(12, "Mahmoud Adel", "Mahmoud Adel", "Mahmoud7"),
    AndroidAuthUser(13, "Tareq Salem", "Tareq Salem", "Tareq123"),
    AndroidAuthUser(14, "Zaid Ahmed", "Zaid Ahmed", "Zaid2025"),
    AndroidAuthUser(15, "Noor Ali", "Noor Ali", "Noor1234"),
    AndroidAuthUser(16, "Amjad Sami", "Amjad Sami", "Amjad555"),
    AndroidAuthUser(17, "Saleh Omar", "Saleh Omar", "Saleh2025"),
    AndroidAuthUser(18, "Nasser Ali", "Nasser Ali", "Nasser99"),
    AndroidAuthUser(19, "Tariq90", "Tariq90", "Tariq4141"),
    AndroidAuthUser(20, "Yazan Sami", "Yazan Sami", "Yazan2025")
)

/**
 * Fullscreen Background Image for Login and Home (Dashboard) Screens:
 * - Uses R.drawable.background_image
 * - Fullscreen Center Crop (ContentScale.Crop) across all screen sizes
 * - 60-70% Transparent dark overlay for high text contrast
 * - Lightweight & fast with zero video decoding overhead
 */
@Composable
fun LoopingBackgroundVideo(
    modifier: Modifier = Modifier,
    rawResId: Int = R.drawable.background_image,
    overlayAlpha: Float = 0.65f
) {
    Box(modifier = modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.background_image),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // 60-70% Black Transparent Overlay for clear text legibility
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = overlayAlpha))
        )
    }
}

/**
 * Android Offline Login Screen
 */
@Composable
fun AndroidLoginScreen(
    onLoginSuccess: (AndroidAuthUser) -> Unit
) {
    val context = LocalContext.current
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        // Fullscreen Background Image with 70% dark overlay
        LoopingBackgroundVideo(rawResId = R.drawable.background_image, overlayAlpha = 0.70f)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xEA0D131F)),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD4AF37).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Sami",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFFD700)
                    )
                    Text(
                        text = "تسجيل الدخول",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(top = 4.dp, bottom = 20.dp)
                    )

                    errorMessage?.let { msg ->
                        Surface(
                            color = Color(0x33EF4444),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp)
                        ) {
                            Text(
                                text = msg,
                                color = Color(0xFFFCA5A5),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = username,
                        onValueChange = {
                            username = it
                            errorMessage = null
                        },
                        label = { Text("اسم المستخدم (Username)") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFFFFD700)) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFFFD700),
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            errorMessage = null
                        },
                        label = { Text("كلمة المرور (Password)") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFFFFD700)) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Color.Gray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFFFD700),
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            val trimmedUser = username.trim()
                            val trimmedPass = password.trim()
                            val matched = AUTHORIZED_ANDROID_USERS.find {
                                it.username.equals(trimmedUser, ignoreCase = true) && it.password == trimmedPass
                            }
                            if (matched != null) {
                                val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                                prefs.edit()
                                    .putInt("user_id", matched.id)
                                    .putString("username", matched.username)
                                    .putString("display_name", matched.displayName)
                                    .apply()

                                onLoginSuccess(matched)
                            } else {
                                errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة."
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Text(
                            text = "تسجيل الدخول",
                            color = Color(0xFF0F172A),
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp
                        )
                    }
                }
            }
        }
    }
}

data class AndroidChatMessage(
    val id: String,
    val senderId: Int,
    val senderName: String,
    val text: String?,
    val imageUrl: String?,
    val storagePath: String?,
    val timestamp: Long
)

/**
 * Deterministic high-contrast color palette for user names on dark backgrounds.
 * Every userId always maps to the exact same color across sessions, reloads, and devices.
 */
private val USER_NAME_COLOR_PALETTE = listOf(
    Color(0xFFFFD700), // 1 - Gold
    Color(0xFF38BDF8), // 2 - Sky Blue
    Color(0xFF34D399), // 3 - Emerald Green
    Color(0xFFF472B6), // 4 - Pink Rose
    Color(0xFFA78BFA), // 5 - Soft Violet
    Color(0xFFFB923C), // 6 - Vibrant Orange
    Color(0xFF2DD4BF), // 7 - Teal Cyan
    Color(0xFFF87171), // 8 - Coral Red
    Color(0xFFA3E635), // 9 - Lime Green
    Color(0xFF60A5FA), // 10 - Royal Blue
    Color(0xFFE879F9), // 11 - Fuchsia
    Color(0xFFFBBF24), // 12 - Warm Amber
    Color(0xFF22D3EE), // 13 - Bright Cyan
    Color(0xFFFB7185), // 14 - Salmon Rose
    Color(0xFF818CF8), // 15 - Indigo Light
    Color(0xFF4ADE80), // 16 - Mint Green
    Color(0xFFFDBA74), // 17 - Peach Gold
    Color(0xFFC084FC), // 18 - Purple Orchid
    Color(0xFF67E8F9), // 19 - Ice Aqua
    Color(0xFFFDE047)  // 20 - Lemon Yellow
)

fun getUserNameColor(userId: Int): Color {
    val paletteSize = USER_NAME_COLOR_PALETTE.size
    val index = (userId - 1).mod(paletteSize)
    return USER_NAME_COLOR_PALETTE[index]
}

fun getUserNameColor(userId: String): Color {
    val numericId = userId.toIntOrNull()
    if (numericId != null) {
        return getUserNameColor(numericId)
    }
    var hash = 0
    for (ch in userId) {
        hash = (hash * 31) + ch.code
    }
    val index = hash.mod(USER_NAME_COLOR_PALETTE.size)
    return USER_NAME_COLOR_PALETTE[index]
}

/**
 * Cloud Group Chat Screen: 💬 دفعة الرحلة إلى 3000$
 * - Real-time sync via Firebase Firestore (`chat_messages`)
 * - Cloud image storage via Firebase Storage (`chat_images`)
 * - Supports text, Gallery images, and Camera capture
 * - Auto-deletes messages and images older than 48 hours
 */
@Composable
fun AndroidGroupChatScreen(
    currentUser: AndroidAuthUser
) {
    val context = LocalContext.current
    var isOnline by remember { mutableStateOf(checkInternet(context)) }
    var inputText by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var previewFullImageUrl by remember { mutableStateOf<String?>(null) }
    var isSending by remember { mutableStateOf(false) }
    var alertBanner by remember { mutableStateOf<String?>(null) }

    val messages = remember { mutableStateListOf<AndroidChatMessage>() }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val fortyEightHoursMs = 48L * 3600L * 1000L

    // Monitor network connectivity changes
    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
            }
            override fun onLost(network: Network) {
                isOnline = checkInternet(context)
            }
        }
        try {
            cm?.registerDefaultNetworkCallback(callback)
        } catch (_: Exception) {
        }
        onDispose {
            try {
                cm?.unregisterNetworkCallback(callback)
            } catch (_: Exception) {
            }
        }
    }

    // Subscribe to Firebase Firestore `chat_messages` in real-time with safety limit
    DisposableEffect(Unit) {
        val db = FirebaseCloudHelper.getFirestore(context)
        val registration = db.collection("chat_messages")
            .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .limit(35)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    val errStr = error.message ?: ""
                    alertBanner = if (errStr.contains("RESOURCE_EXHAUSTED", ignoreCase = true) || errStr.contains("Quota", ignoreCase = true)) {
                        "تم استنفاد الحصة اليومية لقراءة البيانات في Firebase (Quota Exceeded). يتم استخدام البيانات المحفوظة محليًا."
                    } else {
                        "تعذر الاتصال بخدمة الدردشة السحابية."
                    }
                    return@addSnapshotListener
                }
                if (snapshot == null) return@addSnapshotListener

                val now = System.currentTimeMillis()
                val validList = mutableListOf<AndroidChatMessage>()
                for (doc in snapshot.documents) {
                    val msg = AndroidChatMessage(
                        id = doc.getString("id") ?: doc.id,
                        senderId = (doc.getLong("senderId") ?: 0L).toInt(),
                        senderName = doc.getString("senderName") ?: "متداول",
                        text = doc.getString("text"),
                        imageUrl = doc.getString("imageUrl"),
                        storagePath = doc.getString("storagePath"),
                        timestamp = doc.getLong("timestamp") ?: now
                    )
                    validList.add(msg)
                }

                // Preserve all message history: No client-side message deletion!
                validList.sortBy { it.timestamp }
                messages.clear()
                messages.addAll(validList)
            }
        onDispose {
            registration.remove()
        }
    }

    // Auto-scroll to latest message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    // Gallery Launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedImageUri = uri
            alertBanner = null
        }
    }

    // Camera Launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success && pendingCameraUri != null) {
            selectedImageUri = pendingCameraUri
            alertBanner = null
        }
    }

    // Camera Permission Launcher
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
            pendingCameraUri = outUri
            cameraLauncher.launch(outUri)
        } else {
            alertBanner = "يرجى السماح بصلاحية الكاميرا لالتقاط الصور."
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070A10))
    ) {
        // Chat Header
        Surface(
            color = Color(0xFF0D131F),
            shadowElevation = 4.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFFFD700)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("💬", fontSize = 20.sp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "دفعة الرحلة إلى 3000$",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "20 عضواً • حذف تلقائي بعد 48 ساعة",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }

                Surface(
                    color = Color(0xFF1E293B),
                    shape = RoundedCornerShape(50),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = Color(0xFFFFD700),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = currentUser.displayName,
                            color = Color(0xFFFFD700),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Offline Banner
        if (!isOnline) {
            Surface(
                color = Color(0x33EF4444),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.WifiOff, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("لا يوجد اتصال بالإنترنت.", color = Color(0xFFFCA5A5), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // In-App Alert Banner
        alertBanner?.let { bannerMsg ->
            Surface(
                color = Color(0x33EF4444),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = bannerMsg,
                        color = Color(0xFFFCA5A5),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = { alertBanner = null },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // Messages list
        if (messages.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("💬", fontSize = 28.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("لا توجد رسائل بعد", color = Color.LightGray, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("كن أول من يبدأ المحادثة في مجموعة دفعة الرحلة إلى 3000$!", color = Color.Gray, fontSize = 12.sp)
                }
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(messages, key = { it.id }) { msg ->
                    val isMe = msg.senderId == currentUser.id
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = if (isMe) Alignment.Start else Alignment.End
                    ) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isMe) Color(0x33FFD700) else Color(0xFF131D30),
                            border = if (isMe) androidx.compose.foundation.BorderStroke(1.dp, Color(0x88FFD700)) else null,
                            modifier = Modifier.widthIn(max = 290.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (isMe) "${msg.senderName} (أنت)" else msg.senderName,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = getUserNameColor(msg.senderId)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
                                    Text(
                                        text = timeFormat.format(Date(msg.timestamp)),
                                        fontSize = 10.sp,
                                        color = Color.Gray
                                    )
                                }

                                val attachedImageUrl = msg.imageUrl
                                if (!attachedImageUrl.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .heightIn(min = 140.dp, max = 260.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(Color(0xFF0A0F1A))
                                            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                                            .clickable { previewFullImageUrl = attachedImageUrl },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CloudAsyncImage(
                                            imageUrl = attachedImageUrl,
                                            contentDescription = "مرفق الدردشة",
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .heightIn(min = 140.dp, max = 260.dp),
                                            contentScale = ContentScale.Fit
                                        )
                                        Surface(
                                            color = Color.Black.copy(alpha = 0.6f),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier
                                                .align(Alignment.BottomEnd)
                                                .padding(6.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.ZoomIn,
                                                contentDescription = "تكبير الصورة",
                                                tint = Color.White,
                                                modifier = Modifier
                                                    .padding(4.dp)
                                                    .size(16.dp)
                                            )
                                        }
                                    }
                                }

                                val messageText = msg.text
                                if (!messageText.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(text = messageText, color = Color.White, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Selected Image Preview Banner before sending
        if (selectedImageUri != null) {
            Surface(
                color = Color(0xFF121C2E),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = selectedImageUri,
                            contentDescription = "صورة جاهزة للإرسال",
                            modifier = Modifier
                                .size(42.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFFFD700), RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("صورة جاهزة للإرسال", color = Color(0xFFFFD700), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    IconButton(onClick = { selectedImageUri = null }) {
                        Icon(Icons.Default.Close, contentDescription = "إلغاء الصورة", tint = Color.LightGray)
                    }
                }
            }
        }

        // Input Bar with Gallery, Camera, Text Field, and Send
        Surface(
            color = Color(0xFF0D131F),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Gallery Picker Button
                IconButton(
                    enabled = isOnline && !isSending,
                    onClick = { galleryLauncher.launch("image/*") }
                ) {
                    Icon(Icons.Default.Image, contentDescription = "إرسال صورة من المعرض", tint = Color(0xFFFFD700))
                }

                // Camera Capture Button
                IconButton(
                    enabled = isOnline && !isSending,
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
                    }
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = "التقاط صورة بالكاميرا", tint = Color(0xFFFFD700))
                }

                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = {
                        Text(
                            if (isOnline) "اكتب رسالتك للمجموعة..." else "لا يوجد اتصال بالإنترنت.",
                            fontSize = 12.sp
                        )
                    },
                    enabled = isOnline && !isSending,
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFFFFD700),
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    enabled = isOnline && !isSending && (inputText.isNotBlank() || selectedImageUri != null),
                    onClick = {
                        if (!isOnline) {
                            alertBanner = "لا يوجد اتصال بالإنترنت."
                            return@IconButton
                        }
                        val textToSend = inputText.trim()
                        val imageUriToSend = selectedImageUri
                        if (textToSend.isEmpty() && imageUriToSend == null) return@IconButton

                        isSending = true
                        alertBanner = null
                        coroutineScope.launch {
                            try {
                                val now = System.currentTimeMillis()
                                val msgId = "msg_${now}_${currentUser.id}_${UUID.randomUUID().toString().take(6)}"
                                var cloudImageUrl: String? = null
                                var storagePath: String? = null

                                if (imageUriToSend != null) {
                                    val uploaded = FirebaseCloudHelper.uploadImageToCloud(
                                        context,
                                        imageUriToSend,
                                        "chat_images",
                                        currentUser.id
                                    )
                                    cloudImageUrl = uploaded.first
                                    storagePath = uploaded.second
                                }

                                val payload = mutableMapOf<String, Any>(
                                    "id" to msgId,
                                    "senderId" to currentUser.id,
                                    "senderName" to currentUser.displayName,
                                    "timestamp" to now
                                )
                                if (textToSend.isNotEmpty()) payload["text"] = textToSend
                                if (cloudImageUrl != null) payload["imageUrl"] = cloudImageUrl
                                if (storagePath != null) payload["storagePath"] = storagePath

                                FirebaseCloudHelper.getFirestore(context)
                                    .collection("chat_messages")
                                    .document(msgId)
                                    .set(payload)
                                    .await()

                                inputText = ""
                                selectedImageUri = null
                            } catch (e: Exception) {
                                alertBanner = "تعذر إرسال الرسالة، يرجى التحقق من اتصال الإنترنت."
                            } finally {
                                isSending = false
                            }
                        }
                    },
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFFFFD700))
                ) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFF0F172A)
                        )
                    } else {
                        Icon(Icons.Default.Send, contentDescription = "إرسال", tint = Color(0xFF0F172A))
                    }
                }
            }
        }
    }

    // Fullscreen Image Preview Modal with Pinch-to-Zoom, Pan, Zoom Controls, and Save to Gallery
    val activePreviewUrl = previewFullImageUrl
    if (activePreviewUrl != null) {
        FullScreenImageViewerDialog(
            imageUrl = activePreviewUrl,
            onDismiss = { previewFullImageUrl = null }
        )
    }
}

private fun clampPanOffset(currentOffset: Offset, currentScale: Float, containerSize: IntSize): Offset {
    if (currentScale <= 1f || containerSize.width <= 0 || containerSize.height <= 0) {
        return Offset.Zero
    }
    val maxX = (containerSize.width.toFloat() * (currentScale - 1f)) / 2f
    val maxY = (containerSize.height.toFloat() * (currentScale - 1f)) / 2f
    return Offset(
        x = currentOffset.x.coerceIn(-maxX, maxX),
        y = currentOffset.y.coerceIn(-maxY, maxY)
    )
}

@Composable
fun FullScreenImageViewerDialog(
    imageUrl: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var scale by remember(imageUrl) { mutableStateOf(1f) }
    var offset by remember(imageUrl) { mutableStateOf(Offset.Zero) }
    var containerSize by remember { mutableStateOf(IntSize.Zero) }
    var useSmoothTransition by remember(imageUrl) { mutableStateOf(false) }

    var isSaving by remember { mutableStateOf(false) }
    var feedbackMessage by remember { mutableStateOf<String?>(null) }
    var isFeedbackError by remember { mutableStateOf(false) }

    val animDuration = if (useSmoothTransition) 200 else 0
    val renderedScale by animateFloatAsState(
        targetValue = scale,
        animationSpec = tween(durationMillis = animDuration),
        label = "zoomScale"
    )
    val renderedOffsetX by animateFloatAsState(
        targetValue = offset.x,
        animationSpec = tween(durationMillis = animDuration),
        label = "panX"
    )
    val renderedOffsetY by animateFloatAsState(
        targetValue = offset.y,
        animationSpec = tween(durationMillis = animDuration),
        label = "panY"
    )

    fun performSaveImage() {
        if (isSaving) return
        isSaving = true
        feedbackMessage = null
        coroutineScope.launch {
            val result = FirebaseCloudHelper.saveImageToGallery(context, imageUrl)
            isSaving = false
            if (result.isSuccess) {
                val msg = result.getOrNull() ?: "تم حفظ الصورة في المعرض بنجاح"
                isFeedbackError = false
                feedbackMessage = msg
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                delay(3000)
                if (feedbackMessage == msg) {
                    feedbackMessage = null
                }
            } else {
                val errMsg = result.exceptionOrNull()?.message ?: "تعذر حفظ الصورة في المعرض"
                isFeedbackError = true
                feedbackMessage = errMsg
                Toast.makeText(context, errMsg, Toast.LENGTH_SHORT).show()
                delay(3500)
                if (feedbackMessage == errMsg) {
                    feedbackMessage = null
                }
            }
        }
    }

    val writePermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            performSaveImage()
        } else {
            val msg = "يرجى منح صلاحية التخزين لحفظ الصورة في المعرض"
            isFeedbackError = true
            feedbackMessage = msg
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.96f))
                .onSizeChanged { containerSize = it }
                .clipToBounds()
        ) {
            // Interactive Zoomable & Pannable Image Area
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(imageUrl) {
                        detectTapGestures(
                            onDoubleTap = {
                                useSmoothTransition = true
                                if (scale > 1.05f) {
                                    scale = 1f
                                    offset = Offset.Zero
                                } else {
                                    scale = 2.5f
                                    offset = Offset.Zero
                                }
                            }
                        )
                    }
                    .pointerInput(imageUrl) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            useSmoothTransition = false
                            val newScale = (scale * zoom).coerceIn(1f, 5f)
                            val candidateOffset = if (newScale > 1f) {
                                Offset(
                                    x = offset.x + pan.x,
                                    y = offset.y + pan.y
                                )
                            } else {
                                Offset.Zero
                            }
                            scale = newScale
                            offset = clampPanOffset(candidateOffset, newScale, containerSize)
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                CloudAsyncImage(
                    imageUrl = imageUrl,
                    contentDescription = "عرض الصورة بحجم كامل",
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer(
                            scaleX = renderedScale,
                            scaleY = renderedScale,
                            translationX = renderedOffsetX,
                            translationY = renderedOffsetY
                        ),
                    contentScale = ContentScale.Fit
                )
            }

            // Top Action Bar: Close + Zoom Badge + Save Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .padding(horizontal = 16.dp, vertical = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Close Button
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xCC1E293B), CircleShape)
                        .border(1.dp, Color(0xFF334155), CircleShape)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.White)
                }

                // Current Zoom Level Indicator
                Surface(
                    color = Color(0xCC0F172A),
                    shape = RoundedCornerShape(50),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                ) {
                    Text(
                        text = "${(scale * 100).toInt()}%",
                        color = Color(0xFFFFD700),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                    )
                }

                // Download / Save Image Button
                Button(
                    onClick = {
                        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                            val hasPerm = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.WRITE_EXTERNAL_STORAGE
                            ) == PackageManager.PERMISSION_GRANTED
                            if (hasPerm) {
                                performSaveImage()
                            } else {
                                writePermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                            }
                        } else {
                            performSaveImage()
                        }
                    },
                    enabled = !isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFF0F172A)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("جاري الحفظ...", color = Color(0xFF0F172A), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Icon(
                            imageVector = Icons.Default.Download,
                            contentDescription = "حفظ الصورة",
                            tint = Color(0xFF0F172A),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("حفظ الصورة", color = Color(0xFF0F172A), fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }
            }

            // Status / Feedback Banner
            val currentFeedback = feedbackMessage
            if (currentFeedback != null) {
                Surface(
                    color = if (isFeedbackError) Color(0xEE7F1D1D) else Color(0xEE064E3B),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isFeedbackError) Color(0xFFEF4444) else Color(0xFF10B981)
                    ),
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 80.dp, start = 24.dp, end = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isFeedbackError) Icons.Default.ErrorOutline else Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = currentFeedback,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Bottom Zoom Controls Bar (Zoom In, Reset, Zoom Out)
            Surface(
                color = Color(0xDD0D131F),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 28.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Zoom In (+)
                    IconButton(
                        onClick = {
                            useSmoothTransition = true
                            val newScale = (scale + 0.5f).coerceAtMost(5f)
                            scale = newScale
                            offset = clampPanOffset(offset, newScale, containerSize)
                        },
                        enabled = scale < 5f
                    ) {
                        Icon(
                            imageVector = Icons.Default.ZoomIn,
                            contentDescription = "تكبير",
                            tint = if (scale < 5f) Color(0xFFFFD700) else Color.Gray
                        )
                    }

                    // Reset Zoom (1:1)
                    TextButton(
                        onClick = {
                            useSmoothTransition = true
                            scale = 1f
                            offset = Offset.Zero
                        },
                        enabled = scale != 1f || offset != Offset.Zero
                    ) {
                        Icon(
                            imageVector = Icons.Default.RestartAlt,
                            contentDescription = "إعادة الضبط",
                            tint = if (scale != 1f || offset != Offset.Zero) Color.White else Color.Gray,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "إعادة الحجم",
                            color = if (scale != 1f || offset != Offset.Zero) Color.White else Color.Gray,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Zoom Out (-)
                    IconButton(
                        onClick = {
                            useSmoothTransition = true
                            val newScale = (scale - 0.5f).coerceAtLeast(1f)
                            scale = newScale
                            offset = clampPanOffset(offset, newScale, containerSize)
                        },
                        enabled = scale > 1f
                    ) {
                        Icon(
                            imageVector = Icons.Default.ZoomOut,
                            contentDescription = "تصغير",
                            tint = if (scale > 1f) Color(0xFFFFD700) else Color.Gray
                        )
                    }
                }
            }
        }
    }
}

fun checkInternet(context: Context): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
    val activeNet = cm.activeNetwork ?: return false
    val caps = cm.getNetworkCapabilities(activeNet) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}
