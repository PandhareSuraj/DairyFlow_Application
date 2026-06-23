package com.example.dairyflow.ui.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.CustomerInsightsViewModel
import com.example.dairyflow.ui.viewmodel.CustomerPaymentHistoryData

@Composable
fun CustomerPaymentHistoryScreen(customerId: String, viewModel: CustomerInsightsViewModel) {
    val state by viewModel.paymentHistory.collectAsState()

    LaunchedEffect(customerId) {
        viewModel.loadPaymentHistory(customerId)
    }

    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        when {
            state.isLoading && state.data == null -> item { LoadingState("Loading payment history...") }
            state.error != null -> item {
                ErrorState(
                    message = state.error ?: "Error",
                    onRetry = { viewModel.loadPaymentHistory(customerId) }
                )
            }
            state.data == null -> item { EmptyState("No payment history found") }
            else -> {
                val data = state.data!!
                item { PaymentSummary(data) }
                if (data.payments.isEmpty()) {
                    item { EmptyState("No payment history found") }
                } else {
                    item { Text("Payments", style = MaterialTheme.typography.titleMedium) }
                    items(data.payments, key = { it.id ?: "${it.paymentDate}-${it.amount}" }) { payment ->
                        PaymentRow(payment)
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentSummary(data: CustomerPaymentHistoryData) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(data.customer.name.ifBlank { "Customer" }, style = MaterialTheme.typography.headlineSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            PaymentTile("Total bill", money(data.totalBillAmount), Modifier.weight(1f))
            PaymentTile("Paid", money(data.paidAmount), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            PaymentTile("Pending", money(data.pendingAmount), Modifier.weight(1f))
            PaymentTile("Advance", money(data.advancePaymentAmount), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            PaymentTile("Last payment", DateFormatter.formatDateTime(data.lastPaymentDate), Modifier.weight(1f))
        }
        PaymentTile("Skipped delivery amount excluded from bill", money(data.skippedDeliveryExcludedAmount), Modifier.fillMaxWidth())
    }
}

@Composable
private fun PaymentTile(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(value, style = MaterialTheme.typography.titleLarge)
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PaymentRow(payment: Payment) {
    Card {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(DateFormatter.formatDateTime(payment.paymentDate), style = MaterialTheme.typography.titleSmall)
                Text(if (payment.isAdvancePayment) "Advance Payment" else payment.paymentMethod)
            }
            Text(money(payment.amount), style = MaterialTheme.typography.titleMedium)
        }
    }
}

private fun money(value: Double): String = "Rs %.2f".format(value)
