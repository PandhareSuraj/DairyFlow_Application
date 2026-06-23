package com.example.dairyflow.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import kotlinx.coroutines.delay

@Composable
fun ForgotPasswordScreen(viewModel: AuthViewModel, onBackToLogin: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var role by remember { mutableStateOf("admin") }
    var mobile by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var adminAccessCode by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var cooldown by remember { mutableIntStateOf(0) }

    LaunchedEffect(cooldown) {
        if (cooldown > 0) {
            delay(1000)
            cooldown -= 1
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Reset Password", style = MaterialTheme.typography.headlineMedium)
        Text("Verify your phone with WhatsApp OTP.", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChip(selected = role == "admin", onClick = { role = "admin" }, label = { Text("Admin") })
            FilterChip(selected = role == "delivery_boy", onClick = { role = "delivery_boy" }, label = { Text("Delivery Boy") })
        }
        if (role == "delivery_boy") {
            OutlinedTextField(
                value = adminAccessCode,
                onValueChange = { adminAccessCode = it.uppercase() },
                label = { Text("Admin access code") },
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
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = {
                    viewModel.sendOtp(mobile, "reset", role, adminAccessCode.ifBlank { null })
                    cooldown = 60
                },
                enabled = !state.isLoading && cooldown == 0,
                modifier = Modifier.weight(1f)
            ) {
                Text(if (cooldown > 0) "Resend ${cooldown}s" else "Send OTP")
            }
            OutlinedTextField(
                value = otp,
                onValueChange = { otp = it.filter(Char::isDigit).take(6) },
                label = { Text("OTP") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("New password") },
            isError = state.fieldErrors.password != null,
            supportingText = { state.fieldErrors.password?.let { Text(it) } },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            label = { Text("Confirm password") },
            isError = state.fieldErrors.confirmPassword != null,
            supportingText = { state.fieldErrors.confirmPassword?.let { Text(it) } },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { viewModel.resetPasswordWithOtp(mobile, otp, password, confirmPassword) },
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Reset password")
        }
        OutlinedButton(onClick = onBackToLogin, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) {
            Text("Back to login")
        }
        if (state.isLoading) LoadingState()
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        state.error?.let { ErrorState(it) }
    }
}
