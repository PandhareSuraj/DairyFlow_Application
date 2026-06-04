package com.example.dairyflow.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.viewmodel.AuthViewModel

@Composable
fun ProfileScreen(viewModel: AuthViewModel) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.loadProfile() }
    val profile = state.profile
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Profile", style = MaterialTheme.typography.headlineMedium)
        Card {
            Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(profile?.fullName ?: "Signed in user", style = MaterialTheme.typography.titleMedium)
                Text(profile?.email ?: state.email ?: "No email")
                Text("Role: ${profile?.role ?: "user"}")
                profile?.adminAccessCode?.takeIf { it.isNotBlank() }?.let { Text("Admin access code: $it") }
                profile?.adminId?.takeIf { profile.role == "delivery_boy" }?.let { Text("Linked admin: $it") }
                profile?.phone?.takeIf { it.isNotBlank() }?.let { Text("Phone: $it") }
            }
        }
        Button(onClick = viewModel::loadProfile, modifier = Modifier.fillMaxWidth()) {
            Text("Refresh profile")
        }
        Button(onClick = viewModel::signOut, modifier = Modifier.fillMaxWidth()) {
            Text("Logout")
        }
    }
}
