package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseModule
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.security.SecureRandom

class QrLoginRepository(private val supabase: SupabaseClient) {
    private val random = SecureRandom()
    private val client = HttpClient(Android) {
        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 30_000
        }
    }
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun generateRawQrToken(): String {
        val bytes = ByteArray(32)
        random.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun buildQrPayload(rawToken: String): String = "$QR_PREFIX$rawToken"

    fun parseQrPayload(qrText: String): String? {
        val trimmed = qrText.trim()
        return when {
            trimmed.startsWith(QR_PREFIX) -> trimmed.removePrefix(QR_PREFIX).takeIf { it.isNotBlank() }
            trimmed.length >= 32 && trimmed.all { it.isLetterOrDigit() } -> trimmed
            else -> null
        }
    }

    suspend fun createDeliveryBoyQrToken(
        deliveryBoyId: String,
        rawToken: String,
        expiryMinutes: Int = DEFAULT_EXPIRY_MINUTES,
        qrLabel: String? = null
    ): DeliveryQrTokenResponse =
        supabase.postgrest.rpc(
            "admin_create_delivery_qr_token",
            CreateDeliveryQrTokenParams(
                deliveryBoyId = deliveryBoyId,
                rawToken = rawToken,
                expiresMinutes = expiryMinutes,
                qrLabel = qrLabel
            )
        ).decodeSingle()

    suspend fun verifyDeliveryQrLogin(qrText: String, deviceId: String): VerifyQrLoginResponse {
        val rawToken = parseQrPayload(qrText) ?: throw IllegalArgumentException("Invalid DairyFlow QR")
        val response = client.post("${SupabaseModule.functionsUrl}/verify-delivery-qr-login") {
            contentType(ContentType.Application.Json)
            header("apikey", SupabaseModule.anonKey)
            header(HttpHeaders.Authorization, "Bearer ${SupabaseModule.anonKey}")
            setBody(json.encodeToString(VerifyQrLoginRequest.serializer(), VerifyQrLoginRequest(rawToken, deviceId)))
        }
        val body = response.bodyAsText()
        if (!response.status.isSuccess()) {
            val message = runCatching { json.decodeFromString(QrFunctionErrorResponse.serializer(), body).message }.getOrNull()
            throw IllegalStateException(message ?: body.ifBlank { "Unable to verify QR login." })
        }
        return json.decodeFromString(VerifyQrLoginResponse.serializer(), body)
    }

    companion object {
        const val QR_PREFIX = "DAIRYFLOW_QR:"
        const val DEFAULT_EXPIRY_MINUTES = 1440
    }
}

@Serializable
private data class CreateDeliveryQrTokenParams(
    @SerialName("p_delivery_boy_id") val deliveryBoyId: String,
    @SerialName("p_raw_token") val rawToken: String,
    @SerialName("p_expires_minutes") val expiresMinutes: Int,
    @SerialName("p_qr_label") val qrLabel: String? = null
)

@Serializable
data class DeliveryQrTokenResponse(
    @SerialName("token_id") val tokenId: String,
    @SerialName("expires_at") val expiresAt: String
)

@Serializable
private data class VerifyQrLoginRequest(
    @SerialName("qr_token") val qrToken: String,
    @SerialName("device_id") val deviceId: String? = null
)

@Serializable
data class VerifyQrLoginResponse(
    val success: Boolean = false,
    val role: String = "delivery_boy",
    val profile: ProfileSessionPayload? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("assigned_route_id") val assignedRouteId: String? = null,
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    @SerialName("token_type") val tokenType: String? = null,
    val message: String? = null
)

@Serializable
data class ProfileSessionPayload(
    val id: String,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("dairy_name") val dairyName: String? = null,
    val email: String? = null,
    @SerialName("auth_email") val authEmail: String? = null,
    val phone: String? = null,
    @SerialName("normalized_phone") val normalizedPhone: String? = null,
    val role: String,
    val status: String = "active"
)

@Serializable
private data class QrFunctionErrorResponse(
    val message: String? = null,
    val error: String? = null
)
