package com.example.dairyflow.ui.admin.deliveryboys

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.DeliveryBoyCalendarDay
import com.example.dairyflow.data.model.DeliveryBoyDailyPerformanceDetails
import com.example.dairyflow.data.model.DeliveryBoyDailyMilkRow
import com.example.dairyflow.data.model.DeliveryBoyPaymentEntry
import com.example.dairyflow.data.model.DeliveryBoyPaymentSummary
import com.example.dairyflow.data.model.DeliveryBoyPerformanceSummary
import com.example.dairyflow.data.model.PaymentCollectionFilter
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.DeliveryBoyAdminActionViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

@Composable
fun DeliveryBoyPerformanceScreen(
    deliveryBoyId: String,
    viewModel: DeliveryBoyAdminActionViewModel
) {
    val state by viewModel.performanceState.collectAsState()
    val dailyState by viewModel.dailyDetailsState.collectAsState()
    var month by remember { mutableStateOf(performanceTodayIsoDate().take(7)) }
    var routeId by remember { mutableStateOf("") }
    var selectedDate by remember { mutableStateOf(performanceTodayIsoDate()) }
    var showTakenMilkDialog by remember { mutableStateOf(false) }
    var takenMilkDialogDate by remember { mutableStateOf<String?>(null) }
    var detailDate by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(deliveryBoyId) {
        viewModel.loadPerformance(deliveryBoyId, month, routeId)
    }

    if (showTakenMilkDialog) {
        val dialogDate = takenMilkDialogDate ?: performanceTodayIsoDate()
        TakenMilkQuantityDialog(
            date = dialogDate,
            initial = dailyState.data?.takeIf { it.date == dialogDate },
            onDismiss = {
                showTakenMilkDialog = false
                takenMilkDialogDate = null
            },
            onSave = { cow, buffalo, notes ->
                selectedDate = dialogDate
                showTakenMilkDialog = false
                takenMilkDialogDate = null
                viewModel.saveTakenMilk(deliveryBoyId, dialogDate, cow, buffalo, notes, month, routeId)
            }
        )
    }

    detailDate?.let { date ->
        LaunchedEffect(deliveryBoyId, date) {
            viewModel.loadDailyDetails(deliveryBoyId, date)
        }
        DeliveryBoyDailyPerformanceDetailsPage(
            state = dailyState,
            onBack = { detailDate = null },
            onAddTakenMilk = {
                selectedDate = date
                takenMilkDialogDate = date
                showTakenMilkDialog = true
            },
            onRetry = { viewModel.loadDailyDetails(deliveryBoyId, date) }
        )
        return
    }

    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Delivery Boy Performance", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                state.data?.deliveryBoy?.let {
                    Text(it.name, style = MaterialTheme.typography.titleMedium)
                    Text("Mobile: ${it.mobileNumber ?: "-"}")
                }
                OutlinedTextField(
                    value = month,
                    onValueChange = { month = it.take(7) },
                    label = { Text("Select month (YYYY-MM)") },
                    modifier = Modifier.fillMaxWidth()
                )
                val routes = state.data?.routes.orEmpty()
                if (routes.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        FilterChip(selected = routeId.isBlank(), onClick = { routeId = "" }, label = { Text("All routes") })
                        routes.take(2).forEach { route ->
                            FilterChip(
                                selected = routeId == route.id,
                                onClick = { routeId = route.id.orEmpty() },
                                label = { Text(route.routeName.take(14)) }
                            )
                        }
                    }
                }
                Button(
                    onClick = {
                        selectedDate = performanceTodayIsoDate().takeIf { it.startsWith(month) } ?: "$month-01"
                        takenMilkDialogDate = selectedDate
                        viewModel.loadDailyDetails(deliveryBoyId, selectedDate)
                        showTakenMilkDialog = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Taken Milk Quantity")
                }
            }
        }
        if (state.isLoading && state.data == null) item { LoadingState() }
        state.error?.let { item { ErrorState(it, onRetry = { viewModel.loadPerformance(deliveryBoyId, month, routeId) }) } }
        state.data?.let { data ->
            item { PerformanceSummaryGrid(data.summary) }
            item {
                MonthlyCalendarChart(
                    days = data.calendarDays,
                    selectedDate = selectedDate,
                    onSelectDate = { day ->
                        selectedDate = day.date
                        if (!day.isFuture) {
                            detailDate = day.date
                        }
                    }
                )
            }
        }
        if (!state.isLoading && state.data?.chartRows.orEmpty().isEmpty()) {
            item { EmptyState("No delivered milk liters found for this filter.") }
        }
    }
}

