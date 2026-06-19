package com.example.dairyflow.ui.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.CustomerHold
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.CustomersViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun CustomerDetailScreen(customerId: String, viewModel: CustomersViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()
    val productsState by viewModel.products.collectAsState()
    val holdsState by viewModel.holds.collectAsState()
    val saveState by viewModel.saveState.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    val customer = state.data?.firstOrNull { it.id == customerId }
    val productName = customer?.productName ?: productsState.data.orEmpty().firstOrNull { it.id == customer?.productId }?.name
    val holds = holdsState.data.orEmpty().filter { it.customerId == customerId }
    val activeHold = holds.firstOrNull { it.includes(todayIsoDate()) } ?: holds.firstOrNull()
    var showHoldDialog by remember { mutableStateOf(false) }

    ScreenColumn("Customer detail") {
        if (state.isLoading && state.data != null) RefreshingState("Refreshing customer...")
        saveState.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        saveState.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        when {
            state.isLoading && state.data == null -> LoadingState("Loading customer...")
            state.error != null -> ErrorState(state.error ?: "Error", viewModel::load)
            customer == null -> EmptyState("Customer not found.")
            else -> Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(customer.name)
                    Text("Phone: ${customer.phone ?: "-"}")
                    Text("Address: ${customer.address ?: "-"}")
                    Text("Product: ${productName ?: "-"}")
                    Text("Category: ${customer.productCategory}")
                    Text("Milk rate: Rs ${customer.milkRate} / L")
                    Text("Default quantity: ${customer.dailyQuantity} L")
                    Text("Status: ${if (activeHold != null) "On Hold" else if (customer.isActive) "Active" else "Inactive"}")
                    activeHold?.let { hold ->
                        Text("Hold: ${DateFormatter.formatDate(hold.startDate)} to ${DateFormatter.formatDate(hold.endDate)}")
                        Text("Reason: ${hold.reason ?: "-"}")
                        OutlinedButton(
                            onClick = { hold.id?.let(viewModel::removeHold) },
                            enabled = hold.id != null && !saveState.isSaving
                        ) {
                            Text("Remove Hold")
                        }
                    }
                    Button(onClick = { showHoldDialog = true }, enabled = !saveState.isSaving) {
                        Text("Hold Delivery")
                    }
                }
            }
        }
        Button(onClick = onBack) { Text("Back") }
    }

    if (showHoldDialog) {
        HoldDeliveryDialog(
            onDismiss = { showHoldDialog = false },
            onSave = { startDate, endDate, reason ->
                viewModel.holdCustomer(customerId, startDate, endDate, reason)
                showHoldDialog = false
            }
        )
    }
}
