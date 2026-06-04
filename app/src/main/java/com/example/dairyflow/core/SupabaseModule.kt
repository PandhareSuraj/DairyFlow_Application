package com.example.dairyflow.core

import android.content.Context
import android.util.Base64
import android.util.Log
import com.example.dairyflow.BuildConfig
import com.example.dairyflow.data.repository.SecureSessionStore
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseModule {
    private const val SUPABASE_API_URL = "https://tdtyrgjdqoimbvgxewzr.supabase.co"
    const val AUTH_CALLBACK_URL = "dairyflow://auth/callback"
    val supabaseUrl: String get() = normalizedUrl()
    val anonKey: String get() = BuildConfig.SUPABASE_KEY
    val functionsUrl: String get() = "${normalizedUrl()}/functions/v1"

    val hasCredentials: Boolean
        get() = normalizedUrl().isNotBlank() && BuildConfig.SUPABASE_KEY.isNotBlank()

    @Volatile private var cachedClient: SupabaseClient? = null
    @Volatile private var cachedSessionStore: SecureSessionStore? = null

    fun client(context: Context): SupabaseClient =
        cachedClient ?: synchronized(this) {
            cachedClient ?: createClient(context.applicationContext).also { cachedClient = it }
        }

    fun sessionStore(context: Context): SecureSessionStore =
        cachedSessionStore ?: synchronized(this) {
            cachedSessionStore ?: SecureSessionStore(context.applicationContext).also { cachedSessionStore = it }
        }

    private fun createClient(context: Context): SupabaseClient {
        val url = normalizedUrl()
        require(url == SUPABASE_API_URL) {
            "SUPABASE_URL must be $SUPABASE_API_URL"
        }
        require(BuildConfig.SUPABASE_KEY.isNotBlank()) {
            "SUPABASE_KEY is missing."
        }
        require(!BuildConfig.SUPABASE_KEY.isPrivilegedJwt()) {
            "SUPABASE_KEY must be a publishable or anon key."
        }
        Log.i("SupabaseConfigError", "Supabase URL=$url keyType=${BuildConfig.SUPABASE_KEY.keyTypeForLog()}")
        return createSupabaseClient(
            supabaseUrl = url,
            supabaseKey = BuildConfig.SUPABASE_KEY
        ) {
            install(Auth) {
                scheme = "dairyflow"
                host = "auth"
                defaultRedirectUrl = AUTH_CALLBACK_URL
                sessionManager = sessionStore(context)
                autoLoadFromStorage = true
                autoSaveToStorage = true
                alwaysAutoRefresh = true
            }
            install(Postgrest)
        }
    }

    private fun normalizedUrl(): String =
        BuildConfig.SUPABASE_URL.ifBlank { SUPABASE_API_URL }.trim().trimEnd('/')

    private fun String.isPrivilegedJwt(): Boolean {
        val payload = split(".").getOrNull(1) ?: return false
        return runCatching {
            val decoded = String(Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP))
            decoded.contains("\"role\":\"" + "service" + "_" + "role\"")
        }.onFailure {
            Log.e("SupabaseConfigError", "Unable to inspect Supabase key role", it)
        }.getOrDefault(false)
    }

    private fun String.keyTypeForLog(): String =
        when {
            startsWith("sb_publishable_") -> "publishable"
            split(".").size == 3 -> "jwt"
            else -> "unknown"
        }
}
