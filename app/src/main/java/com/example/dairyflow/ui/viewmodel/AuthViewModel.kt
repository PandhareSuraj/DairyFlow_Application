package com.example.dairyflow.ui.viewmodel

import android.util.Log
import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.BuildConfig
import com.example.dairyflow.data.model.ProfileDetails
import com.example.dairyflow.data.repository.AuthCallbackFailedException
import com.example.dairyflow.data.repository.AuthCallbackResult
import com.example.dairyflow.data.repository.AuthRepository
import com.example.dairyflow.data.repository.EmailConfirmationRequiredException
import com.example.dairyflow.data.repository.InvalidAdminAccessCodeException
import com.example.dairyflow.data.repository.InvalidOtpException
import com.example.dairyflow.data.repository.InvalidRoleForLoginException
import com.example.dairyflow.data.repository.ProfileCreationFailedException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthScreenState(
    val isLoading: Boolean = false,
    val isSignedIn: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val email: String? = null,
    val fieldErrors: SignupFieldErrors = SignupFieldErrors(),
    val profile: ProfileDetails? = null,
    val otpSent: Boolean = false,
    val otpVerified: Boolean = false
)

data class SignupFieldErrors(
    val fullName: String? = null,
    val dairyName: String? = null,
    val email: String? = null,
    val mobile: String? = null,
    val password: String? = null,
    val confirmPassword: String? = null,
    val adminAccessCode: String? = null
) {
    val hasErrors: Boolean
        get() = listOf(fullName, dairyName, email, mobile, password, confirmPassword, adminAccessCode).any { it != null }
}

class AuthViewModel(private val repository: AuthRepository) : ViewModel() {
    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val _state = MutableStateFlow(
        AuthScreenState(
            isSignedIn = repository.isSignedIn(),
            email = repository.currentUserEmail(),
            profile = repository.cachedProfile()
        )
    )
    val state: StateFlow<AuthScreenState> = _state.asStateFlow()

    fun restoreSession() = viewModelScope.launch {
        val cached = repository.cachedProfile()
        if (cached != null) {
            _state.value = _state.value.copy(
                isSignedIn = repository.isSignedIn(),
                profile = cached,
                email = cached.email ?: repository.currentUserEmail()
            )
        }
        _state.value = _state.value.copy(isLoading = true, error = null)
        _state.value = runCatching { repository.restoreSession() }.fold(
            onSuccess = { profile ->
                _state.value.copy(
                    isLoading = false,
                    isSignedIn = repository.isSignedIn(),
                    email = profile?.email ?: repository.currentUserEmail(),
                    profile = profile ?: _state.value.profile
                )
            },
            onFailure = {
                Log.w(TAG, "Session restore failed", it)
                _state.value.copy(isLoading = false, isSignedIn = repository.isSignedIn())
            }
        )
    }

    fun signIn(email: String, password: String) = viewModelScope.launch {
        when {
            email.isBlank() -> _state.value = _state.value.copy(error = "Email is required.")
            password.isBlank() -> _state.value = _state.value.copy(error = "Password is required.")
            else -> {
                _state.value = _state.value.copy(isLoading = true, error = null, message = null)
                _state.value = runCatching { repository.signInAdmin(email.trim(), password) }.fold(
                    onSuccess = { profile -> AuthScreenState(isSignedIn = true, email = profile.email, profile = profile) },
                    onFailure = {
                        Log.w(TAG, "Sign in failed", it)
                        AuthScreenState(isSignedIn = false, error = it.signInMessage())
                    }
                )
            }
        }
    }

    fun signInDeliveryBoy(email: String, password: String, adminAccessCode: String) = viewModelScope.launch {
        when {
            email.isBlank() -> _state.value = _state.value.copy(error = "Email is required.")
            password.isBlank() -> _state.value = _state.value.copy(error = "Password is required.")
            adminAccessCode.isBlank() -> _state.value = _state.value.copy(error = "Admin access code is required.")
            else -> {
                _state.value = _state.value.copy(isLoading = true, error = null, message = null)
                _state.value = runCatching { repository.signInDeliveryBoy(email.trim(), password, adminAccessCode) }.fold(
                    onSuccess = { profile -> AuthScreenState(isSignedIn = true, email = profile.email, profile = profile) },
                    onFailure = {
                        Log.w(TAG, "Delivery boy sign in failed", it)
                        AuthScreenState(isSignedIn = false, error = it.signInMessage())
                    }
                )
            }
        }
    }

