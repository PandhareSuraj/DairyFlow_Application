package com.example.dairyflow.ui.customer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.viewmodel.todayIsoDate
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@Composable
fun HoldDeliveryDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String?) -> Unit
) {
    var startDate by remember { mutableStateOf(todayIsoDate()) }
    var endDate by remember { mutableStateOf(todayIsoDate()) }
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Hold delivery") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                HoldDateField(
                    value = startDate,
                    label = "From Date",
                    onDateSelected = { startDate = it }
                )
                HoldDateField(
                    value = endDate,
                    label = "To Date",
                    onDateSelected = { endDate = it }
                )
                OutlinedTextField(reason, { reason = it }, label = { Text("Reason optional") })
            }
        },
        confirmButton = {
            Button(onClick = { onSave(startDate, endDate, reason.ifBlank { null }) }) {
                Text("Save Hold")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HoldDateField(
    value: String,
    label: String,
    onDateSelected: (String) -> Unit
) {
    var showPicker by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = {},
        label = { Text(label) },
        singleLine = true,
        readOnly = true,
        trailingIcon = {
            IconButton(onClick = { showPicker = true }) {
                Icon(Icons.Filled.CalendarMonth, contentDescription = "Choose $label")
            }
        },
        modifier = Modifier.clickable { showPicker = true }
    )

    if (showPicker) {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = value.toUtcMillis())

        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { onDateSelected(it.toIsoDate()) }
                        showPicker = false
                    }
                ) {
                    Text("OK")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text("Cancel")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

private val isoDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("UTC")
}

private fun String.toUtcMillis(): Long? = runCatching {
    isoDateFormat.parse(this)?.time
}.getOrNull()

private fun Long.toIsoDate(): String = isoDateFormat.format(this)
