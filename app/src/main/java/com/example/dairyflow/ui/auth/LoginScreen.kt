package com.example.dairyflow.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.example.dairyflow.core.SupabaseModule
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import kotlinx.coroutines.delay

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onSignedIn: (String) -> Unit,
    onCreateAccount: () -> Unit,
    onForgotPassword: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var loginRole by remember { mutableStateOf("admin") }
    var loginMode by remember { mutableStateOf("email") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var adminAccessCode by remember { mutableStateOf("") }
    var cooldown by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        viewModel.restoreSession()
    }

    LaunchedEffect(state.isSignedIn, state.profile?.role) {
        if (state.isSignedIn) onSignedIn(state.profile?.role.orEmpty())
    }

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
        Text("DairyFlow", style = MaterialTheme.typography.displaySmall)
        Text("Milk delivery, billing, and payments", style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChip(selected = loginRole == "admin", onClick = { loginRole = "admin" }, label = { Text("Admin Login") })
            FilterChip(selected = loginRole == "delivery_boy", onClick = { loginRole = "delivery_boy" }, label = { Text("Delivery Boy Login") })
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChip(selected = loginMode == "email", onClick = { loginMode = "email" }, label = { Text("Email") })
            FilterChip(selected = loginMode == "phone", onClick = { loginMode = "phone" }, label = { Text("WhatsApp OTP") })
        }
        Spacer(Modifier.height(12.dp))
        if (!SupabaseModule.hasCredentials) {
            ErrorState("Supabase credentials are missing. Add SUPABASE_URL and SUPABASE_KEY to local.properties or .env.")
            Spacer(Modifier.height(12.dp))
        }
        if (loginMode == "email") {
            OutlinedTextField(email, { email = it }, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                password,
                { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            if (loginRole == "delivery_boy") {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    adminAccessCode,
                    { adminAccessCode = it.uppercase() },
                    label = { Text("Admin access code") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    if (loginRole == "delivery_boy") {
                        viewModel.signInDeliveryBoy(email, password, adminAccessCode)
                    } else {
                        viewModel.signIn(email, password)
                    }
                },
                enabled = !state.isLoading,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (loginRole == "delivery_boy") "Sign in as delivery boy" else "Sign in as admin") }
        } else {
            OutlinedTextField(
                phone,
                { phone = it.filter(Char::isDigit).take(12) },
                label = { Text("WhatsApp phone") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            if (loginRole == "delivery_boy") {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    adminAccessCode,
                    { adminAccessCode = it.uppercase() },
                    label = { Text("Admin access code") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                otp,
                { otp = it.filter(Char::isDigit).take(6) },
                label = { Text("OTP") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = {
                        viewModel.sendOtp(phone, "login", loginRole, adminAccessCode.ifBlank { null })
                        cooldown = 60
                    },
                    enabled = !state.isLoading && cooldown == 0,
                    modifier = Modifier.weight(1f)
                ) { Text(if (cooldown > 0) "Resend in ${cooldown}s" else "Send OTP") }
                Button(
                    onClick = { viewModel.signInWithPhoneOtp(phone, otp) },
                    enabled = !state.isLoading && otp.length == 6,
                    modifier = Modifier.weight(1f)
                ) { Text("Verify Login") }
            }
        }
        OutlinedButton(onClick = onCreateAccount, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) {
            Text("Create account")
        }
        OutlinedButton(onClick = onForgotPassword, modifier = Modifier.fillMaxWidth()) { Text("Forgot password") }
        if (state.isLoading) LoadingState()
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        state.error?.let { ErrorState(it) }
    }
}
