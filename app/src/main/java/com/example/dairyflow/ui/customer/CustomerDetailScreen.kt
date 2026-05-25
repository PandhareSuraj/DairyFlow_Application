package com.example.dairyflow.ui.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.viewmodel.CustomersViewModel

@Composable
fun CustomerDetailScreen(customerId: String, viewModel: CustomersViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    val customer = state.data?.firstOrNull { it.id == customerId }

    ScreenColumn("Customer detail") {
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(state.error ?: "Error", viewModel::load)
            customer == null -> EmptyState("Customer not found.")
            else -> Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(customer.name)
                    Text("Phone: ${customer.phone ?: "-"}")
                    Text("Address: ${customer.address ?: "-"}")
                    Text("Milk rate: Rs ${customer.milkRate} / L")
                    Text("Default quantity: ${customer.dailyQuantity} L")
                    Text("Status: ${if (customer.isActive) "active" else "inactive"}")
                }
            }
        }
        Button(onClick = onBack) { Text("Back") }
    }
}