@Composable
fun DeliveryBoyPaymentCollectionScreen(
    deliveryBoyId: String,
    viewModel: DeliveryBoyAdminActionViewModel
) {
    val state by viewModel.paymentState.collectAsState()
    var filter by remember { mutableStateOf(PaymentCollectionFilter.THIS_MONTH) }
    var startDate by remember { mutableStateOf(localTodayIsoDate().take(7) + "-01") }
    var endDate by remember { mutableStateOf(localTodayIsoDate()) }

    LaunchedEffect(deliveryBoyId) {
        viewModel.loadPayments(deliveryBoyId, filter, startDate, endDate)
    }

    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Delivery Boy Payment Collection", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                state.data?.deliveryBoy?.let {
                    Text(it.name, style = MaterialTheme.typography.titleMedium)
                    Text("Mobile: ${it.mobileNumber ?: "-"}")
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    FilterChip(selected = filter == PaymentCollectionFilter.TODAY, onClick = { filter = PaymentCollectionFilter.TODAY }, label = { Text("Today") })
                    FilterChip(selected = filter == PaymentCollectionFilter.THIS_MONTH, onClick = { filter = PaymentCollectionFilter.THIS_MONTH }, label = { Text("This month") })
                    FilterChip(selected = filter == PaymentCollectionFilter.CUSTOM, onClick = { filter = PaymentCollectionFilter.CUSTOM }, label = { Text("Custom") })
                }
                if (filter == PaymentCollectionFilter.CUSTOM) {
                    OutlinedTextField(startDate, { startDate = it }, label = { Text("Start date") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(endDate, { endDate = it }, label = { Text("End date") }, modifier = Modifier.fillMaxWidth())
                }
                Button(
                    onClick = { viewModel.loadPayments(deliveryBoyId, filter, startDate, endDate) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Apply Filters")
                }
            }
        }
        if (state.isLoading && state.data == null) item { LoadingState() }
        state.error?.let { item { ErrorState(it, onRetry = { viewModel.loadPayments(deliveryBoyId, filter, startDate, endDate) }) } }
        state.data?.let { data ->
            item { PaymentSummaryGrid(data.summary) }
            if (data.entries.isEmpty()) {
                item { EmptyState("No payment collection entries found.") }
            } else {
                items(data.entries) { entry -> PaymentEntryCard(entry) }
            }
        }
    }
}

@Composable
private fun PerformanceSummaryGrid(summary: DeliveryBoyPerformanceSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Total", summary.totalDeliveries.toString(), Modifier.weight(1f))
            SummaryCard("Delivered", summary.deliveredDeliveries.toString(), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Skipped", summary.skippedDeliveries.toString(), Modifier.weight(1f))
            SummaryCard("Pending", summary.pendingDeliveries.toString(), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Cow milk", formatLiters(summary.cowMilkLiters), Modifier.weight(1f))
            SummaryCard("Buffalo milk", formatLiters(summary.buffaloMilkLiters), Modifier.weight(1f))
        }
        SummaryCard("Total liters delivered", formatLiters(summary.totalLiters), Modifier.fillMaxWidth())
    }
}

