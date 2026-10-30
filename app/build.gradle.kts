plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.sami.tradingchallengetracker"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.sami.tradingchallengetracker"
        minSdk = 24
        targetSdk = 34
        versionCode = 15
        versionName = "1.3.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
        }
    }


    signingConfigs {
        create("samiUniversal") {
            val keyPath = file("${project.projectDir}/sami-signing-key.p12")
            val keystoreFile = if (keyPath.exists()) keyPath else file("sami-signing-key.p12")
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storeType = "PKCS12"
                storePassword = "samitrading"
                keyAlias = "sami"
                keyPassword = "samitrading"
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        debug {
            val keyPath = file("${project.projectDir}/sami-signing-key.p12")
            val keystoreFile = if (keyPath.exists()) keyPath else file("sami-signing-key.p12")
            if (keystoreFile.exists()) {
                signingConfig = signingConfigs.getByName("samiUniversal")
            }
        }
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            val keyPath = file("${project.projectDir}/sami-signing-key.p12")
            val keystoreFile = if (keyPath.exists()) keyPath else file("sami-signing-key.p12")
            if (keystoreFile.exists()) {
                signingConfig = signingConfigs.getByName("samiUniversal")
            } else {
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/DEPENDENCIES"
            excludes += "META-INF/LICENSE*"
            excludes += "META-INF/NOTICE*"
            excludes += "META-INF/*.version"
            excludes += "META-INF/INDEX.LIST"
            excludes += "META-INF/io.netty.versions.properties"
            excludes += "**/*.proto"
        }
        jniLibs {
            useLegacyPackaging = false
        }
    }
}

tasks.configureEach {
    if (name.contains("ArtProfile")) {
        enabled = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")

    // Room Database
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // Firebase Firestore & Firebase Storage for real-time cloud chat and image storage
    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // Coil for Compose image loading
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Media3 ExoPlayer
    val media3Version = "1.3.1"
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

    // AndroidX WebKit for offline local HTML/JS/CSS asset loading and PWA support
    implementation("androidx.webkit:webkit:1.11.0")
}
