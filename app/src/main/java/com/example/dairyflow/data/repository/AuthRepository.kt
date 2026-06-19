package com.example.dairyflow.data.repository

import android.net.Uri
import android.util.Log
import com.example.dairyflow.BuildConfig
import com.example.dairyflow.core.SupabaseModule
import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.ProfileDetails
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.parseSessionFromUrl
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.put
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class AuthRepository(
    private val supabase: SupabaseClient,
    private val otpRepository: OtpRepository,
    private val qrLoginRepository: QrLoginRepository,
    private val secureSessionStore: SecureSessionStore
) {
    companion object {
        private const val TAG = "AuthRepository"
        private const val EMAIL_CONFIRMATION_REDIRECT_URL = SupabaseModule.AUTH_CALLBACK_URL
        private const val AUTH_ERROR_TAG = "SupabaseAuthError"
        private const val TEST_DELIVERY_QR_TOKEN = "TEST_DELIVERY_LOGIN"
        private val CODE_RANDOM = SecureRandom()
        private const val CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    }

    suspend fun restoreSession(): ProfileDetails? {
        supabase.auth.awaitInitialization()
        if (supabase.auth.currentSessionOrNull() == null) {
            if (secureSessionStore.loadSessionOrNull() != null) {
                runCatching { supabase.auth.loadFromStorage(autoRefresh = true) }
            }
            runCatching { supabase.auth.refreshCurrentSession() }
        }
        return currentProfile() ?: secureSessionStore.loadProfile()
    }

    fun cachedProfile(): ProfileDetails? = secureSessionStore.loadProfile()

    suspend fun sendWhatsAppOtp(
        phone: String,
        purpose: String,
        role: String,
        adminAccessCode: String? = null
    ): SendOtpResponse =
        otpRepository.sendWhatsAppOtp(phone, purpose, role, adminAccessCode)

    suspend fun verifyWhatsAppOtp(phone: String, otp: String): VerifyOtpResponse =
        otpRepository.verifyWhatsAppOtp(phone, otp)

    suspend fun requestWhatsAppLoginOtp(phone: String): SendOtpResponse =
        otpRepository.requestWhatsAppLoginOtp(phone)

    suspend fun verifyWhatsAppLoginOtp(phone: String, otp: String): ProfileDetails {
        val result = otpRepository.verifyWhatsAppLoginOtp(phone, otp)
        if (!result.verified) throw InvalidOtpException(result.message ?: "Invalid OTP.")
        importSessionOrThrow(result.accessToken, result.refreshToken, "WhatsApp OTP login did not return a session.")
        val profile = result.profile?.toProfileDetails() ?: loadCurrentProfile()
        return profile?.also { secureSessionStore.saveProfile(it) }
            ?: throw ProfileCreationFailedException()
    }

    suspend fun sendAdminWhatsAppOtp(phone: String): SendOtpResponse =
        if (testAdminLoginFor(phone) != null) {
            SendOtpResponse(
                success = true,
                message = "Testing OTP ready.",
                normalizedPhone = normalizePhone(phone),
                expiresIn = 300
            )
        } else {
            requestWhatsAppLoginOtp(phone)
        }

    suspend fun verifyAdminWhatsAppLogin(phone: String, otp: String): ProfileDetails {
        testAdminLoginFor(phone)?.takeIf { it.otp == otp }?.let { login ->
            return signInAdmin(login.email, login.password)
        }
        val profile = verifyWhatsAppLoginOtp(phone, otp)
        if (!profile.role.equals("admin", ignoreCase = true)) {
            signOut()
            throw InvalidRoleForLoginException("This account is not an admin account.")
        }
        return profile.also { secureSessionStore.saveProfile(it) }
    }

    suspend fun verifyDeliveryQrLogin(qrText: String, deviceId: String): ProfileDetails {
        if (isTestDeliveryQr(qrText)) {
            return signInTestDeliveryBoy()
        }
        val result = qrLoginRepository.verifyDeliveryQrLogin(qrText, deviceId)
        importSessionOrThrow(result.accessToken, result.refreshToken, "QR login did not return a session.")
        val profile = result.profile?.toProfileDetails() ?: loadCurrentProfile()
        return profile?.also { secureSessionStore.saveProfile(it) }
            ?: throw ProfileCreationFailedException()
    }

    suspend fun signInWithPhoneOtp(phone: String, otp: String): ProfileDetails {
        val result = verifyWhatsAppOtp(phone, otp)
        if (!result.verified) throw InvalidOtpException(result.message ?: "Invalid OTP.")
        importSessionOrThrow(result.accessToken, result.refreshToken, "Phone OTP login did not return a session.")
        return loadCurrentProfile() ?: throw ProfileCreationFailedException()
    }

    suspend fun resetPasswordWithWhatsAppOtp(phone: String, otp: String, newPassword: String) {
        signInWithPhoneOtp(phone, otp)
        supabase.auth.updateUser {
            password = newPassword
        }
        signOut()
    }

    suspend fun signIn(email: String, password: String): Boolean {
        signInAdmin(email, password)
        return isSignedIn()
    }

    suspend fun signInWithEmailPassword(email: String, password: String): ProfileDetails {
        supabase.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        return loadCurrentProfile() ?: throw ProfileCreationFailedException()
    }

    suspend fun signInAdmin(email: String, password: String): ProfileDetails {
        val profile = signInWithEmailPassword(email, password)
        if (!profile.role.equals("admin", ignoreCase = true)) {
            supabase.auth.signOut()
            throw InvalidRoleForLoginException("This account is not an admin account.")
        }
        return profile
    }

    suspend fun signInDeliveryBoy(email: String, password: String, adminAccessCode: String): ProfileDetails {
        val code = normalizeAccessCode(adminAccessCode)
        require(code.isNotBlank()) { "Admin access code is required." }
        val profile = signInWithEmailPassword(email, password)
        if (!profile.role.equals("delivery_boy", ignoreCase = true)) {
            supabase.auth.signOut()
            throw InvalidRoleForLoginException("This account is not a delivery boy account.")
        }
        val admin = findAdminByAccessCode(code) ?: run {
            supabase.auth.signOut()
            throw InvalidAdminAccessCodeException()
        }
        if (profile.adminId != admin.id) throw InvalidAdminAccessCodeException()
        return profile
    }

    suspend fun signUp(fullName: String, email: String, mobile: String, password: String): Boolean {
        signUpAdmin(fullName, "", mobile, email, password)
        return isSignedIn()
    }

    suspend fun signUpAdmin(ownerName: String, dairyName: String, phone: String, email: String, password: String): ProfileDetails {
        val userId = createAuthUser(ownerName, phone, email, password, "admin")
        supabase.postgrest.rpc(
            "create_admin_profile",
            CreateAdminProfileParams(
                fullName = ownerName,
                dairyName = dairyName,
                email = email,
                phone = normalizePhone(phone)
            )
        )
        return loadCurrentProfile() ?: loadProfileOrNull(userId) ?: throw ProfileCreationFailedException()
    }

    suspend fun signUpDeliveryBoy(name: String, phone: String, email: String, password: String, adminAccessCode: String): ProfileDetails {
        val userId = createAuthUser(name, phone, email, password, "delivery_boy")
        supabase.postgrest.rpc(
            "create_delivery_boy_profile",
            CreateDeliveryBoyProfileParams(
                fullName = name,
                email = email,
                phone = normalizePhone(phone),
                adminAccessCode = normalizeAccessCode(adminAccessCode)
            )
        )
        return loadCurrentProfile() ?: loadProfileOrNull(userId) ?: throw ProfileCreationFailedException()
    }

    private suspend fun createAuthUser(fullName: String, phone: String, email: String, password: String, role: String): String {
        supabase.auth.signUpWith(Email, redirectUrl = null) {
            this.email = email
            this.password = password
            data = buildJsonObject {
                put("full_name", fullName)
                put("phone", normalizePhone(phone))
                put("role", role)
            }
        }
        val user = supabase.auth.currentUserOrNull()
            ?: throw EmailConfirmationRequiredException("Account created. Please login after verification is complete.")
        return user.id
    }

    suspend fun handleAuthCallback(url: String): AuthCallbackResult {
        val callback = AuthCallbackPayload.from(url)
        callback.errorMessage?.let { message ->
            Log.e(
                AUTH_ERROR_TAG,
                "Auth callback returned an error. queryKeys=${callback.queryKeys} fragmentKeys=${callback.fragmentKeys} error=$message"
            )
            throw AuthCallbackFailedException()
        }

        return runCatching {
            when {
                callback.code != null -> {
                    supabase.auth.exchangeCodeForSession(callback.code)
                    upsertCurrentUserProfile()
                    AuthCallbackResult.SignedIn
                }
                callback.hasSessionFragment -> {
                    val session = supabase.auth.parseSessionFromUrl(url)
                    supabase.auth.importSession(session)
                    supabase.auth.retrieveUserForCurrentSession(updateSession = true)
                    upsertCurrentUserProfile()
                    AuthCallbackResult.SignedIn
                }
                else -> {
                    Log.w(
                        AUTH_ERROR_TAG,
                        "Auth callback did not include a code or session fragment. queryKeys=${callback.queryKeys} fragmentKeys=${callback.fragmentKeys}"
                    )
                    AuthCallbackResult.ConfirmedNoSession
                }
            }
        }.onFailure {
            Log.e(
                AUTH_ERROR_TAG,
                "Failed to process auth callback. queryKeys=${callback.queryKeys} fragmentKeys=${callback.fragmentKeys} exception=${it::class.simpleName} message=${it.message?.lineForLog()}",
                it
            )
        }.getOrThrow()
    }

    suspend fun signOut() {
        supabase.auth.signOut()
        secureSessionStore.clearAll()
    }

    fun isSignedIn(): Boolean = supabase.auth.currentUserOrNull() != null

    fun currentUserEmail(): String? = supabase.auth.currentUserOrNull()?.email

    suspend fun currentProfile(): ProfileDetails? {
        val user = supabase.auth.currentUserOrNull() ?: return null
        return runCatching {
            supabase.from(SupabaseTables.PROFILES).select {
                filter { eq("id", user.id) }
            }.decodeSingle<ProfileDetails>()
        }.onSuccess {
            secureSessionStore.saveProfile(it)
        }.getOrElse {
            secureSessionStore.loadProfile() ?: ProfileDetails(id = user.id, email = user.email, role = "admin")
        }
    }

    suspend fun loadCurrentProfile(): ProfileDetails? = currentProfile()

    private suspend fun loadProfileOrNull(userId: String): ProfileDetails? =
        runCatching {
            supabase.from(SupabaseTables.PROFILES).select {
                filter { eq("id", userId) }
            }.decodeSingle<ProfileDetails>()
        }.getOrNull()

    private suspend fun findAdminByAccessCode(code: String): ProfileDetails? =
        runCatching {
            supabase.from(SupabaseTables.PROFILES).select {
                filter {
                    eq("role", "admin")
                    eq("admin_access_code", code)
                    eq("status", "active")
                }
            }.decodeList<ProfileDetails>().firstOrNull()
        }.getOrNull()

    private suspend fun upsertProfile(profile: ProfileUpsert) {
        supabase.from(SupabaseTables.PROFILES).upsert(profile) {
            onConflict = "id"
        }
    }

    private suspend fun ensureAdminAccessCode(profileId: String) {
        val code = generateAdminAccessCode()
        supabase.from(SupabaseTables.PROFILES).update(
            {
                set("admin_access_code", code)
                set("admin_id", profileId)
                set("updated_at", timestampNow())
            }
        ) {
            filter { eq("id", profileId) }
        }
    }

    private suspend fun upsertCurrentUserProfile() {
        val user = supabase.auth.currentUserOrNull()
            ?: supabase.auth.retrieveUserForCurrentSession(updateSession = true)
        val metadata = user.userMetadata
        val existing = loadProfileOrNull(user.id)
        val role = existing?.role ?: "admin"
        upsertProfile(
            ProfileUpsert(
                userId = user.id,
                fullName = existing?.fullName
                    ?: metadata.textValue("full_name")
                    ?: user.email?.substringBefore("@")?.ifBlank { null }
                    ?: "Admin",
                email = user.email.orEmpty(),
                phone = existing?.phone ?: metadata.textValue("phone") ?: user.phone.orEmpty(),
                role = role,
                adminId = existing?.adminId ?: user.id,
                deliveryBoyId = existing?.deliveryBoyId,
                adminAccessCode = if (role.equals("admin", ignoreCase = true)) {
                    existing?.adminAccessCode ?: generateAdminAccessCode()
                } else {
                    null
                },
                updatedAt = timestampNow()
            )
        )
    }

    private suspend fun generateAdminAccessCode(): String {
        repeat(6) {
            val code = "DF-" + buildString {
                repeat(6) {
                    append(CODE_ALPHABET[CODE_RANDOM.nextInt(CODE_ALPHABET.length)])
                }
            }
            val exists = findAdminByAccessCode(code) != null
            if (!exists) return code
        }
        return "DF-" + Date().time.toString().takeLast(6)
    }

    private fun normalizeAccessCode(value: String): String =
        value.trim().uppercase(Locale.US).replace(" ", "")

    private fun normalizePhone(value: String): String {
        val digits = value.filter(Char::isDigit)
        return when {
            digits.length == 10 -> "91$digits"
            digits.startsWith("91") && digits.length == 12 -> digits
            else -> digits
        }
    }

    private fun testAdminLoginFor(phone: String): TestAdminLogin? {
        if (!BuildConfig.DEBUG) return null
        val normalizedPhone = normalizePhone(phone)
        return configuredTestAdminLogins()
            .firstOrNull { normalizePhone(it.phone) == normalizedPhone }
    }

    private fun configuredTestAdminLogins(): List<TestAdminLogin> =
        BuildConfig.TEST_ADMIN_LOGINS
            .split(";")
            .mapNotNull { rawLogin ->
                val parts = rawLogin.split("|")
                if (parts.size != 4) return@mapNotNull null
                TestAdminLogin(
                    phone = parts[0],
                    otp = parts[1],
                    email = parts[2],
                    password = parts[3]
                ).takeIf {
                    it.phone.isNotBlank() &&
                        it.otp.isNotBlank() &&
                        it.email.isNotBlank() &&
                        it.password.isNotBlank()
                }
            }

    private fun isTestDeliveryQr(qrText: String): Boolean {
        if (!BuildConfig.DEBUG) return false
        val trimmed = qrText.trim()
        return trimmed == TEST_DELIVERY_QR_TOKEN ||
            trimmed == "${QrLoginRepository.QR_PREFIX}$TEST_DELIVERY_QR_TOKEN"
    }

    private suspend fun signInTestDeliveryBoy(): ProfileDetails {
        val admin = signInAdmin(BuildConfig.TEST_ADMIN_EMAIL, BuildConfig.TEST_ADMIN_PASSWORD)
        return ProfileDetails(
            id = admin.id,
            adminId = admin.id,
            deliveryBoyId = "debug-delivery-boy",
            adminAccessCode = admin.adminAccessCode,
            fullName = "Test Delivery Boy",
            dairyName = admin.dairyName,
            email = admin.email,
            authEmail = admin.authEmail,
            phone = BuildConfig.TEST_ADMIN_PHONE,
            normalizedPhone = normalizePhone(BuildConfig.TEST_ADMIN_PHONE),
            role = "delivery_boy",
            phoneVerified = true,
            loginEnabled = true,
            qrLoginEnabled = true,
            seededByDeveloper = true,
            lastLoginMethod = "debug_qr",
            status = "active"
        ).also { secureSessionStore.saveProfile(it) }
    }

    private fun timestampNow(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        return formatter.format(Date())
    }

    private suspend fun importSessionOrThrow(accessToken: String?, refreshToken: String?, message: String) {
        val token = accessToken ?: throw IllegalStateException(message)
        supabase.auth.importAuthToken(
            accessToken = token,
            refreshToken = refreshToken.orEmpty(),
            retrieveUser = true,
            autoRefresh = true
        )
    }
}

