plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.drobr.eko"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.drobr.eko"
        minSdk = 26
        targetSdk = 34
        // En GitHub, cada compilación lleva el número de «prueba» (android-N) como versión: así la app sabe si hay una más nueva
        val run = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionCode = run
        versionName = "0.1.$run"
    }

    // Firma fija (guardada en el repo) para que cada APK nuevo se instale encima del anterior sin desinstalar
    signingConfigs {
        create("eko") {
            storeFile = file("eko-movil.keystore")
            storePassword = "eko-movil"
            keyAlias = "eko"
            keyPassword = "eko-movil"
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("eko")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
}
