# Proguard & R8 rules for Sami Trading Challenge Tracker

# Keep all project application models, database entities, and MainActivity
-keep class com.sami.tradingchallengetracker.data.** { *; }
-keep class com.sami.tradingchallengetracker.util.** { *; }
-keep class com.sami.tradingchallengetracker.ui.** { *; }
-keep class com.sami.tradingchallengetracker.MainActivity { *; }

# Keep Room database and DAO implementations
-keep class * extends androidx.room.RoomDatabase { *; }
-keepclassmembers class * {
    @androidx.room.Dao *;
    @androidx.room.Entity *;
}

# Keep JavaScript Interface methods for WebView
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep annotations
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Firebase Firestore and Storage
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }

# Media3 ExoPlayer
-dontwarn androidx.media3.**
-keep class androidx.media3.** { *; }

# Coil image loading
-dontwarn coil.**
-keep class coil.** { *; }

# Coroutines
-dontwarn kotlinx.coroutines.**
