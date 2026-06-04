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
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun DeliveryScreen(viewModel: DeliveryViewModel, onAddDelivery: () -> Unit = {}) {
    val state by viewModel.state.collectAsState()
    var selectedDate by remember { mutableStateOf(todayIsoDate()) }
    var filter by remember { mutableStateOf("All") }
    var deleteTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    LaunchedEffect(Unit) { viewModel.load(selectedDate) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { DairyDashboardHeader(title = "Deliveries", subtitle = "Daily customer delivery schedule") }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = selectedDate,
                    onValueChange = { selectedDate = it },
                    label = { Text("Delivery date yyyy-mm-dd") },
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
        if (state.isLoading && state.data != null) {
            item { RefreshingState("Refreshing deliveries...") }
        }
        when {
            state.isLoading && state.data == null -> item { LoadingState("Loading deliveries...") }
            state.error != null -> item { ErrorState("Unable to load deliveries.", { viewModel.load() }, state.error) }
            state.data?.deliveryRows.isNullOrEmpty() -> item { EmptyState("No deliveries for this date.", "Refresh", { viewModel.load(selectedDate) }) }
            else -> {
                val data = state.data
                val deliveries = data?.deliveryRows.orEmpty().filter { filter == "All" || it.deliveryStatus == filter }
                if (deliveries.isEmpty()) {
                    item { EmptyState("No $filter deliveries for ${data?.selectedDate ?: selectedDate}.") }
                }
                items(deliveries, key = { it.id ?: "${it.customerId}-${it.deliveryDate}" }) { delivery ->
                    val customerName = data?.customerRows?.firstOrNull { it.id == delivery.customerId }?.displayName ?: "Customer"
                    val customer = data?.customerRows?.firstOrNull { it.id == delivery.customerId }
                    val productName = data?.productRows?.firstOrNull { it.id == delivery.productId }?.name
                        ?: customer?.milkType
                        ?: "Product"
                    DeliveryCard(
                        delivery = delivery,
                        customerName = customerName,
                        productName = productName,
                        routeLabel = customer?.routeId?.let { "Route assigned" } ?: "No route",
                        onDelivered = { delivery.id?.let { viewModel.updateDeliveryStatus(it, "Delivered") } },
                        onSkipped = { delivery.id?.let { viewModel.updateDeliveryStatus(it, "Skipped") } },
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
}

@Composable
private fun DeliveryCard(
    delivery: DeliveryRow,
    customerName: String,
    productName: String,
    routeLabel: String,
    onDelivered: () -> Unit,
    onSkipped: () -> Unit,
    onDelete: () -> Unit
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(customerName, style = MaterialTheme.typography.titleMedium)
            Text("$productName - ${delivery.deliveryDate} - ${delivery.deliveryTime}")
            Text("$routeLabel - Qty ${delivery.quantity} L - Rs %.2f".format(delivery.totalAmount))
            Text("Delivery: ${delivery.deliveryStatus} - Payment: ${delivery.paymentStatus}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDelivered) { Text("Delivered") }
                OutlinedButton(onClick = onSkipped) { Text("Skipped") }
                TextButton(onClick = onDelete) { Text("Delete") }
            }
        }
    }
}
