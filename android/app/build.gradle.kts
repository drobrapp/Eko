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
        // La versión del Eko de escritorio (la que usa su código para las novedades y el saludo de «me he actualizado»)
        val desk = Regex("\"version\"\\s*:\\s*\"([^\"]+)\"").find(rootProject.file("../src-tauri/tauri.conf.json").readText())?.groupValues?.get(1) ?: "0.0.0"
        buildConfigField("String", "DESK_VERSION", "\"$desk\"")
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
    buildFeatures { buildConfig = true }
    // Arte y catálogos compartidos con el Eko de escritorio (src/): se copian al compilar, sin duplicarlos en el repo
    sourceSets["main"].assets.srcDir(layout.buildDirectory.get().asFile.resolve("pcAssets"))
    sourceSets["main"].res.srcDir(layout.buildDirectory.get().asFile.resolve("pcRes"))
}

// Iconos del menú «Ropa»: los mismos gorros del PC, con nombre de recurso de Android (hat-witch.webp → eko_acc_witch)
val pcRes = tasks.register<Copy>("pcRes") {
    from(rootProject.file("../src/art")) {
        include("hat-*.webp", "cape-vampire.webp", "scarf.webp")
        rename { "eko_acc_" + it.removeSuffix(".webp").removePrefix("hat-").replace("-", "_") + ".webp" }
    }
    into(layout.buildDirectory.get().asFile.resolve("pcRes/drawable-nodpi"))
}

val pcAssets = tasks.register<Copy>("pcAssets") {
    from(rootProject.file("../src")) {
        include("expr.js", "evo-art.js")
        into("eko")
    }
    from(rootProject.file("../src/art")) {
        include("hat-*.webp", "cape-vampire.webp", "scarf.webp", "nose.webp", "sprout*.webp")
        into("eko/art")
    }
    // Lo que se ve por la ventana de su casa (cielo del valle del PC)
    from(rootProject.file("../src/art/valley")) {
        include("hills-far.webp", "hills-mid.webp", "cloud.webp", "sun.webp", "moon.webp")
        into("eko/art/valley")
    }
    into(layout.buildDirectory.get().asFile.resolve("pcAssets"))
}
tasks.named("preBuild") { dependsOn(pcAssets, pcRes) }

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
}
