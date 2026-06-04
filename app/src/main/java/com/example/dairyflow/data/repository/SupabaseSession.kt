package com.example.dairyflow.data.repository

import android.util.Log
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.exceptions.RestException
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.Locale

const val SESSION_EXPIRED_MESSAGE = "Session expired. Please login again."
const val ADMIN_ONLY_MESSAGE = "Admin access is required."
const val DELIVERY_BOY_ONLY_MESSAGE = "Delivery boy access is required."

fun SupabaseClient.requireCurrentUserId(
    table: String? = null,
    operation: String? = null,
    payloadKeys: Set<String> = emptySet()
): String {
    val userId = auth.currentUserOrNull()?.id
    if (userId != null) return userId
    Log.e(
        "SupabaseConfigError",
        buildString {
            append("Missing Supabase auth session")
            table?.let { append(" table=").append(it) }
            operation?.let { append(" operation=").append(it) }
            appendPayloadKeys(payloadKeys)
        }
    )
    throw IllegalStateException(SESSION_EXPIRED_MESSAGE)
}

@Serializable
data class SessionProfileRow(
    val id: String,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("admin_access_code") val adminAccessCode: String? = null,
    val role: String = "admin",
    val status: String = "active"
) {
    val normalizedRole: String get() = role.lowercase(Locale.US)
    val isAdmin: Boolean get() = normalizedRole == "admin"
    val isDeliveryBoy: Boolean get() = normalizedRole == "delivery_boy"
    val isActive: Boolean get() = status.equals("active", ignoreCase = true)
}

suspend fun SupabaseClient.requireCurrentProfile(
    table: String? = null,
    operation: String? = null,
    payloadKeys: Set<String> = emptySet()
): SessionProfileRow {
    val userId = requireCurrentUserId(table, operation, payloadKeys)
    return try {
        from(SupabaseTables.PROFILES).select {
            filter { eq("id", userId) }
        }.decodeSingle<SessionProfileRow>()
    } catch (e: Exception) {
        logSupabaseFailure(
            tag = "ProfileLoadError",
            table = SupabaseTables.PROFILES,
            operation = "load current profile for ${operation ?: "operation"}",
            payloadKeys = payloadKeys,
            error = e
        )
        throw IllegalStateException("Profile not found. Please sign in again.")
    }
}

suspend fun SupabaseClient.requireTenantAdminId(
    table: String? = null,
    operation: String? = null,
    payloadKeys: Set<String> = emptySet()
): String {
    val profile = requireCurrentProfile(table, operation, payloadKeys)
    require(profile.isActive) { "This account is inactive." }
    return when {
        profile.isAdmin -> profile.id
        profile.isDeliveryBoy -> profile.adminId ?: throw IllegalStateException("Delivery boy is not linked to an admin.")
        else -> throw IllegalStateException("This role is not allowed to access dairy data.")
    }
}

suspend fun SupabaseClient.requireAdminId(
    table: String? = null,
    operation: String? = null,
    payloadKeys: Set<String> = emptySet()
): String {
    val profile = requireCurrentProfile(table, operation, payloadKeys)
    require(profile.isActive) { "This account is inactive." }
    if (!profile.isAdmin) throw IllegalStateException(ADMIN_ONLY_MESSAGE)
    return profile.id
}

suspend fun SupabaseClient.requireDeliveryBoyProfile(
    table: String? = null,
    operation: String? = null,
    payloadKeys: Set<String> = emptySet()
): SessionProfileRow {
    val profile = requireCurrentProfile(table, operation, payloadKeys)
    require(profile.isActive) { "This account is inactive." }
    if (!profile.isDeliveryBoy) throw IllegalStateException(DELIVERY_BOY_ONLY_MESSAGE)
    if (profile.adminId.isNullOrBlank() || profile.deliveryBoyId.isNullOrBlank()) {
        throw IllegalStateException("Delivery boy is not linked to an admin route yet.")
    }
    return profile
}

suspend inline fun <T> loggedSupabaseCall(
    tag: String,
    table: String,
    operation: String,
    payloadKeys: Set<String> = emptySet(),
    crossinline block: suspend () -> T
): T {
    return try {
        block()
    } catch (e: Exception) {
        logSupabaseFailure(tag, table, operation, payloadKeys, e)
        throw e
    }
}

fun logSupabaseFailure(
    tag: String,
    table: String,
    operation: String,
    payloadKeys: Set<String> = emptySet(),
    error: Throwable
) {
    val message = buildString {
        append("table=").append(table)
        append(" operation=").append(operation)
        appendPayloadKeys(payloadKeys)
        append(" exception=").append(error.javaClass.simpleName)
        error.message?.lineSequence()?.firstOrNull()?.let { append(" message=").append(it) }
        when (error) {
            is PostgrestRestException -> {
                append(" status=").append(error.statusCode)
                append(" code=").append(error.code)
                append(" hint=").append(error.hint)
                append(" details=").append(error.details)
            }
            is RestException -> {
                append(" status=").append(error.statusCode)
                append(" restError=").append(error.error)
                append(" description=").append(error.description)
            }
        }
    }
    Log.e(tag, message)
    if (error.isLikelySchemaError()) {
        Log.e("SupabaseSchemaError", message)
    }
}

private fun Throwable.isLikelySchemaError(): Boolean =
    message.orEmpty().contains("schema", ignoreCase = true) ||
        message.orEmpty().contains("column", ignoreCase = true) ||
        message.orEmpty().contains("relation", ignoreCase = true) ||
        message.orEmpty().contains("policy", ignoreCase = true) ||
        (this as? PostgrestRestException)?.code in setOf("42P01", "42703", "42501", "PGRST204")

private fun StringBuilder.appendPayloadKeys(payloadKeys: Set<String>) {
    if (payloadKeys.isNotEmpty()) {
        append(" payloadKeys=").append(payloadKeys.sorted().joinToString(prefix = "[", postfix = "]"))
    }
}
