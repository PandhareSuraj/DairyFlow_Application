package com.example.dairyflow.ui.deliveryboy

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.PaymentRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.DeliveryBoyPaymentsViewModel

private sealed interface DeliveryBoyPaymentsPage {
    data object List : DeliveryBoyPaymentsPage
    data class Collect(val invoice: InvoiceRow) : DeliveryBoyPaymentsPage
    data class History(val customerId: String?) : DeliveryBoyPaymentsPage
}

@Composable
fun DeliveryBoyPaymentsScreen(viewModel: DeliveryBoyPaymentsViewModel) {
    val state by viewModel.state.collectAsState()
    var page by remember { mutableStateOf<DeliveryBoyPaymentsPage>(DeliveryBoyPaymentsPage.List) }

    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Payments", style = MaterialTheme.typography.headlineSmall)
        if (state.isLoading && state.data == null) LoadingState("Loading payments...")
        if (state.isLoading && state.data != null) RefreshingState("Refreshing payments...")
        state.error?.let { ErrorState(it, onRetry = { viewModel.load() }) }
        when (val current = page) {
            DeliveryBoyPaymentsPage.List -> DeliveryBoyPaymentList(
                invoices = state.data?.invoices.orEmpty(),
                customers = state.data?.customers.orEmpty(),
                onCollect = { page = DeliveryBoyPaymentsPage.Collect(it) },
                onHistory = { page = DeliveryBoyPaymentsPage.History(it.customerId) }
            )
            is DeliveryBoyPaymentsPage.Collect -> CollectPaymentPage(
                invoice = current.invoice,
                customer = state.data?.customers.orEmpty().firstOrNull { it.id == current.invoice.customerId },
                onBack = { page = DeliveryBoyPaymentsPage.List },
                onSave = { amount, mode, transactionId, notes ->
                    current.invoice.id?.let { invoiceId ->
                        viewModel.collectPayment(invoiceId, amount, mode, transactionId, notes) {
                            page = DeliveryBoyPaymentsPage.List
                        }
                    }
                }
            )
            is DeliveryBoyPaymentsPage.History -> PaymentHistoryPage(
                customerId = current.customerId,
                payments = state.data?.payments.orEmpty(),
                invoices = state.data?.invoices.orEmpty(),
                customers = state.data?.customers.orEmpty(),
                onBack = { page = DeliveryBoyPaymentsPage.List }
            )
        }
    }
}

@Composable
private fun DeliveryBoyPaymentList(
    invoices: List<InvoiceRow>,
    customers: List<CustomerRow>,
    onCollect: (InvoiceRow) -> Unit,
    onHistory: (InvoiceRow) -> Unit
) {
    val outstanding = invoices.filter {
        !it.status.equals("Paid", ignoreCase = true) && it.balanceAmount > 0.0
    }
    if (outstanding.isEmpty()) {
        EmptyState("No unpaid or partial invoices assigned.")
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(outstanding, key = { it.id ?: it.invoiceNumber }) { invoice ->
            val customer = customers.firstOrNull { it.id == invoice.customerId }
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(customer?.displayName ?: invoice.customerId, style = MaterialTheme.typography.titleMedium)
                    Text("Invoice: ${invoice.invoiceNumber}")
                    Text("Outstanding: Rs %.2f".format(invoice.balanceAmount))
                    Text("Status: ${invoice.status}")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(onClick = { onCollect(invoice) }, modifier = Modifier.weight(1f)) {
                            Text("Collect Payment")
                        }
                        OutlinedButton(onClick = { onHistory(invoice) }, modifier = Modifier.weight(1f)) {
                            Text("Payment History")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CollectPaymentPage(
    invoice: InvoiceRow,
    customer: CustomerRow?,
    onBack: () -> Unit,
    onSave: (Double, String, String?, String?) -> Unit
) {
    var amount by remember(invoice.id) { mutableStateOf(invoice.balanceAmount.toString()) }
    var mode by remember(invoice.id) { mutableStateOf("Cash") }
    var transactionId by remember(invoice.id) { mutableStateOf("") }
    var notes by remember(invoice.id) { mutableStateOf("") }
    val parsedAmount = amount.toDoubleOrNull()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .navigationBarsPadding()
            .padding(bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        TextButton(onClick = onBack) { Text("Back") }
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(customer?.displayName ?: invoice.customerId, style = MaterialTheme.typography.titleMedium)
                DetailRow("Invoice number", invoice.invoiceNumber)
                DetailRow("Invoice amount", "Rs %.2f".format(invoice.totalAmount))
                DetailRow("Paid amount", "Rs %.2f".format(invoice.paidAmount))
                DetailRow("Remaining amount", "Rs %.2f".format(invoice.balanceAmount))
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount collected") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    isError = parsedAmount == null || parsedAmount <= 0.0,
                    modifier = Modifier.fillMaxWidth()
                )
                OptionDropdown("Payment mode", mode, listOf("Cash", "UPI", "Bank Transfer"), { mode = it }, Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = transactionId,
                    onValueChange = { transactionId = it },
                    label = { Text("Transaction ID optional") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes optional") },
                    modifier = Modifier.fillMaxWidth()
                )
                Button(
                    onClick = {
                        parsedAmount?.takeIf { it > 0.0 }?.let {
                            onSave(it, mode, transactionId.ifBlank { null }, notes.ifBlank { null })
                        }
                    },
                    enabled = parsedAmount != null && parsedAmount > 0.0,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Save Payment")
                }
            }
        }
    }
}

@Composable
private fun PaymentHistoryPage(
    customerId: String?,
    payments: List<PaymentRow>,
    invoices: List<InvoiceRow>,
    customers: List<CustomerRow>,
    onBack: () -> Unit
) {
    val visiblePayments = customerId?.let { id -> payments.filter { it.customerId == id } } ?: payments
    Column(
        modifier = Modifier
            .fillMaxSize()
            .navigationBarsPadding()
            .padding(bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        TextButton(onClick = onBack) { Text("Back") }
        if (visiblePayments.isEmpty()) {
            EmptyState("No collected payments found.")
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(visiblePayments, key = { it.id ?: "${it.customerId}-${it.receivedAt}-${it.amount}" }) { payment ->
                    val customer = customers.firstOrNull { it.id == payment.customerId }
                    val invoice = invoices.firstOrNull { it.id == payment.invoiceId }
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(customer?.displayName ?: payment.customerId, style = MaterialTheme.typography.titleMedium)
                            DetailRow("Amount collected", "Rs %.2f".format(payment.amount))
                            DetailRow("Payment mode", payment.paymentMode ?: payment.paymentMethod)
                            DetailRow("Date/time", DateFormatter.formatDateTime(payment.receivedAt ?: payment.paymentDate))
                            DetailRow("Invoice number", invoice?.invoiceNumber ?: payment.invoiceId.orEmpty())
                            DetailRow("Collected by delivery boy", payment.collectedBy ?: "-")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value.ifBlank { "-" }, style = MaterialTheme.typography.bodyMedium)
    }
}
