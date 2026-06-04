package com.example.dairyflow.ui.deliveryboy

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryBoyViewModel

private enum class DeliveryBoySection(val label: String) {
    ROUTE("Today Route"),
    DELIVERIES("Today Deliveries"),
    COLLECTIONS("Collections"),
    PROFILE("Profile")
}

@Composable
fun DeliveryBoyDashboardScreen(
    viewModel: DeliveryBoyViewModel,
    authViewModel: AuthViewModel
) {
    val state by viewModel.state.collectAsState()
    val authState by authViewModel.state.collectAsState()
    var section by remember { mutableStateOf(DeliveryBoySection.ROUTE) }
    var skipTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var skipReason by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        authViewModel.loadProfile()
        viewModel.load()
    }

    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Delivery Boy Dashboard", style = MaterialTheme.typography.headlineSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            DeliveryBoySection.entries.forEach { item ->
                FilterChip(selected = section == item, onClick = { section = item }, label = { Text(item.label) })
            }
        }
        if (state.isLoading && state.data == null) LoadingState("Loading today's route...")
        if (state.isLoading && state.data != null) RefreshingState("Refreshing route...")
        state.error?.let { ErrorState(it, onRetry = { viewModel.load() }) }
        when (section) {
            DeliveryBoySection.ROUTE -> TodayRouteContent(
                routeName = state.data?.route?.displayName ?: "No route assigned",
                customers = state.data?.customers.orEmpty()
            )
            DeliveryBoySection.DELIVERIES -> TodayDeliveriesContent(
                deliveries = state.data?.deliveries.orEmpty(),
                customers = state.data?.customers.orEmpty(),
                onDelivered = { viewModel.markDelivered(it) },
                onSkip = { delivery -> skipTarget = delivery },
                onPaid = { viewModel.markPayment(it, true) },
                onUnpaid = { viewModel.markPayment(it, false) }
            )
            DeliveryBoySection.COLLECTIONS -> CollectionsContent(state.data?.deliveries.orEmpty(), state.data?.customers.orEmpty())
            DeliveryBoySection.PROFILE -> Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(authState.profile?.fullName ?: authState.email ?: "Delivery boy", style = MaterialTheme.typography.titleMedium)
                    Text(authState.profile?.email ?: authState.email.orEmpty())
                    Text("Role: delivery boy")
                    OutlinedButton(onClick = { authViewModel.signOut() }) { Text("Sign out") }
                }
            }
        }
    }

    skipTarget?.let { delivery ->
        AlertDialog(
            onDismissRequest = { skipTarget = null },
            title = { Text("Skip Today") },
            text = {
                OutlinedTextField(skipReason, { skipReason = it }, label = { Text("Skip reason") }, modifier = Modifier.fillMaxWidth())
            },
            confirmButton = {
                Button({
                    delivery.id?.let { viewModel.skipToday(it, skipReason) }
                    skipReason = ""
                    skipTarget = null
                }) { Text("Skip Today") }
            },
            dismissButton = { TextButton({ skipTarget = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun TodayRouteContent(routeName: String, customers: List<CustomerRow>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(routeName, style = MaterialTheme.typography.titleMedium)
                Text("${customers.size} customers assigned")
            }
        }
        if (customers.isEmpty()) {
            EmptyState("No customers assigned to this route.")
        } else {
            customers.forEach { customer ->
                Card {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(customer.displayName, style = MaterialTheme.typography.titleMedium)
                        Text(customer.phone)
                        Text(customer.address ?: customer.area ?: "No address")
                        Text("Morning ${customer.morningQuantity} L, Evening ${customer.eveningQuantity} L")
                    }
                }
            }
        }
    }
}

@Composable
private fun TodayDeliveriesContent(
    deliveries: List<DeliveryRow>,
    customers: List<CustomerRow>,
    onDelivered: (String) -> Unit,
    onSkip: (DeliveryRow) -> Unit,
    onPaid: (String) -> Unit,
    onUnpaid: (String) -> Unit
) {
    if (deliveries.isEmpty()) {
        EmptyState("No deliveries generated for today.")
        return
    }
    PaddedList {
        items(deliveries, key = { it.id ?: it.customerId }) { delivery ->
            val customer = customers.firstOrNull { it.id == delivery.customerId }
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(customer?.displayName ?: delivery.customerId, style = MaterialTheme.typography.titleMedium)
                    Text("${delivery.deliveryTime} - ${delivery.quantity} L - Rs %.2f".format(delivery.totalAmount))
                    Text("Delivery: ${delivery.deliveryStatus} - Payment: ${delivery.paymentStatus}")
                    delivery.skipReason?.takeIf { it.isNotBlank() }?.let { Text("Reason: $it") }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { delivery.id?.let(onDelivered) }) { Text("Delivered") }
                        OutlinedButton(onClick = { onSkip(delivery) }) { Text("Skip Today") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { delivery.id?.let(onPaid) }) { Text("Paid") }
                        OutlinedButton(onClick = { delivery.id?.let(onUnpaid) }) { Text("Unpaid") }
                    }
                }
            }
        }
    }
}

@Composable
private fun CollectionsContent(deliveries: List<DeliveryRow>, customers: List<CustomerRow>) {
    val paid = deliveries.filter { it.paymentStatus.equals("Paid", ignoreCase = true) }
    val unpaid = deliveries.filter { it.paymentStatus.equals("Unpaid", ignoreCase = true) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Today's collections", style = MaterialTheme.typography.titleMedium)
                Text("Paid: Rs %.2f".format(paid.sumOf { it.totalAmount }))
                Text("Unpaid: Rs %.2f".format(unpaid.sumOf { it.totalAmount }))
            }
        }
        deliveries.forEach { delivery ->
            val customer = customers.firstOrNull { it.id == delivery.customerId }
            Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(customer?.displayName ?: delivery.customerId)
                    Text("Rs %.2f - ${delivery.paymentStatus}".format(delivery.totalAmount))
                }
            }
        }
    }
}
