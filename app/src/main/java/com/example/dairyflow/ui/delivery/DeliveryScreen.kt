package com.example.dairyflow.ui.delivery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.localization.LocalDairyStrings
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun DeliveryScreen(viewModel: DeliveryViewModel, onAddDelivery: () -> Unit = {}) {
    val strings = LocalDairyStrings.current
    val state by viewModel.state.collectAsState()
    var selectedDate by remember { mutableStateOf(todayIsoDate()) }
    var filter by remember { mutableStateOf("All") }
    var routeFilter by remember { mutableStateOf("All routes") }
    var deleteTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var selectedDelivery by remember { mutableStateOf<DeliveryDetails?>(null) }
    LaunchedEffect(Unit) { viewModel.load(selectedDate) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { DairyDashboardHeader(title = strings.deliveries, subtitle = strings.dailyDeliverySchedule) }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = selectedDate,
                    onValueChange = { selectedDate = it },
                    label = { Text("Delivery date") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Button(
                    onClick = { viewModel.load(selectedDate) },
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Refresh daily schedule")
                }
                state.data?.autoCreatedCount?.takeIf { it > 0 }?.let { count ->
                    Text(
                        "$count delivery ${if (count == 1) "record" else "records"} created from customer schedules.",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All", "Delivered", "Pending", "Skipped").forEach { option ->
                    FilterChip(selected = filter == option, onClick = { filter = option }, label = { Text(option) })
                }
            }
        }
        item {
            val routes = state.data?.routeRows.orEmpty()
            val routeOptions = listOf("All routes", "No route") + routes.map { it.displayName }
            if (routeFilter !in routeOptions) routeFilter = "All routes"
            OptionDropdown(
                label = "Route",
                value = routeFilter,
                options = routeOptions,
                onSelected = { routeFilter = it },
                modifier = Modifier.fillMaxWidth()
            )
        }
        if (state.isLoading && state.data != null) {
            item { RefreshingState("Refreshing deliveries...") }
        }
        when {
            state.isLoading && state.data == null -> item { LoadingState("Loading deliveries...") }
            state.error != null -> item { ErrorState("Unable to load deliveries.", { viewModel.load() }, state.error) }
            state.data?.deliveryRows.isNullOrEmpty() -> item { EmptyState("No deliveries for this date.", "Refresh", { viewModel.load(selectedDate) }) }
            else -> {
                val data = state.data
                val customersById = data?.customerRows.orEmpty().associateBy { it.id }
                val selectedRouteId = data?.routeRows.orEmpty().firstOrNull { it.displayName == routeFilter }?.id
                val deliveries = data?.deliveryRows.orEmpty().filter { delivery ->
                    val customer = customersById[delivery.customerId]
                    val matchesStatus = filter == "All" || delivery.deliveryStatus == filter
                    val matchesRoute = when (routeFilter) {
                        "All routes" -> true
                        "No route" -> customer?.routeId.isNullOrBlank()
                        else -> customer?.routeId == selectedRouteId
                    }
                    matchesStatus && matchesRoute
                }
                if (deliveries.isEmpty()) {
                    item { EmptyState("No $filter deliveries for ${DateFormatter.formatDate(data?.selectedDate ?: selectedDate)} in $routeFilter.") }
                }
                items(deliveries, key = { it.id ?: "${it.customerId}-${it.deliveryDate}" }) { delivery ->
                    val customerName = customersById[delivery.customerId]?.displayName ?: "Customer"
                    val customer = customersById[delivery.customerId]
                    val routeName = data?.routeRows.orEmpty().firstOrNull { it.id == customer?.routeId }?.displayName
                    val productName = data?.productRows?.firstOrNull { it.id == delivery.productId }?.name
                        ?: customer?.milkType
                        ?: "Product"
                    DeliveryCard(
                        delivery = delivery,
                        customerName = customerName,
                        productName = productName,
                        routeLabel = routeName ?: "No route",
                        onDelivered = { delivery.id?.let { viewModel.updateDeliveryStatus(it, "Delivered") } },
                        onSkipped = { delivery.id?.let { viewModel.updateDeliveryStatus(it, "Skipped") } },
                        onDetails = {
                            selectedDelivery = DeliveryDetails(
                                delivery = delivery,
                                customerName = customerName,
                                productName = productName,
                                routeLabel = routeName ?: "No route"
                            )
                        },
                        onDelete = { deleteTarget = delivery }
                    )
                }
            }
        }
    }

    deleteTarget?.let { delivery ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete delivery?") },
            text = { Text("This removes the delivery record from Supabase.") },
            confirmButton = {
                Button(onClick = {
                    delivery.id?.let { viewModel.deleteDelivery(it) }
                    deleteTarget = null
                }) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text("Cancel") }
            }
        )
    }

    selectedDelivery?.let { details ->
        DeliveryDetailsDialog(
            details = details,
            onDismiss = { selectedDelivery = null }
        )
    }
}

@Composable
private fun DeliveryCard(
    delivery: DeliveryRow,
    customerName: String,
    productName: String,
    routeLabel: String,
    onDelivered: () -> Unit,
    onSkipped: () -> Unit,
    onDetails: () -> Unit,
    onDelete: () -> Unit
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(customerName, style = MaterialTheme.typography.titleMedium)
            Text("Delivery status: ${delivery.deliveryStatus}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onDelivered, modifier = Modifier.weight(1f)) { Text("Delivered") }
                OutlinedButton(onClick = onSkipped, modifier = Modifier.weight(1f)) { Text("Skipped") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onDetails, modifier = Modifier.weight(1f)) { Text("Details") }
                TextButton(onClick = onDelete, modifier = Modifier.weight(1f)) { Text("Delete") }
            }
        }
    }
}

@Composable
private fun DeliveryDetailsDialog(details: DeliveryDetails, onDismiss: () -> Unit) {
    val delivery = details.delivery
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delivery details") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DetailRow("Customer name", details.customerName)
                DetailRow("Date", DateFormatter.formatDate(delivery.deliveryDate))
                DetailRow("Shift", delivery.deliveryTime)
                DetailRow("Route", details.routeLabel)
                DetailRow("Product / milk type", details.productName)
                DetailRow("Quantity", "%.1f L".format(delivery.quantity))
                DetailRow("Amount", "Rs %.2f".format(delivery.totalAmount))
                DetailRow("Delivery status", delivery.deliveryStatus)
                DetailRow("Payment status", delivery.paymentStatus)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value.ifBlank { "-" }, style = MaterialTheme.typography.bodyMedium)
    }
}

private data class DeliveryDetails(
    val delivery: DeliveryRow,
    val customerName: String,
    val productName: String,
    val routeLabel: String
)