private data class TestAdminLogin(
    val phone: String,
    val otp: String,
    val email: String,
    val password: String
)

sealed interface AuthCallbackResult {
    data object SignedIn : AuthCallbackResult
    data object ConfirmedNoSession : AuthCallbackResult
}

class AuthCallbackFailedException : Exception(
    "Unable to confirm email. Please request a new confirmation email and try again."
)

class ProfileCreationFailedException : Exception(
    "Account was created, but profile setup failed. Please contact admin."
)

class EmailConfirmationRequiredException(message: String = "Account created. Please login to continue.") : Exception(message)

class InvalidAdminAccessCodeException : Exception(
    "Invalid admin access code."
)

class InvalidOtpException(message: String) : Exception(message)

class InvalidRoleForLoginException(message: String) : Exception(message)

@Serializable
private data class CreateAdminProfileParams(
    @SerialName("full_name") val fullName: String,
    @SerialName("dairy_name") val dairyName: String,
    val email: String,
    val phone: String
)

@Serializable
private data class CreateDeliveryBoyProfileParams(
    @SerialName("full_name") val fullName: String,
    val email: String,
    val phone: String,
    @SerialName("admin_access_code") val adminAccessCode: String
)

@Serializable
private data class ProfileUpsert(
    @SerialName("id") val userId: String,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("admin_access_code") val adminAccessCode: String? = null,
    @SerialName("full_name") val fullName: String,
    val email: String,
    val phone: String,
    val role: String = "admin",
    val status: String = "active",
    @SerialName("updated_at") val updatedAt: String
)

