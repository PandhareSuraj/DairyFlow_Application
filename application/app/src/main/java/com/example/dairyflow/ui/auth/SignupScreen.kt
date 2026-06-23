package com.example.dairyflow.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import kotlinx.coroutines.delay

@Composable
fun SignupScreen(viewModel: AuthViewModel, onSignedIn: () -> Unit, onBackToLogin: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var role by remember { mutableStateOf("admin") }
    var fullName by remember { mutableStateOf("") }
    var dairyName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var adminAccessCode by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var showConfirmPassword by remember { mutableStateOf(false) }
    var cooldown by remember { mutableIntStateOf(0) }

    LaunchedEffect(state.isSignedIn) {
        if (state.isSignedIn) onSignedIn()
    }

    LaunchedEffect(cooldown) {
        if (cooldown > 0) {
            delay(1000)
            cooldown -= 1
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Create Account", style = MaterialTheme.typography.headlineMedium)
        Text("Verify your phone with WhatsApp OTP.", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChip(selected = role == "admin", onClick = { role = "admin" }, label = { Text("Admin") })
            FilterChip(selected = role == "delivery_boy", onClick = { role = "delivery_boy" }, label = { Text("Delivery Boy") })
        }
        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            label = { Text(if (role == "admin") "Owner name" else "Name") },
            isError = state.fieldErrors.fullName != null,
            supportingText = { state.fieldErrors.fullName?.let { Text(it) } },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        if (role == "admin") {
            OutlinedTextField(
                value = dairyName,
                onValueChange = { dairyName = it },
                label = { Text("Dairy name") },
                isError = state.fieldErrors.dairyName != null,
                supportingText = { state.fieldErrors.dairyName?.let { Text(it) } },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        } else {
            OutlinedTextField(
                value = adminAccessCode,
                onValueChange = { adminAccessCode = it.uppercase() },
                label = { Text("Admin access code") },
                isError = state.fieldErrors.adminAccessCode != null,
                supportingText = { state.fieldErrors.adminAccessCode?.let { Text(it) } },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        }
        OutlinedTextField(
            value = mobile,
            onValueChange = { mobile = it.filter(Char::isDigit).take(12) },
            label = { Text("WhatsApp phone") },
            isError = state.fieldErrors.mobile != null,
            supportingText = { state.fieldErrors.mobile?.let { Text(it) } },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = {
                    viewModel.sendOtp(mobile, "signup", role, adminAccessCode.ifBlank { null })
                    cooldown = 60
                },
                enabled = !state.isLoading && cooldown == 0,
                modifier = Modifier.weight(1f)
            ) { Text(if (cooldown > 0) "Resend ${cooldown}s" else "Send OTP") }
            OutlinedTextField(
                value = otp,
                onValueChange = { otp = it.filter(Char::isDigit).take(6) },
                label = { Text("OTP") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }
        Button(
            onClick = { viewModel.verifyOtp(mobile, otp) },
            enabled = !state.isLoading && otp.length == 6,
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (state.otpVerified) "Phone verified" else "Verify OTP") }
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            isError = state.fieldErrors.email != null,
            supportingText = { state.fieldErrors.email?.let { Text(it) } },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            isError = state.fieldErrors.password != null,
            supportingText = { state.fieldErrors.password?.let { Text(it) } },
            singleLine = true,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = { TextButton(onClick = { showPassword = !showPassword }) { Text(if (showPassword) "Hide" else "Show") } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            label = { Text("Confirm password") },
            isError = state.fieldErrors.confirmPassword != null,
            supportingText = { state.fieldErrors.confirmPassword?.let { Text(it) } },
            singleLine = true,
            visualTransformation = if (showConfirmPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = { TextButton(onClick = { showConfirmPassword = !showConfirmPassword }) { Text(if (showConfirmPassword) "Hide" else "Show") } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                if (role == "admin") {
                    viewModel.signUpAdmin(fullName, dairyName, email, mobile, password, confirmPassword)
                } else {
                    viewModel.signUpDeliveryBoy(fullName, email, mobile, password, confirmPassword, adminAccessCode)
                }
            },
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (state.isLoading) "Creating account..." else "Create account") }
        OutlinedButton(onClick = onBackToLogin, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) {
            Text("Back to login")
        }
        if (state.isLoading) LoadingState()
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        state.error?.let { ErrorState(it) }
    }
}
