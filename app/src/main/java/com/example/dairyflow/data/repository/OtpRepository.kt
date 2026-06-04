package com.example.dairyflow.data.repository

import android.content.Context
import com.example.dairyflow.core.SupabaseModule
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

class OtpRepository(context: Context) {
    private val appContext = context.applicationContext
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

    suspend fun sendWhatsAppOtp(
        phone: String,
        purpose: String,
        role: String,
        adminAccessCode: String? = null,
        deviceId: String? = null
    ): SendOtpResponse =
        callFunction(
            functionName = "send-whatsapp-otp",
            payload = SendOtpRequest(
                phone = normalizePhone(phone),
                purpose = purpose,
                role = role,
                adminAccessCode = adminAccessCode?.takeIf { it.isNotBlank() },
                deviceId = deviceId ?: appContext.packageName
            ),
            serializer = SendOtpRequest.serializer(),
            responseDeserializer = SendOtpResponse.serializer()
        )

    suspend fun verifyWhatsAppOtp(phone: String, otp: String): VerifyOtpResponse =
        callFunction(
            functionName = "verify-whatsapp-otp",
            payload = VerifyOtpRequest(normalizePhone(phone), otp.trim()),
            serializer = VerifyOtpRequest.serializer(),
            responseDeserializer = VerifyOtpResponse.serializer()
        )

    suspend fun verifyAdminWhatsAppLogin(phone: String, otp: String): VerifyAdminLoginResponse =
        callFunction(
            functionName = "verify-admin-whatsapp-login",
            payload = VerifyAdminLoginRequest(normalizePhone(phone), otp.trim(), appContext.packageName),
            serializer = VerifyAdminLoginRequest.serializer(),
            responseDeserializer = VerifyAdminLoginResponse.serializer()
        )

    private suspend fun <T, R> callFunction(
        functionName: String,
        payload: T,
        serializer: kotlinx.serialization.KSerializer<T>,
        responseDeserializer: kotlinx.serialization.KSerializer<R>
    ): R {
        val response = client.post("${SupabaseModule.functionsUrl}/$functionName") {
            contentType(ContentType.Application.Json)
            header("apikey", SupabaseModule.anonKey)
            header(HttpHeaders.Authorization, "Bearer ${SupabaseModule.anonKey}")
            setBody(json.encodeToString(serializer, payload))
        }
        val body = response.bodyAsText()
        if (!response.status.isSuccess()) {
            if (response.status.value == 404) {
                throw IllegalStateException("WhatsApp OTP service is not deployed. Please contact admin.")
            }
            val serverMessage = runCatching {
                json.decodeFromString(FunctionErrorResponse.serializer(), body).bestMessage
            }.getOrNull()
            throw IllegalStateException((serverMessage ?: body).toOtpErrorMessage())
        }
        return json.decodeFromString(responseDeserializer, body)
    }

    private fun normalizePhone(value: String): String {
        val digits = value.filter(Char::isDigit)
        return when {
            digits.length == 10 -> "91$digits"
            digits.startsWith("91") && digits.length == 12 -> digits
            else -> digits
        }
    }
}

@Serializable
data class SendOtpRequest(
    val phone: String,
    val purpose: String,
    val role: String,
    @SerialName("admin_access_code") val adminAccessCode: String? = null,
    @SerialName("device_id") val deviceId: String? = null
)

@Serializable
data class SendOtpResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerialName("normalized_phone") val normalizedPhone: String? = null,
    @SerialName("expires_in") val expiresIn: Int? = null
)

@Serializable
data class VerifyOtpRequest(
    val phone: String,
    val otp: String
)

@Serializable
data class VerifyAdminLoginRequest(
    val phone: String,
    val otp: String,
    @SerialName("device_id") val deviceId: String? = null
)

@Serializable
data class VerifyOtpResponse(
    val verified: Boolean = false,
    val message: String? = null,
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    @SerialName("token_type") val tokenType: String? = null
)

@Serializable
data class VerifyAdminLoginResponse(
    val success: Boolean = false,
    val role: String = "admin",
    val profile: ProfileSessionPayload? = null,
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    @SerialName("token_type") val tokenType: String? = null,
    val message: String? = null
)

@Serializable
private data class FunctionErrorResponse(
    val message: String? = null,
    val error: String? = null
) {
    val bestMessage: String?
        get() = message ?: error
}

private fun String.toOtpErrorMessage(): String {
    val cleaned = trim().take(240)
    val lower = cleaned.lowercase()
    return when {
        "expired" in lower -> "OTP expired."
        "admin" in lower && "code" in lower -> "Invalid admin access code."
        "verified" in lower -> "Phone not verified."
        "myoperator" in lower -> cleaned
        "unable to send whatsapp otp" in lower -> cleaned
        "missing edge function secret" in lower -> cleaned
        "invalid" in lower -> "Invalid OTP."
        cleaned.isNotBlank() -> cleaned
        else -> "Unable to process WhatsApp OTP. Please try again."
    }
}