@Composable
private fun MonthlyCalendarChart(
    days: List<DeliveryBoyCalendarDay>,
    selectedDate: String,
    onSelectDate: (DeliveryBoyCalendarDay) -> Unit
) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Monthly Calendar Chart", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat").chunked(7).forEach { labels ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    labels.forEach { label ->
                        Text(label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            val leadingBlanks = days.firstOrNull()?.date?.let(::sundayBasedOffset).orZero()
            val calendarItems = List<DeliveryBoyCalendarDay?>(leadingBlanks) { null } + days
            calendarItems.chunked(7).forEach { week ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    week.forEach { day ->
                        if (day == null) {
                            Box(Modifier.weight(1f).height(72.dp))
                        } else {
                            CalendarDayCell(
                                day = day,
                                selected = selectedDate == day.date,
                                modifier = Modifier.weight(1f),
                                onClick = { onSelectDate(day) }
                            )
                        }
                    }
                    repeat(7 - week.size) {
                        Box(Modifier.weight(1f).height(72.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarDayCell(
    day: DeliveryBoyCalendarDay,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val bg = when {
        selected -> MaterialTheme.colorScheme.primaryContainer
        day.isFuture -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
        day.isCompleted -> Color(0xFFE3F4E8)
        day.hasDelivery -> Color(0xFFFFF4D8)
        else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    }
    Card(onClick = onClick, modifier = modifier.height(72.dp)) {
        Column(
            Modifier.fillMaxWidth().background(bg).padding(6.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Text(day.dayOfMonth.toString(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            when {
                day.isFuture -> Box(Modifier.height(24.dp))
                day.isCompleted -> Icon(
                    Icons.Filled.CheckCircle,
                    contentDescription = "Completed",
                    tint = Color(0xFF16803A),
                    modifier = Modifier.size(24.dp)
                )
                day.hasDelivery -> Icon(
                    Icons.Filled.Schedule,
                    contentDescription = "Pending",
                    tint = Color(0xFFB77900),
                    modifier = Modifier.size(24.dp)
                )
                else -> Box(Modifier.height(24.dp))
            }
            if (day.skippedCount > 0) {
                Text("S", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun MonthlyDeliveryChart(rows: List<DeliveryBoyDailyMilkRow>) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Monthly Delivery Chart", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            val max = rows.maxOfOrNull { it.totalLiters }?.coerceAtLeast(1.0) ?: 1.0
            rows.forEach { row ->
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(DateFormatter.formatDate(row.date), style = MaterialTheme.typography.bodySmall)
                        Text(formatLiters(row.totalLiters), style = MaterialTheme.typography.bodySmall)
                    }
                    MilkBar("Cow", row.cowMilkLiters, max)
                    MilkBar("Buffalo", row.buffaloMilkLiters, max)
                }
            }
        }
    }
}

@Composable
private fun DeliveryBoyDailyPerformanceDetailsPage(
    state: com.example.dairyflow.data.model.UiState<DeliveryBoyDailyPerformanceDetails>,
    onBack: () -> Unit,
    onAddTakenMilk: () -> Unit,
    onRetry: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Delivery Boy Daily Performance Details", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back to Performance") }
            }
        }
        if (state.isLoading && state.data == null) item { LoadingState() }
        state.error?.let { item { ErrorState(it, onRetry = onRetry) } }
        state.data?.let { details ->
            item {
                Text(DateFormatter.formatDate(details.date), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                details.deliveryBoy?.let { Text(it.name) }
            }
            if (!details.hasTakenMilk) {
                item { EmptyState("Taken milk quantity not added.") }
            }
            item { Button(onClick = onAddTakenMilk, modifier = Modifier.fillMaxWidth()) { Text("Taken Milk Quantity") } }
            item {
                DailyMilkSection(
                    title = "Taken Milk by Delivery Boy",
                    cow = details.stock.cowMilkTakenLiters,
                    buffalo = details.stock.buffaloMilkTakenLiters,
                    total = details.stock.totalTakenLiters
                )
            }
            item {
                DailyMilkSection(
                    title = "Delivered Milk",
                    cow = details.delivered.cowMilkLiters,
                    buffalo = details.delivered.buffaloMilkLiters,
                    total = details.delivered.totalLiters
                )
            }
            item {
                DailyMilkSection(
                    title = "Remaining Milk",
                    cow = details.remainingCowLiters,
                    buffalo = details.remainingBuffaloLiters,
                    total = details.totalRemainingLiters
                )
            }
        }
    }
}

@Composable
private fun DailyMilkSection(title: String, cow: Double, buffalo: Double, total: Double) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Cow milk: ${formatLiters(cow)}")
            Text("Buffalo milk: ${formatLiters(buffalo)}")
            Text("Total: ${formatLiters(total)}")
        }
    }
}

@Composable
private fun TakenMilkQuantityDialog(
    date: String,
    initial: DeliveryBoyDailyPerformanceDetails?,
    onDismiss: () -> Unit,
    onSave: (Double, Double, String?) -> Unit
) {
    var cow by remember(initial?.date, date) { mutableStateOf(initial?.stock?.cowMilkTakenLiters?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var buffalo by remember(initial?.date, date) { mutableStateOf(initial?.stock?.buffaloMilkTakenLiters?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var notes by remember(initial?.date, date) { mutableStateOf(initial?.stock?.notes.orEmpty()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Taken Milk Quantity") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(date, {}, label = { Text("Date") }, readOnly = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(cow, { cow = it }, label = { Text("Cow milk taken litres") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(buffalo, { buffalo = it }, label = { Text("Buffalo milk taken litres") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(notes, { notes = it }, label = { Text("Notes optional") }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    cow.toDoubleOrNull() ?: 0.0,
                    buffalo.toDoubleOrNull() ?: 0.0,
                    notes.ifBlank { null }
                )
            }) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
private fun MilkBar(label: String, liters: Double, max: Double) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, modifier = Modifier.weight(0.28f), style = MaterialTheme.typography.labelSmall)
        Box(
            modifier = Modifier
                .weight(1f)
                .height(10.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth((liters / max).toFloat().coerceIn(0f, 1f))
                    .height(10.dp)
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp))
            )
        }
        Text(formatLiters(liters), style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun PaymentSummaryGrid(summary: DeliveryBoyPaymentSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SummaryCard("Total collected", formatMoney(summary.totalCollectedAmount), Modifier.fillMaxWidth())
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Cash", formatMoney(summary.cashCollected), Modifier.weight(1f))
            SummaryCard("UPI", formatMoney(summary.upiCollected), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Bank transfer", formatMoney(summary.bankTransferCollected), Modifier.weight(1f))
            SummaryCard("Entries", summary.entryCount.toString(), Modifier.weight(1f))
        }
    }
}

@Composable
private fun PaymentEntryCard(entry: DeliveryBoyPaymentEntry) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(entry.customerName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Invoice: ${entry.invoiceNumber ?: "-"}")
            Text("Amount: ${formatMoney(entry.amount)}")
            Text("Mode: ${entry.paymentMode.name.lowercase().replace('_', ' ')}")
            Text("Collected: ${entry.collectedAt}")
            Text("Collected by: ${entry.collectedByName}")
        }
    }
}

@Composable
private fun SummaryCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelMedium)
        }
    }
}

