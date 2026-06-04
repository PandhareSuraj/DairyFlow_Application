package com.example.dairyflow.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import kotlinx.coroutines.delay

@Composable
fun AdminOtpLoginScreen(
    viewModel: AuthViewModel,
    onBack: () -> Unit,
    onSignedIn: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var cooldown by remember { mutableIntStateOf(0) }

    LaunchedEffect(state.isSignedIn, state.profile?.role) {
        if (state.isSignedIn && state.profile?.role.equals("admin", ignoreCase = true)) onSignedIn()
    }
    LaunchedEffect(cooldown) {
        if (cooldown > 0) {
            delay(1000)
            cooldown -= 1
        }
    }
    LaunchedEffect(state.otpSent) {
        if (state.otpSent) cooldown = 60
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Admin Login", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("WhatsApp mobile OTP", style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(20.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it.filter(Char::isDigit).take(12) },
            label = { Text("Mobile Number") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = otp,
            onValueChange = { otp = it.filter(Char::isDigit).take(6) },
            label = { Text("OTP") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = {
                    viewModel.sendAdminWhatsAppOtp(phone)
                },
                enabled = !state.isLoading && cooldown == 0,
                modifier = Modifier.weight(1f)
            ) { Text(if (cooldown > 0) "${cooldown}s" else "Send WhatsApp OTP") }
            Button(
                onClick = { viewModel.verifyAdminWhatsAppLogin(phone, otp) },
                enabled = !state.isLoading && otp.length == 6,
                modifier = Modifier.weight(1f)
            ) { Text("Verify & Login") }
        }
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
        if (state.isLoading) LoadingState()
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        state.error?.let { ErrorState(it) }
    }
}
