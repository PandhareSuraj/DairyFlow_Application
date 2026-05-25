package com.example.dairyflow.data.repository

import android.util.Log
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class AuthRepository(private val supabase: SupabaseClient) {
    companion object {
        private const val TAG = "AuthRepository"
    }

    suspend fun signIn(email: String, password: String): Boolean {
        supabase.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        supabase.auth.currentUserOrNull()?.let { user ->
            runCatching {
                upsertProfile(
                    userId = user.id,
                    fullName = email.substringBefore("@").ifBlank { "Customer" },
                    email = user.email ?: email,
                    mobile = ""
                )
            }.onFailure {
                Log.w(TAG, "Profile upsert after sign-in failed", it)
            }
        }
        return isSignedIn()
    }

    suspend fun signUp(fullName: String, email: String, mobile: String, password: String): Boolean {
        supabase.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = buildJsonObject {
                put("full_name", fullName)
                put("phone", mobile)
                put("role", "customer")
            }
        }
        val user = supabase.auth.currentUserOrNull()
        if (user == null) {
            throw EmailConfirmationRequiredException()
        }
        runCatching {
            upsertProfile(user.id, fullName, email, mobile)
        }.onFailure {
            Log.e(TAG, "Profile setup failed after auth signup", it)
            runCatching { supabase.auth.signOut() }
            throw ProfileCreationFailedException()
        }
        return isSignedIn()
    }

    suspend fun signOut() {
        supabase.auth.signOut()
    }

    fun isSignedIn(): Boolean = supabase.auth.currentUserOrNull() != null

    fun currentUserEmail(): String? = supabase.auth.currentUserOrNull()?.email

    private suspend fun upsertProfile(userId: String, fullName: String, email: String, mobile: String) {
        val profile = ProfileUpsert(
            id = userId,
            fullName = fullName,
            email = email,
            phone = mobile,
            updatedAt = timestampNow()
        )
        supabase.from(SupabaseTables.PROFILES).upsert(profile) {
            onConflict = "id"
        }
    }

    private fun timestampNow(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        return formatter.format(Date())
    }
}

class ProfileCreationFailedException : Exception(
    "Account was created, but profile setup failed. Please contact admin."
)

class EmailConfirmationRequiredException : Exception(
    "Account created. Please confirm your email, then sign in."
)

@Serializable
private data class ProfileUpsert(
    val id: String,
    @SerialName("full_name") val fullName: String,
    val email: String,
    val phone: String,
    val role: String = "customer",
    val status: String = "active",
    @SerialName("updated_at") val updatedAt: String
)
