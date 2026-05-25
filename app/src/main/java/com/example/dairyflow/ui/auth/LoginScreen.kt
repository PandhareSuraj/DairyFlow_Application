package com.example.dairyflow.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSignedIn: () -> Unit, onCreateAccount: () -> Unit, onForgotPassword: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    LaunchedEffect(state.isSignedIn) {
        if (state.isSignedIn) onSignedIn()
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("DairyFlow", style = MaterialTheme.typography.displaySmall)
        Text("Milk delivery, billing, and payments", style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(24.dp))
        if (!SupabaseModule.hasCredentials) {
            ErrorState("Supabase credentials are missing. Add SUPABASE_URL and SUPABASE_ANON_KEY to local.properties or .env.")
            Spacer(Modifier.height(12.dp))
        }
        OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            password,
            { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { viewModel.signIn(email, password) },
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Sign in") }
        OutlinedButton(
            onClick = onCreateAccount,
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Create account") }
        OutlinedButton(onClick = onForgotPassword, modifier = Modifier.fillMaxWidth()) { Text("Forgot password") }
        if (state.isLoading) LoadingState()
        state.error?.let { ErrorState(it) }
    }
}