    fun sendOtp(phone: String, purpose: String, role: String, adminAccessCode: String? = null) = viewModelScope.launch {
        val normalizedPhone = phone.filter(Char::isDigit)
        if (normalizedPhone.length != 10 && !(normalizedPhone.startsWith("91") && normalizedPhone.length == 12)) {
            _state.value = _state.value.copy(error = "Mobile number must be 10 digits.")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null, otpSent = false, otpVerified = false)
        _state.value = runCatching { repository.sendWhatsAppOtp(phone, purpose, role, adminAccessCode) }.fold(
            onSuccess = {
                _state.value.copy(
                    isLoading = false,
                    otpSent = it.success,
                    message = it.message ?: "OTP sent on WhatsApp."
                )
            },
            onFailure = {
                Log.w(TAG, "Send OTP failed", it)
                _state.value.copy(isLoading = false, error = it.otpMessage())
            }
        )
    }

    fun verifyOtp(phone: String, otp: String) = viewModelScope.launch {
        if (otp.length != 6) {
            _state.value = _state.value.copy(error = "Enter the 6 digit OTP.")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null)
        _state.value = runCatching { repository.verifyWhatsAppOtp(phone, otp) }.fold(
            onSuccess = {
                _state.value.copy(
                    isLoading = false,
                    otpVerified = it.verified,
                    message = if (it.verified) "Phone verified." else null,
                    error = if (it.verified) null else "Invalid OTP."
                )
            },
            onFailure = {
                Log.w(TAG, "Verify OTP failed", it)
                _state.value.copy(isLoading = false, error = it.otpMessage())
            }
        )
    }

    fun signInWithPhoneOtp(phone: String, otp: String) = viewModelScope.launch {
        _state.value = _state.value.copy(isLoading = true, error = null, message = null)
        _state.value = runCatching { repository.signInWithPhoneOtp(phone, otp) }.fold(
            onSuccess = { profile -> AuthScreenState(isSignedIn = true, email = profile.email, profile = profile, otpVerified = true) },
            onFailure = {
                Log.w(TAG, "Phone OTP login failed", it)
                AuthScreenState(isSignedIn = false, error = it.otpMessage())
            }
        )
    }

    fun requestWhatsAppLoginOtp(phone: String) = viewModelScope.launch {
        val normalizedPhone = phone.filter(Char::isDigit)
        if (normalizedPhone.length != 10 && !(normalizedPhone.startsWith("91") && normalizedPhone.length == 12)) {
            _state.value = _state.value.copy(error = "Mobile number must be 10 digits.")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null, otpSent = false, otpVerified = false)
        _state.value = runCatching { repository.requestWhatsAppLoginOtp(phone) }.fold(
            onSuccess = {
                _state.value.copy(
                    isLoading = false,
                    otpSent = it.success,
                    message = it.message ?: "OTP sent on WhatsApp."
                )
            },
            onFailure = {
                Log.w(TAG, "Request WhatsApp login OTP failed", it)
                _state.value.copy(isLoading = false, error = it.otpMessage())
            }
        )
    }

    fun verifyWhatsAppLoginOtp(phone: String, otp: String) = viewModelScope.launch {
        if (otp.length != 6) {
            _state.value = _state.value.copy(error = "Enter the 6 digit OTP.")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null)
        _state.value = runCatching { repository.verifyWhatsAppLoginOtp(phone, otp) }.fold(
            onSuccess = { profile -> AuthScreenState(isSignedIn = true, email = profile.email, profile = profile, otpVerified = true) },
            onFailure = {
                Log.w(TAG, "WhatsApp OTP login failed", it)
                AuthScreenState(isSignedIn = false, error = it.otpMessage())
            }
        )
    }

    fun sendAdminWhatsAppOtp(phone: String) = viewModelScope.launch {
        val normalizedPhone = phone.filter(Char::isDigit)
        if (normalizedPhone.length != 10 && !(normalizedPhone.startsWith("91") && normalizedPhone.length == 12)) {
            _state.value = _state.value.copy(error = "Invalid mobile number")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null, otpSent = false)
        _state.value = runCatching { repository.sendAdminWhatsAppOtp(phone) }.fold(
            onSuccess = {
                _state.value.copy(
                    isLoading = false,
                    otpSent = it.success,
                    message = it.message ?: "OTP sent on WhatsApp."
                )
            },
            onFailure = {
                Log.w(TAG, "Send admin OTP failed", it)
                _state.value.copy(isLoading = false, error = it.otpMessage())
            }
        )
    }