private data class AuthCallbackPayload(
    val code: String?,
    val errorMessage: String?,
    val hasSessionFragment: Boolean,
    val queryKeys: Set<String>,
    val fragmentKeys: Set<String>
) {
    companion object {
        fun from(url: String): AuthCallbackPayload {
            val uri = Uri.parse(url)
            val fragmentParams = parseParameters(uri.fragment)
            val queryNames = uri.queryParameterNames
            val errorMessage = listOfNotNull(
                uri.getQueryParameter("error_description"),
                uri.getQueryParameter("error"),
                uri.getQueryParameter("error_code"),
                fragmentParams["error_description"],
                fragmentParams["error"],
                fragmentParams["error_code"]
            ).firstOrNull { it.isNotBlank() }

            return AuthCallbackPayload(
                code = uri.getQueryParameter("code") ?: fragmentParams["code"],
                errorMessage = errorMessage,
                hasSessionFragment = fragmentParams.containsKey("access_token") &&
                    fragmentParams.containsKey("refresh_token"),
                queryKeys = queryNames,
                fragmentKeys = fragmentParams.keys
            )
        }

        private fun parseParameters(raw: String?): Map<String, String> {
            if (raw.isNullOrBlank()) return emptyMap()
            return raw
                .trimStart('#', '?')
                .split("&")
                .mapNotNull { part ->
                    val separator = part.indexOf("=")
                    if (separator <= 0) return@mapNotNull null
                    decode(part.substring(0, separator)) to decode(part.substring(separator + 1))
                }
                .toMap()
        }

        private fun decode(value: String): String =
            URLDecoder.decode(value, StandardCharsets.UTF_8.name())
    }
}

private fun JsonObject?.textValue(key: String): String? =
    (this?.get(key) as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }

private fun String.lineForLog(): String = lineSequence().firstOrNull().orEmpty()

fun ProfileSessionPayload.toProfileDetails(): ProfileDetails =
    ProfileDetails(
        id = id,
        adminId = adminId,
        deliveryBoyId = deliveryBoyId,
        fullName = fullName,
        dairyName = dairyName,
        email = email ?: authEmail,
        authEmail = authEmail,
        phone = phone,
        normalizedPhone = normalizedPhone,
        role = role,
        status = status
    )
