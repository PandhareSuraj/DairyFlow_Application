package com.example.dairyflow.ui.viewmodel

import android.util.Log
import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.repository.AuthRepository
import com.example.dairyflow.data.repository.EmailConfirmationRequiredException
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
    val fieldErrors: SignupFieldErrors = SignupFieldErrors()
)

data class SignupFieldErrors(
    val fullName: String? = null,
    val email: String? = null,
    val mobile: String? = null,
    val password: String? = null,
    val confirmPassword: String? = null
) {
    val hasErrors: Boolean
        get() = listOf(fullName, email, mobile, password, confirmPassword).any { it != null }
}

class AuthViewModel(private val repository: AuthRepository) : ViewModel() {
    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val _state = MutableStateFlow(
        AuthScreenState(
            isSignedIn = repository.isSignedIn(),
            email = repository.currentUserEmail()
        )
    )
    val state: StateFlow<AuthScreenState> = _state.asStateFlow()

    fun signIn(email: String, password: String) = viewModelScope.launch {
        when {
            email.isBlank() -> _state.value = _state.value.copy(error = "Email is required.")
            password.isBlank() -> _state.value = _state.value.copy(error = "Password is required.")
            else -> {
                _state.value = _state.value.copy(isLoading = true, error = null, message = null)
                _state.value = runCatching {
                    repository.signIn(email.trim(), password)
                }.fold(
                    onSuccess = {
                        AuthScreenState(isSignedIn = it, email = repository.currentUserEmail())
                    },
                    onFailure = {
                        AuthScreenState(isSignedIn = false, error = "Invalid email or password.")
                    }
                )
            }
        }
    }

    fun signUp(fullName: String, email: String, mobile: String, password: String, confirmPassword: String) = viewModelScope.launch {
        val normalizedPhone = mobile.filter { it.isDigit() }
        val fieldErrors = validateSignup(
            fullName = fullName,
            email = email,
            mobile = mobile,
            normalizedPhone = normalizedPhone,
            password = password,
            confirmPassword = confirmPassword
        )
        if (fieldErrors.hasErrors) {
            _state.value = _state.value.copy(
                isLoading = false,
                error = null,
                message = null,
                fieldErrors = fieldErrors
            )
            return@launch
        }

        _state.value = _state.value.copy(
            isLoading = true,
            error = null,
            message = null,
            fieldErrors = SignupFieldErrors()
        )
        _state.value = runCatching {
            repository.signUp(fullName.trim(), email.trim(), normalizedPhone, password)
        }.fold(
            onSuccess = {
                AuthScreenState(
                    isSignedIn = it,
                    email = repository.currentUserEmail(),
                    message = if (it) "Account created successfully." else "Account created. Please check your email, then sign in."
                )
            },
            onFailure = {
                Log.w(TAG, "Create account failed", it)
                AuthScreenState(
                    isSignedIn = false,
                    error = it.createAccountMessage()
                )
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

    fun clearMessages() {
        _state.value = _state.value.copy(error = null, message = null)
    }

    private fun Throwable.createAccountMessage(): String {
        val text = listOfNotNull(message, cause?.message).joinToString(" ").lowercase()
        return when {
            this is ProfileCreationFailedException -> message ?: "Account was created, but profile setup failed. Please contact admin."
            this is EmailConfirmationRequiredException -> message ?: "Account created. Please confirm your email, then sign in."
            "already registered" in text || "already exists" in text || "user already" in text ->
                "An account with this email already exists. Please sign in instead."
            "network" in text || "timeout" in text || "unable to resolve host" in text ->
                "Network problem. Please check your internet connection and try again."
            else -> "Unable to create account. Please check your details and try again."
        }
    }

    private fun validateSignup(
        fullName: String,
        email: String,
        mobile: String,
        normalizedPhone: String,
        password: String,
        confirmPassword: String
    ): SignupFieldErrors {
        val passwordError = when {
            password.isBlank() -> "Password is required."
            password.length < 6 -> "Password must be at least 6 characters."
            else -> null
        }
        return SignupFieldErrors(
            fullName = if (fullName.isBlank()) "Full name is required." else null,
            email = when {
                email.isBlank() -> "Email is required."
                !Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() -> "Enter a valid email address."
                else -> null
            },
            mobile = when {
                mobile.isBlank() -> "Mobile number is required."
                normalizedPhone.length != 10 -> "Mobile number must be 10 digits."
                else -> null
            },
            password = passwordError,
            confirmPassword = when {
                confirmPassword.isBlank() -> "Confirm password is required."
                passwordError == null && password != confirmPassword -> "Passwords do not match."
                else -> null
            }
        )
    }
}