    fun verifyAdminWhatsAppLogin(phone: String, otp: String) = viewModelScope.launch {
        if (otp.length != 6) {
            _state.value = _state.value.copy(error = "Enter the 6 digit OTP.")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null)
        _state.value = runCatching { repository.verifyAdminWhatsAppLogin(phone, otp) }.fold(
            onSuccess = { profile -> AuthScreenState(isSignedIn = true, email = profile.email, profile = profile, otpVerified = true) },
            onFailure = {
                Log.w(TAG, "Admin OTP login failed", it)
                AuthScreenState(isSignedIn = false, error = it.otpMessage())
            }
        )
    }

    fun verifyDeliveryQrLogin(qrText: String) = viewModelScope.launch {
        if (!qrText.trim().startsWith("DAIRYFLOW_QR:")) {
            _state.value = _state.value.copy(error = "Invalid DairyFlow QR")
            return@launch
        }
        _state.value = _state.value.copy(isLoading = true, error = null, message = null)
        _state.value = runCatching { repository.verifyDeliveryQrLogin(qrText, "android:${BuildConfig.APPLICATION_ID}") }.fold(
            onSuccess = { profile -> AuthScreenState(isSignedIn = true, email = profile.email, profile = profile) },
            onFailure = {
                Log.w(TAG, "Delivery QR login failed", it)
                AuthScreenState(isSignedIn = false, error = it.qrLoginMessage())
            }
        )
    }

    fun resetPasswordWithOtp(phone: String, otp: String, password: String, confirmPassword: String) = viewModelScope.launch {
        val normalizedPhone = phone.filter(Char::isDigit)
        val validPhone = normalizedPhone.length == 10 ||
            (normalizedPhone.startsWith("91") && normalizedPhone.length == 12)
        val fieldErrors = SignupFieldErrors(
            mobile = when {
                phone.isBlank() -> "Mobile number is required."
                !validPhone -> "Enter a valid WhatsApp number."
                else -> null
            },
            password = when {
                password.isBlank() -> "Password is required."
                password.length < 6 -> "Password must be at least 6 characters."
                else -> null
            },
            confirmPassword = when {
                confirmPassword.isBlank() -> "Confirm password is required."
                password != confirmPassword -> "Passwords do not match."
                else -> null
            }
        )
        when {
            fieldErrors.hasErrors -> _state.value = _state.value.copy(fieldErrors = fieldErrors, error = null, message = null)
            otp.length != 6 -> _state.value = _state.value.copy(error = "Enter the 6 digit OTP.")
            else -> {
                _state.value = _state.value.copy(isLoading = true, error = null, message = null, fieldErrors = SignupFieldErrors())
                _state.value = runCatching {
                    repository.resetPasswordWithWhatsAppOtp(phone, otp, password)
                }.fold(
                    onSuccess = {
                        AuthScreenState(message = "Password reset successfully. Please login.", otpVerified = true)
                    },
                    onFailure = {
                        Log.w(TAG, "Password reset failed", it)
                        AuthScreenState(error = it.otpMessage())
                    }
                )
            }
        }
    }

    fun signUp(fullName: String, email: String, mobile: String, password: String, confirmPassword: String) = viewModelScope.launch {
        signUpAdmin(fullName, "", email, mobile, password, confirmPassword)
    }

    fun signUpAdmin(fullName: String, dairyName: String, email: String, mobile: String, password: String, confirmPassword: String) = viewModelScope.launch {
        val normalizedPhone = mobile.filter(Char::isDigit)
        val fieldErrors = validateSignup(fullName, dairyName, email, mobile, normalizedPhone, password, confirmPassword, "admin", null)
        if (fieldErrors.hasErrors) {
            _state.value = _state.value.copy(isLoading = false, error = null, message = null, fieldErrors = fieldErrors)
            return@launch
        }
        if (!_state.value.otpVerified) {
            _state.value = _state.value.copy(error = "Phone not verified.")
            return@launch
        }

        _state.value = _state.value.copy(isLoading = true, error = null, message = null, fieldErrors = SignupFieldErrors())
        _state.value = runCatching {
            repository.signUpAdmin(fullName.trim(), dairyName.trim(), normalizedPhone, email.trim(), password)
        }.fold(
            onSuccess = { profile ->
                AuthScreenState(isSignedIn = true, email = profile.email, profile = profile, message = "Admin account created successfully.", otpVerified = true)
            },
            onFailure = {
                Log.w(TAG, "Create admin account failed", it)
                AuthScreenState(isSignedIn = false, error = it.createAccountMessage())
            }
        )
    }

