package com.example.dairyflow.ui.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Policy
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dairyflow.BuildConfig
import com.example.dairyflow.data.repository.AppLanguage
import com.example.dairyflow.data.repository.AppSettingsRepository
import com.example.dairyflow.data.repository.AppThemePreference
import com.example.dairyflow.ui.localization.LocalDairyStrings
import com.example.dairyflow.ui.viewmodel.AuthViewModel

@Composable
fun ProfileScreen(
    viewModel: AuthViewModel,
    appSettingsRepository: AppSettingsRepository
) {
    val strings = LocalDairyStrings.current
    val state by viewModel.state.collectAsState()
    val settings by appSettingsRepository.settings.collectAsState()
    var dialog by remember { mutableStateOf<ProfileDialog?>(null) }

    LaunchedEffect(Unit) { viewModel.loadProfile() }
    val profile = state.profile

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { Text(strings.profile, style = MaterialTheme.typography.headlineMedium) }
        item {
            Card {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(profile?.fullName ?: strings.signedInUser, style = MaterialTheme.typography.titleMedium)
                    Text(profile?.email ?: state.email ?: strings.noEmail)
                    Text("${strings.role}: ${profile?.role ?: "user"}")
                    profile?.adminAccessCode?.takeIf { it.isNotBlank() }?.let { Text("${strings.adminAccessCode}: $it") }
                    profile?.adminId?.takeIf { profile.role == "delivery_boy" }?.let { Text("${strings.linkedAdmin}: $it") }
                    profile?.phone?.takeIf { it.isNotBlank() }?.let { Text("${strings.phone}: $it") }
                }
            }
        }
        item {
            ProfileOptionCard(
                title = strings.refreshProfile,
                subtitle = strings.refreshProfileSubtitle,
                icon = Icons.Filled.Refresh,
                onClick = viewModel::loadProfile
            )
        }
        item {
            ProfileOptionCard(
                title = strings.privacyPolicy,
                subtitle = strings.privacyPolicySubtitle,
                icon = Icons.Filled.Policy,
                onClick = { dialog = ProfileDialog.PrivacyPolicy }
            )
        }
        item {
            ProfileOptionCard(
                title = strings.changeTheme,
                subtitle = themeLabel(settings.themePreference, strings),
                icon = Icons.Filled.DarkMode,
                onClick = { dialog = ProfileDialog.Theme }
            )
        }
        item {
            ProfileOptionCard(
                title = strings.changeLanguage,
                subtitle = languageLabel(settings.language, strings),
                icon = Icons.Filled.Language,
                onClick = { dialog = ProfileDialog.Language }
            )
        }
        item {
            ProfileOptionCard(
                title = strings.about,
                subtitle = "DairyFlow ${BuildConfig.VERSION_NAME}",
                icon = Icons.Filled.Info,
                onClick = { dialog = ProfileDialog.About }
            )
        }
        item {
            Spacer(Modifier.height(4.dp))
            OutlinedButton(onClick = viewModel::signOut, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.Logout, contentDescription = null)
                Text(" ${strings.logout}")
            }
        }
    }

    when (dialog) {
        ProfileDialog.PrivacyPolicy -> PrivacyPolicyDialog(onDismiss = { dialog = null })
        ProfileDialog.Theme -> ThemeDialog(
            selected = settings.themePreference,
            onSelected = {
                appSettingsRepository.setThemePreference(it)
                dialog = null
            },
            onDismiss = { dialog = null }
        )
        ProfileDialog.Language -> LanguageDialog(
            selected = settings.language,
            onSelected = {
                appSettingsRepository.setLanguage(it)
                dialog = null
            },
            onDismiss = { dialog = null }
        )
        ProfileDialog.About -> AboutDialog(onDismiss = { dialog = null })
        null -> Unit
    }
}

@Composable
private fun ProfileOptionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun PrivacyPolicyDialog(onDismiss: () -> Unit) {
    val strings = LocalDairyStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(strings.privacyPolicy) },
        text = {
            Text(
                strings.privacyPolicyBody
            )
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(strings.ok) } }
    )
}

@Composable
private fun ThemeDialog(
    selected: AppThemePreference,
    onSelected: (AppThemePreference) -> Unit,
    onDismiss: () -> Unit
) {
    val strings = LocalDairyStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(strings.changeTheme) },
        text = {
            Column {
                ThemeOption(AppThemePreference.LIGHT, strings.lightTheme, selected, onSelected)
                ThemeOption(AppThemePreference.DARK, strings.darkTheme, selected, onSelected)
                ThemeOption(AppThemePreference.SYSTEM, strings.systemDefault, selected, onSelected)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(strings.cancel) } }
    )
}

@Composable
private fun ThemeOption(
    value: AppThemePreference,
    label: String,
    selected: AppThemePreference,
    onSelected: (AppThemePreference) -> Unit
) {
    RadioOption(label = label, selected = value == selected, onClick = { onSelected(value) })
}

@Composable
private fun LanguageDialog(
    selected: AppLanguage,
    onSelected: (AppLanguage) -> Unit,
    onDismiss: () -> Unit
) {
    val strings = LocalDairyStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(strings.changeLanguage) },
        text = {
            Column {
                LanguageOption(AppLanguage.ENGLISH, strings.english, selected, onSelected)
                LanguageOption(AppLanguage.MARATHI, strings.marathi, selected, onSelected)
                LanguageOption(AppLanguage.HINDI, strings.hindi, selected, onSelected)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(strings.cancel) } }
    )
}

@Composable
private fun LanguageOption(
    value: AppLanguage,
    label: String,
    selected: AppLanguage,
    onSelected: (AppLanguage) -> Unit
) {
    RadioOption(label = label, selected = value == selected, onClick = { onSelected(value) })
}

@Composable
private fun RadioOption(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().selectable(selected = selected, onClick = onClick).padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Text(label, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun AboutDialog(onDismiss: () -> Unit) {
    val strings = LocalDairyStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(strings.about) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("${strings.appNameLabel}: DairyFlow")
                Text("${strings.versionLabel}: ${BuildConfig.VERSION_NAME}")
                Text("${strings.purposeLabel}: ${strings.appPurpose}")
                Text(strings.contactSupport)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(strings.ok) } }
    )
}

private fun themeLabel(
    themePreference: AppThemePreference,
    strings: com.example.dairyflow.ui.localization.DairyStrings
): String = when (themePreference) {
    AppThemePreference.LIGHT -> strings.lightTheme
    AppThemePreference.DARK -> strings.darkTheme
    AppThemePreference.SYSTEM -> strings.systemDefault
}

private fun languageLabel(
    language: AppLanguage,
    strings: com.example.dairyflow.ui.localization.DairyStrings
): String = when (language) {
    AppLanguage.ENGLISH -> strings.english
    AppLanguage.MARATHI -> strings.marathi
    AppLanguage.HINDI -> strings.hindi
}

private enum class ProfileDialog {
    PrivacyPolicy,
    Theme,
    Language,
    About
}