private fun formatLiters(value: Double): String = "%.1f L".format(value)

private fun formatMoney(value: Double): String = "Rs %.0f".format(value)

@Composable
private fun LoadingState(message: String = "Loading...") {
    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator()
        Text(message, modifier = Modifier.padding(start = 10.dp))
    }
}

@Composable
private fun ErrorState(message: String, onRetry: (() -> Unit)? = null) {
    Card {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(message, color = MaterialTheme.colorScheme.error)
            if (onRetry != null) {
                OutlinedButton(onClick = onRetry) { Text("Retry") }
            }
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    Card {
        Text(message, modifier = Modifier.fillMaxWidth().padding(14.dp))
    }
}

private fun sundayBasedOffset(date: String): Int {
    val parsed = runCatching {
        SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = indiaTimeZone()
        }.parse(date)
    }.getOrNull() ?: return 0
    return Calendar.getInstance(Locale.US).apply {
        timeZone = indiaTimeZone()
        time = parsed
    }.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY
}

private fun Int?.orZero(): Int = this ?: 0

private fun localTodayIsoDate(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

private fun performanceTodayIsoDate(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = indiaTimeZone()
    }.format(Calendar.getInstance(indiaTimeZone()).time)

private fun indiaTimeZone(): TimeZone = TimeZone.getTimeZone("Asia/Kolkata")