    fun signUpDeliveryBoy(
        fullName: String,
        email: String,
        mobile: String,
        password: String,
        confirmPassword: String,
        adminAccessCode: String
    ) = viewModelScope.launch {
        val normalizedPhone = mobile.filter(Char::isDigit)
        val fieldErrors = validateSignup(fullName, "", email, mobile, normalizedPhone, password, confirmPassword, "delivery_boy", adminAccessCode)
        if (fieldErrors.hasErrors) {
            _state.value = _state.value.copy(isLoading = false, error = null, message = null, fieldErrors = fieldErrors)
            return@launch
        }
        if (!_state.value.otpVerified) {
            _state.value = _state.value.copy(error = "Phone not verified.")
            return@launch
        }

        _state.value = _state.value.copy(isLoading = true, error = null, message = null, fieldErrors = SignupFieldErrors())
        _state.value = runCatching {
            repository.signUpDeliveryBoy(fullName.trim(), normalizedPhone, email.trim(), password, adminAccessCode.trim())
        }.fold(
            onSuccess = { profile ->
                AuthScreenState(isSignedIn = true, email = profile.email, profile = profile, message = "Delivery boy account created successfully.", otpVerified = true)
            },
            onFailure = {
                Log.w(TAG, "Create delivery boy failed", it)
                AuthScreenState(isSignedIn = false, error = it.createAccountMessage())
            }
        )
    }

    fun signOut() = viewModelScope.launch {
        repository.signOut()
        _state.value = AuthScreenState(isSignedIn = false, message = "Signed out.")
    }

    fun refreshSession() {
        _state.value = _state.value.copy(
            isSignedIn = repository.isSignedIn(),
            email = repository.currentUserEmail()
        )
    }

    fun handleAuthCallback(url: String) = viewModelScope.launch {
        _state.value = _state.value.copy(isLoading = true, error = null, message = null)
        _state.value = runCatching { repository.handleAuthCallback(url) }.fold(
            onSuccess = { result ->
                when (result) {
                    AuthCallbackResult.SignedIn -> AuthScreenState(isSignedIn = true, email = repository.currentUserEmail())
                    AuthCallbackResult.ConfirmedNoSession -> AuthScreenState(isSignedIn = false, message = "Please login.")
                }
            },
            onFailure = {
                Log.w(TAG, "Auth callback failed", it)
                AuthScreenState(isSignedIn = repository.isSignedIn(), email = repository.currentUserEmail(), error = it.authCallbackMessage())
            }
        )
    }

    fun loadProfile() = viewModelScope.launch {
        _state.value = _state.value.copy(isLoading = true, error = null)
        _state.value = runCatching { repository.currentProfile() }.fold(
            onSuccess = {
                _state.value.copy(
                    isLoading = false,
                    profile = it,
                    email = it?.email ?: repository.currentUserEmail()
                )
            },
            onFailure = {
                Log.w(TAG, "Profile load failed", it)
                _state.value.copy(isLoading = false, error = "Unable to load profile.")
            }
        )
    }

    fun clearMessages() {
        _state.value = _state.value.copy(error = null, message = null)
    }

    fun showEmailConfirmedMessage() {
        _state.value = _state.value.copy(isSignedIn = repository.isSignedIn(), isLoading = false, error = null, message = "Please login.")
    }

    private fun Throwable.createAccountMessage(): String {
        val text = listOfNotNull(message, cause?.message).joinToString(" ").lowercase()
        return when {
            this is ProfileCreationFailedException -> message ?: "Account was created, but profile setup failed. Please contact admin."
            this is EmailConfirmationRequiredException -> message ?: "Account created. Please login to continue."
            this is InvalidAdminAccessCodeException -> message ?: "Invalid admin access code."
            "already registered" in text || "already exists" in text || "user already" in text ->
                "An account with this email already exists. Please sign in instead."
            "network" in text || "timeout" in text || "unable to resolve host" in text ->
                "Network problem. Please check your internet connection and try again."
            else -> "Unable to create account. Please check your details and try again."
        }
    }

