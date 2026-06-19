package com.example.dairyflow.data.repository

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class AppThemePreference(val storageValue: String) {
    LIGHT("light"),
    DARK("dark"),
    SYSTEM("system");

    companion object {
        fun fromStorage(value: String?): AppThemePreference =
            entries.firstOrNull { it.storageValue == value } ?: SYSTEM
    }
}

enum class AppLanguage(val storageValue: String) {
    ENGLISH("en"),
    MARATHI("mr"),
    HINDI("hi");

    companion object {
        fun fromStorage(value: String?): AppLanguage =
            entries.firstOrNull { it.storageValue == value } ?: ENGLISH
    }
}

data class AppSettings(
    val themePreference: AppThemePreference = AppThemePreference.SYSTEM,
    val language: AppLanguage = AppLanguage.ENGLISH
)

class AppSettingsRepository(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val _settings = MutableStateFlow(loadSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    fun setThemePreference(themePreference: AppThemePreference) {
        preferences.edit().putString(KEY_THEME, themePreference.storageValue).apply()
        _settings.value = _settings.value.copy(themePreference = themePreference)
    }

    fun setLanguage(language: AppLanguage) {
        preferences.edit().putString(KEY_LANGUAGE, language.storageValue).apply()
        _settings.value = _settings.value.copy(language = language)
    }

    private fun loadSettings(): AppSettings =
        AppSettings(
            themePreference = AppThemePreference.fromStorage(preferences.getString(KEY_THEME, null)),
            language = AppLanguage.fromStorage(preferences.getString(KEY_LANGUAGE, null))
        )

    private companion object {
        const val PREFS_NAME = "dairyflow_app_settings"
        const val KEY_THEME = "theme"
        const val KEY_LANGUAGE = "language"
    }
}
