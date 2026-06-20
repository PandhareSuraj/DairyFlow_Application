package com.example.dairyflow.ui.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.DeliveryStatus
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.CustomerDeliveryChartData
import com.example.dairyflow.ui.viewmodel.CustomerInsightsViewModel
import java.util.Calendar
import java.util.Locale

@Composable
fun CustomerDeliveryChartScreen(customerId: String, viewModel: CustomerInsightsViewModel) {
    val now = remember { Calendar.getInstance(Locale.US) }
    var month by remember { mutableIntStateOf(now.get(Calendar.MONTH) + 1) }
    var year by remember { mutableIntStateOf(now.get(Calendar.YEAR)) }
    var selectedDay by remember { mutableStateOf<CalendarDay?>(null) }
    var showHoldDialog by remember { mutableStateOf(false) }
    val state by viewModel.deliveryChart.collectAsState()
    val holdState by viewModel.holdState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(customerId, month, year) {
        viewModel.loadDeliveryChart(customerId, month, year)
    }

    LaunchedEffect(holdState.message, holdState.error) {
        holdState.message?.let { snackbarHostState.showSnackbar(it) }
        holdState.error?.let { snackbarHostState.showSnackbar(it) }
    }

    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { SnackbarHost(hostState = snackbarHostState) }
        item {
            MonthSelector(
                label = DateFormatter.formatBillingMonth(month, year),
                onPrevious = {
                    if (month == 1) {
                        month = 12
                        year -= 1
                    } else {
                        month -= 1
                    }
                },
                onNext = {
                    if (month == 12) {
                        month = 1
                        year += 1
                    } else {
                        month += 1
                    }
                }
            )
        }
        when {
            state.isLoading && state.data == null -> item { LoadingState("Loading delivery chart...") }
            state.error != null -> item {
                ErrorState(
                    message = state.error ?: "Error",
                    onRetry = { viewModel.loadDeliveryChart(customerId, month, year) }
                )
            }
            state.data == null -> item { EmptyState("No delivery records found") }
            else -> {
                val data = state.data!!
                item { DeliverySummary(data) }
                item {
                    HoldCustomerAction(
                        isSaving = holdState.isSaving,
                        message = holdState.message,
                        error = holdState.error,
                        onClick = { showHoldDialog = true }
                    )
                }
                item {
                    DeliveryCalendar(
                        data = data,
                        onDayClick = { day -> selectedDay = day }
                    )
                }
                item { DeliveryLegend() }
                if (data.records.isEmpty()) {
                    item { EmptyState("No delivery records found") }
                }
            }
        }
    }

    selectedDay?.let { day ->
        DeliveryDayDialog(
            day = day,
            onDismiss = { selectedDay = null },
            onRemoveHold = if (day.isHeld) {
                {
                    viewModel.removeCustomerHoldDate(customerId, day.date, month, year)
                    selectedDay = null
                }
            } else {
                null
            }
        )
    }

    if (showHoldDialog) {
        HoldDeliveryDialog(
            onDismiss = { showHoldDialog = false },
            onSave = { startDate, endDate, reason ->
                viewModel.holdCustomerRange(customerId, startDate, endDate, reason, month, year)
                showHoldDialog = false
            }
        )
    }
}

@Composable
private fun MonthSelector(label: String, onPrevious: () -> Unit, onNext: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(onClick = onPrevious, modifier = Modifier.weight(1f)) { Text("<") }
        Button(onClick = {}, modifier = Modifier.weight(2f)) { Text(label) }
        OutlinedButton(onClick = onNext, modifier = Modifier.weight(1f)) { Text(">") }
    }
}

@Composable
private fun DeliverySummary(data: CustomerDeliveryChartData) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(data.customer.name.ifBlank { "Customer" }, style = MaterialTheme.typography.headlineSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            SummaryTile("Total days", data.totalDays.toString(), Modifier.weight(1f))
            SummaryTile("Delivered", data.deliveredDays.toString(), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            SummaryTile("Skipped", data.skippedDays.toString(), Modifier.weight(1f))
            SummaryTile("Pending", data.pendingDays.toString(), Modifier.weight(1f))
        }
        SummaryTile("Total quantity delivered", "%.1f L".format(data.totalQuantityDelivered), Modifier.fillMaxWidth())
    }
}

@Composable
private fun SummaryTile(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(value, style = MaterialTheme.typography.titleLarge)
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HoldCustomerAction(
    isSaving: Boolean,
    message: String?,
    error: String?,
    onClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Button(onClick = onClick, enabled = !isSaving, modifier = Modifier.fillMaxWidth()) {
            Text(if (isSaving) "Saving..." else "Hold Customer")
        }
        message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary) }
        error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
    }
}