    private fun Throwable.authCallbackMessage(): String =
        when (this) {
            is AuthCallbackFailedException -> message ?: "Unable to process login. Please try again."
            else -> "Unable to process login. Please try again."
        }

    private fun Throwable.signInMessage(): String {
        val text = listOfNotNull(message, cause?.message).joinToString(" ").lowercase()
        return when {
            this is InvalidAdminAccessCodeException -> message ?: "Invalid admin access code."
            this is InvalidRoleForLoginException -> message ?: "This login mode is not allowed for the account."
            "email not confirmed" in text || "email_not_confirmed" in text -> "Phone not verified."
            "network" in text || "timeout" in text || "unable to resolve host" in text ->
                "Network problem. Please check your internet connection and try again."
            else -> "Invalid email or password."
        }
    }

    private fun Throwable.otpMessage(): String {
        val text = listOfNotNull(message, cause?.message).joinToString(" ").lowercase()
        return when {
            this is InvalidOtpException -> message ?: "Invalid OTP."
            this is InvalidAdminAccessCodeException -> message ?: "Invalid admin access code."
            "expired" in text -> "OTP expired."
            "invalid" in text && "admin" in text -> "Invalid admin access code."
            "invalid" in text -> "Invalid OTP."
            "verified" in text -> "Phone not verified."
            "myoperator" in text ||
                "whatsapp otp service" in text ||
                "edge function secret" in text ||
                "not deployed" in text ||
                "unable to send whatsapp otp" in text -> message ?: "Unable to send WhatsApp OTP."
            "network" in text || "timeout" in text || "unable to resolve host" in text ->
                "Network problem. Please check your internet connection and try again."
            else -> "Unable to process WhatsApp OTP. Please try again."
        }
    }

    private fun Throwable.qrLoginMessage(): String {
        val text = listOfNotNull(message, cause?.message).joinToString(" ")
        val lower = text.lowercase()
        return when {
            text.isBlank() -> "Unable to verify QR login. Please try again."
            "invalid dairyflow qr" in lower -> "Invalid DairyFlow QR."
            "expired" in lower -> "This QR has expired. Ask admin to show a new QR."
            "delivery boy auth_email is missing" in lower ||
                "email is missing" in lower ||
                "user not found" in lower ->
                "Delivery boy account is not linked yet. Ask admin to create the delivery boy account again."
            "status" in lower && "ambiguous" in lower ->
                "QR login database patch is not applied yet. Run supabase/fix_delivery_qr_login_now.sql in Supabase SQL editor."
            "requested function was not found" in lower || "not_found" in lower ->
                "QR login backend is not deployed for this Supabase project. Deploy verify-delivery-qr-login, then try again."
            "network" in lower || "timeout" in lower || "unable to resolve host" in lower ->
                "Network problem. Please check your internet connection and try again."
            else -> text
        }
    }

    private fun validateSignup(
        fullName: String,
        dairyName: String,
        email: String,
        mobile: String,
        normalizedPhone: String,
        password: String,
        confirmPassword: String,
        role: String,
        adminAccessCode: String?
    ): SignupFieldErrors {
        val validPhone = normalizedPhone.length == 10 ||
            (normalizedPhone.startsWith("91") && normalizedPhone.length == 12)
        val passwordError = when {
            password.isBlank() -> "Password is required."
            password.length < 6 -> "Password must be at least 6 characters."
            else -> null
        }
        return SignupFieldErrors(
            fullName = if (fullName.isBlank()) "Full name is required." else null,
            dairyName = if (role == "admin" && dairyName.isBlank()) "Dairy name is required." else null,
            email = when {
                email.isBlank() -> "Email is required."
                !Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() -> "Enter a valid email address."
                else -> null
            },
            mobile = when {
                mobile.isBlank() -> "Mobile number is required."
                !validPhone -> "Enter a valid WhatsApp number."
                else -> null
            },
            password = passwordError,
            confirmPassword = when {
                confirmPassword.isBlank() -> "Confirm password is required."
                passwordError == null && password != confirmPassword -> "Passwords do not match."
                else -> null
            },
            adminAccessCode = if (role == "delivery_boy" && adminAccessCode.isNullOrBlank()) "Admin access code is required." else null
        )
    }
}
