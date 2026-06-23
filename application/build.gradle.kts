// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}

val dairyFlowBuildRoot = providers.gradleProperty("DAIRYFLOW_BUILD_DIR")
    .orElse(providers.environmentVariable("DAIRYFLOW_BUILD_DIR"))
    .orElse("${System.getProperty("user.home")}/.dairyflow-build")

layout.buildDirectory.set(file("${dairyFlowBuildRoot.get()}/root"))

subprojects {
    layout.buildDirectory.set(file("${dairyFlowBuildRoot.get()}/$name"))
}
