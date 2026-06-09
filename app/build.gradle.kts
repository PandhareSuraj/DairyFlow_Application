import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

fun readKeyFromEnvFile(key: String): String? {
    val envFile = rootProject.file(".env")
    if (!envFile.exists()) return null
    return envFile.readLines()
        .map { it.trim() }
        .firstOrNull { it.startsWith("$key=") }
        ?.substringAfter("=")
        ?.trim()
        ?.trim('"')
        ?.trim('\'')
        ?.takeIf { it.isNotBlank() }
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}

fun secureConfigValue(key: String): String {
    return (localProperties.getProperty(key)
        ?: readKeyFromEnvFile(key)
        ?: System.getenv(key)
        ?: "")
}

fun supabaseKeyConfig(): String =
    secureConfigValue("SUPABASE_KEY").ifBlank {
        secureConfigValue("SUPABASE_PUBLISHABLE_KEY")
    }

android {
    namespace = "com.example.dairyflow"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.example.dairyflow"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "SUPABASE_URL", "\"${secureConfigValue("SUPABASE_URL")}\"")
        buildConfigField("String", "SUPABASE_KEY", "\"${supabaseKeyConfig()}\"")
        buildConfigField("String", "TEST_ADMIN_PHONE", "\"8275838256\"")
        buildConfigField("String", "TEST_ADMIN_OTP", "\"123456\"")
        buildConfigField("String", "TEST_ADMIN_EMAIL", "\"dairyflow.admin.8275838256@test.local\"")
        buildConfigField("String", "TEST_ADMIN_PASSWORD", "\"DairyFlowTest@8275838256\"")
        buildConfigField(
            "String",
            "TEST_ADMIN_LOGINS",
            "\"8275838256|123456|dairyflow.admin.8275838256@test.local|DairyFlowTest@8275838256;9607444499|123456|omsai11@dairy.com|DairyFlowTest@9607444499\""
        )
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            buildConfigField("String", "TEST_ADMIN_PHONE", "\"\"")
            buildConfigField("String", "TEST_ADMIN_OTP", "\"\"")
            buildConfigField("String", "TEST_ADMIN_EMAIL", "\"\"")
            buildConfigField("String", "TEST_ADMIN_PASSWORD", "\"\"")
            buildConfigField("String", "TEST_ADMIN_LOGINS", "\"\"")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        buildConfig = true
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(platform(libs.supabase.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.ktor.client.android)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)
    implementation(libs.zxing.core)
    implementation(libs.supabase.auth)
    implementation(libs.supabase.postgrest)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}

tasks.matching {
    it.name.startsWith("create") && it.name.endsWith("ApkListingFileRedirect")
}.configureEach {
    val redirectTaskName = name
    val variantName = redirectTaskName
        .removePrefix("create")
        .removeSuffix("ApkListingFileRedirect")
        .replaceFirstChar { it.lowercase() }

    doLast {
        val sourceApkDir = layout.buildDirectory.get().asFile.resolve("outputs/apk/$variantName")
        if (!sourceApkDir.exists()) return@doLast

        val studioBuildDir = layout.projectDirectory.asFile.resolve("build")
        val studioApkDir = studioBuildDir.resolve("intermediates/apk/$variantName")
        studioApkDir.mkdirs()
        sourceApkDir.listFiles()
            ?.filter { it.isFile }
            ?.forEach { sourceFile ->
                sourceFile.copyTo(studioApkDir.resolve(sourceFile.name), overwrite = true)
            }

        val studioRedirectDir = studioBuildDir
            .resolve("intermediates/apk_ide_redirect_file/$variantName/$redirectTaskName")
        studioRedirectDir.mkdirs()
        studioRedirectDir.resolve("redirect.txt").writeText(
            "#- File Locator -\nlistingFile=../../../apk/$variantName/output-metadata.json\n"
        )
    }
}
