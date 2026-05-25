package com.example.dairyflow.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel

@Composable
fun SignupScreen(viewModel: AuthViewModel, onSignedIn: () -> Unit, onBackToLogin: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var showConfirmPassword by remember { mutableStateOf(false) }

    LaunchedEffect(state.isSignedIn) {
        if (state.isSignedIn) onSignedIn()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Create Account", style = MaterialTheme.typography.headlineMedium)
        Text("Customer accounts can be promoted by an admin later.", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(18.dp))
        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            label = { Text("Full name") },
            isError = state.fieldErrors.fullName != null,
            supportingText = { state.fieldErrors.fullName?.let { Text(it) } },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
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
            value = mobile,
            onValueChange = { mobile = it.filter(Char::isDigit).take(10) },
            label = { Text("Mobile number") },
            isError = state.fieldErrors.mobile != null,
            supportingText = { state.fieldErrors.mobile?.let { Text(it) } },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
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
            trailingIcon = {
                TextButton(onClick = { showPassword = !showPassword }) {
                    Text(if (showPassword) "Hide" else "Show")
                }
            },
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
            trailingIcon = {
                TextButton(onClick = { showConfirmPassword = !showConfirmPassword }) {
                    Text(if (showConfirmPassword) "Hide" else "Show")
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { viewModel.signUp(fullName, email, mobile, password, confirmPassword) },
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (state.isLoading) "Creating account..." else "Create account") }
        OutlinedButton(
            onClick = onBackToLogin,
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Back to login") }
        if (state.isLoading) LoadingState()
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        state.error?.let { ErrorState(it) }
    }
}
