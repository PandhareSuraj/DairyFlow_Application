package com.example.dairyflow.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ScreenColumn(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(title, style = MaterialTheme.typography.headlineSmall)
        content()
    }
}

@Composable
fun LoadingState(message: String = "Loading...") {
    Row(
        Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircularProgressIndicator()
        Text(message, modifier = Modifier.padding(start = 12.dp), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)? = null, details: String? = null) {
    var showDetails by remember { mutableStateOf(false) }
    val safeMessage = message.toSafeErrorMessage()
    val safeDetails = details?.takeUnless { it.hasSensitiveErrorContent() }
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(safeMessage, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (onRetry != null) OutlinedButton(onClick = onRetry) { Text("Retry") }
                if (!safeDetails.isNullOrBlank()) {
                    TextButton(onClick = { showDetails = !showDetails }) {
                        Text(if (showDetails) "Hide details" else "Details")
                    }
                }
            }
            if (showDetails && !safeDetails.isNullOrBlank()) {
                Text(safeDetails, color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun EmptyState(message: String, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
    Card {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(message, style = MaterialTheme.typography.bodyMedium)
            if (actionLabel != null && onAction != null) {
                Button(onClick = onAction) { Text(actionLabel) }
            }
        }
    }
}

@Composable
fun MetricCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(8.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.headlineSmall)
        }
    }
}

@Composable
fun ActionRow(primary: String, onPrimary: () -> Unit, secondary: String? = null, onSecondary: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        Button(onClick = onPrimary, modifier = Modifier.weight(1f)) { Text(primary) }
        if (secondary != null && onSecondary != null) {
            OutlinedButton(onClick = onSecondary, modifier = Modifier.weight(1f)) { Text(secondary) }
        }
    }
}

@Composable
fun PaddedList(content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        content = content
    )
}

@Composable
fun SectionTitle(text: String) {
    Spacer(Modifier.height(4.dp))
    Text(text, style = MaterialTheme.typography.titleMedium)
}

private fun String.toSafeErrorMessage(): String =
    if (hasSensitiveErrorContent()) "Something went wrong. Please try again." else this

private fun String.hasSensitiveErrorContent(): Boolean {
    val text = lowercase()
    return listOf(
        "authorization",
        "bearer ",
        "apikey",
        "api key",
        "headers:",
        "rest/v1",
        "http://",
        "https://",
        "pgrst",
        "postgrest",
        "stack trace",
        "stacktrace",
        "exception",
        "jwt",
        "row-level security policy"
    ).any { it in text }
}
