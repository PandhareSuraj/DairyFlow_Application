package com.example.dairyflow.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.dairyflow.data.model.ProfileDetails
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class SecureSessionStore(context: Context) : SessionManager {
    private val appContext = context.applicationContext
    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }
    private val prefs by lazy { createEncryptedPrefs() }

    /**
     * Creates EncryptedSharedPreferences, recovering from corrupted keystore keys.
     *
     * The Android Keystore can become invalid after app reinstalls, OS updates, or
     * backup-restore operations, causing [javax.crypto.AEADBadTagException]. When
     * that happens we delete the corrupted prefs file and create a fresh instance.
     * The user will simply need to log in again.
     */
    private fun createEncryptedPrefs(): SharedPreferences {
        return try {
            buildEncryptedPrefs()
        } catch (e: Exception) {
            Log.w(TAG, "EncryptedSharedPreferences corrupted, resetting secure storage", e)
            // Delete the corrupted SharedPreferences file
            appContext.deleteSharedPreferences(PREFS_NAME)
            try {
                buildEncryptedPrefs()
            } catch (e2: Exception) {
                Log.e(TAG, "Failed to recreate EncryptedSharedPreferences, falling back to plain prefs", e2)
                // Last-resort fallback so the app at least opens
                appContext.getSharedPreferences(PREFS_NAME + "_fallback", Context.MODE_PRIVATE)
            }
        }
    }

    private fun buildEncryptedPrefs(): SharedPreferences {
        val masterKey = MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            appContext,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    override suspend fun saveSession(session: UserSession) {
        prefs.edit().putString(KEY_SESSION, json.encodeToString(session)).apply()
    }

    override suspend fun loadSession(): UserSession {
        val raw = prefs.getString(KEY_SESSION, null) ?: error("No saved session.")
        return runCatching { json.decodeFromString<UserSession>(raw) }
            .getOrElse { error("Unable to decode saved session.") }
    }

    override suspend fun loadSessionOrNull(): UserSession? {
        val raw = prefs.getString(KEY_SESSION, null) ?: return null
        return runCatching { json.decodeFromString<UserSession>(raw) }.getOrNull()
    }

    override suspend fun deleteSession() {
        prefs.edit().remove(KEY_SESSION).remove(KEY_PROFILE).apply()
    }

    fun saveProfile(profile: ProfileDetails) {
        prefs.edit().putString(KEY_PROFILE, json.encodeToString(ProfileDetails.serializer(), profile)).apply()
    }

    fun loadProfile(): ProfileDetails? {
        val raw = prefs.getString(KEY_PROFILE, null) ?: return null
        return runCatching { json.decodeFromString(ProfileDetails.serializer(), raw) }.getOrNull()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val TAG = "SecureSessionStore"
        const val PREFS_NAME = "dairyflow_secure_session"
        const val KEY_SESSION = "supabase_session"
        const val KEY_PROFILE = "profile"
    }
}