@Composable
private fun DeliveryCalendar(data: CustomerDeliveryChartData, onDayClick: (CalendarDay) -> Unit) {
    val days = remember(data.month, data.year, data.records, data.holds) { calendarDays(data) }
    val weekDays = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Delivery calendar", style = MaterialTheme.typography.titleMedium)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            weekDays.forEach { label ->
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        days.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                week.forEach { day ->
                    if (day == null) {
                        Box(Modifier.weight(1f).aspectRatio(1f))
                    } else {
                        CalendarDateCell(
                            day = day,
                            onClick = { onDayClick(day) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarDateCell(day: CalendarDay, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val status = day.status
    val colors = MaterialTheme.colorScheme
    val container = when {
        day.isHeld -> colors.errorContainer
        status == DeliveryStatus.DELIVERED -> colors.tertiaryContainer
        status == DeliveryStatus.PENDING -> colors.secondaryContainer
        status == DeliveryStatus.SKIPPED || status == DeliveryStatus.CANCELLED -> colors.errorContainer
        else -> colors.surface
    }
    val iconTint = when {
        day.isHeld -> colors.error
        status == DeliveryStatus.DELIVERED -> colors.tertiary
        status == DeliveryStatus.PENDING -> colors.secondary
        status == DeliveryStatus.SKIPPED || status == DeliveryStatus.CANCELLED -> colors.error
        else -> colors.onSurfaceVariant
    }

    Card(
        modifier = modifier.aspectRatio(1f).clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = container)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(day.dayOfMonth.toString(), style = MaterialTheme.typography.labelMedium)
            when {
                day.isHeld -> Icon(Icons.Filled.PauseCircle, contentDescription = "Hold", tint = iconTint)
                status == DeliveryStatus.DELIVERED -> Icon(Icons.Filled.CheckCircle, contentDescription = "Delivered", tint = iconTint)
                status == DeliveryStatus.PENDING -> Icon(Icons.Filled.Schedule, contentDescription = "Pending", tint = iconTint)
                status == DeliveryStatus.SKIPPED || status == DeliveryStatus.CANCELLED -> Icon(Icons.Filled.Cancel, contentDescription = "Skipped", tint = iconTint)
                else -> Box(Modifier.background(Color.Transparent, CircleShape))
            }
            if (day.isHeld) {
                Text("Hold", style = MaterialTheme.typography.labelSmall)
            } else if (day.records.isNotEmpty()) {
                Text("%.1f L".format(day.deliveredQuantity), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun DeliveryLegend() {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Legend", style = MaterialTheme.typography.labelMedium)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LegendItem("Delivered", colors.tertiaryContainer, Modifier.weight(1f))
            LegendItem("Hold", colors.errorContainer, Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LegendItem("Skipped", colors.errorContainer, Modifier.weight(1f))
            LegendItem("Pending", colors.surface, Modifier.weight(1f))
        }
    }
}

@Composable
private fun LegendItem(label: String, color: Color, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.background(color, CircleShape).padding(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun DeliveryDayDialog(day: CalendarDay, onDismiss: () -> Unit, onRemoveHold: (() -> Unit)?) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(DateFormatter.formatDate(day.date)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (day.isHeld) {
                    Text("Status: Hold")
                }
                if (day.records.isEmpty()) {
                    if (!day.isHeld) Text("No delivery records found")
                } else {
                    Text("Delivered quantity: %.1f L".format(day.deliveredQuantity))
                    day.records.forEach { record ->
                        Text(
                            "%s: %s, %.1f L%s".format(
                                record.shift.name.lowercase().replaceFirstChar { it.titlecase(Locale.US) },
                                record.status.name.lowercase().replaceFirstChar { it.titlecase(Locale.US) },
                                record.quantity,
                                record.skipReason?.let { " - $it" }.orEmpty()
                            )
                        )
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
        dismissButton = {
            if (onRemoveHold != null) {
                TextButton(onClick = onRemoveHold) { Text("Remove Hold") }
            }
        }
    )
}

private data class CalendarDay(
    val dayOfMonth: Int,
    val date: String,
    val records: List<DeliveryRecord>,
    val isHeld: Boolean
) {
    val deliveredQuantity: Double = records.filter { it.status == DeliveryStatus.DELIVERED }.sumOf { it.quantity }
    val status: DeliveryStatus? = when {
        isHeld -> DeliveryStatus.SKIPPED
        records.any { it.status == DeliveryStatus.PENDING } -> DeliveryStatus.PENDING
        records.any { it.status == DeliveryStatus.DELIVERED } -> DeliveryStatus.DELIVERED
        records.any { it.status == DeliveryStatus.SKIPPED } -> DeliveryStatus.SKIPPED
        records.any { it.status == DeliveryStatus.CANCELLED } -> DeliveryStatus.CANCELLED
        else -> null
    }
}

private fun calendarDays(data: CustomerDeliveryChartData): List<CalendarDay?> {
    val calendar = Calendar.getInstance(Locale.US).apply {
        set(Calendar.YEAR, data.year)
        set(Calendar.MONTH, data.month - 1)
        set(Calendar.DAY_OF_MONTH, 1)
    }
    val leadingBlanks = calendar.get(Calendar.DAY_OF_WEEK) - 1
    val recordsByDate = data.records.groupBy { it.deliveryDate }
    val heldDates = data.holds.filter { it.status.equals("active", ignoreCase = true) }.map { it.startDate }.toSet()
    val days = MutableList<CalendarDay?>(leadingBlanks) { null }
    repeat(data.totalDays) { index ->
        val day = index + 1
        val date = "%04d-%02d-%02d".format(data.year, data.month, day)
        days += CalendarDay(dayOfMonth = day, date = date, records = recordsByDate[date].orEmpty(), isHeld = date in heldDates)
    }
    while (days.size % 7 != 0) days += null
    return days
}
