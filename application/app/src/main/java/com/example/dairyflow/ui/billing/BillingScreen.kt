package com.example.dairyflow.ui.billing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.BillingViewModel
import com.example.dairyflow.ui.viewmodel.currentMonth
import com.example.dairyflow.ui.viewmodel.currentYear

@Composable
fun BillingScreen(viewModel: BillingViewModel) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    val data = state.data
    val customers = data?.customerRows.orEmpty()
    var customerName by remember(customers) { mutableStateOf("") }
    var billingMonth by remember { mutableStateOf("%04d-%02d".format(currentYear(), currentMonth())) }
    var tab by remember { mutableStateOf("Pending") }
    var showGenerator by remember { mutableStateOf(false) }
    val customer = customers.firstOrNull { it.displayName == customerName }
    val pendingDeliveries = data?.pendingDeliveries.orEmpty()
    val subtotal = pendingDeliveries.sumOf { it.totalAmount }
    val previous = customer?.openingBalance ?: 0.0
    val total = subtotal + previous

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { DairyDashboardHeader(title = "Billing", subtitle = "Manage daily operations") }
        item {
            Button(onClick = { showGenerator = !showGenerator }, modifier = Modifier.fillMaxWidth()) {
                Text(if (showGenerator) "Hide Invoice Form" else "Generate Invoice")
            }
        }
        if (showGenerator) item {
            InvoiceGeneratorCard(
                customerName = customerName,
                customers = customers.map { it.displayName },
                onCustomerName = { customerName = it },
                billingMonth = billingMonth,
                onBillingMonth = { billingMonth = it },
                subtotal = subtotal,
                previous = previous,
                total = total,
                isLoading = state.isLoading,
                canGenerate = customer?.id != null,
                onPreview = { customer?.id?.let { viewModel.previewPending(it, billingMonth) } },
                onGenerate = {
                    customer?.id?.let { viewModel.generateInvoice(it, billingMonth) }
                    showGenerator = false
                }
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Pending", "Paid", "Monthly", "Outstanding").forEach { option ->
                    FilterChip(tab == option, { tab = option }, label = { Text(option) })
                }
            }
        }
        if (state.isLoading && data == null) item { LoadingState("Loading billing...") }
        if (state.isLoading && data != null) item { RefreshingState("Refreshing billing...") }
        state.error?.let { item { ErrorState(it, viewModel::load) } }
        if (tab == "Monthly") {
            item { SectionTitle("Delivered unpaid deliveries") }
            if (pendingDeliveries.isEmpty()) {
                item { EmptyState("No delivered unpaid deliveries for this customer and month.") }
            } else {
                items(pendingDeliveries, key = { it.id ?: it.deliveryDate }) {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(DateFormatter.formatDate(it.deliveryDate))
                            Text("Qty ${it.quantity} x Rs ${it.unitPrice}")
                            Text("Amount Rs %.2f".format(it.totalAmount))
                        }
                    }
                }
            }
        } else {
            item { SectionTitle("Invoices") }
            val invoices = filteredInvoices(data?.invoices.orEmpty(), tab)
            if (invoices.isEmpty()) {
                item { EmptyState("No invoices found.") }
            } else {
                items(invoices, key = { it.id ?: it.invoiceNumber }) { invoice ->
                    InvoiceCard(
                        invoice = invoice,
                        customerName = customers.firstOrNull { it.id == invoice.customerId }?.displayName ?: "Customer",
                        onMarkPaid = { invoice.id?.let { viewModel.markInvoicePaid(it, invoice.totalAmount) } }
                    )
                }
            }
        }
    }
}

@Composable
private fun InvoiceGeneratorCard(
    customerName: String,
    customers: List<String>,
    onCustomerName: (String) -> Unit,
    billingMonth: String,
    onBillingMonth: (String) -> Unit,
    subtotal: Double,
    previous: Double,
    total: Double,
    isLoading: Boolean,
    canGenerate: Boolean,
    onPreview: () -> Unit,
    onGenerate: () -> Unit
) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Generate invoice", style = MaterialTheme.typography.titleMedium)
            OptionDropdown("Select customer", customerName, customers, onCustomerName, Modifier.fillMaxWidth())
            OutlinedTextField(
                billingMonth,
                onBillingMonth,
                label = { Text("Billing month") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onPreview, enabled = !isLoading, modifier = Modifier.weight(1f)) {
                    Text("Load unpaid")
                }
                Button(onClick = onGenerate, enabled = !isLoading && canGenerate, modifier = Modifier.weight(1f)) {
                    Text("Generate")
                }
            }
            Text("Subtotal Rs %.2f".format(subtotal))
            Text("Previous pending Rs %.2f".format(previous))
            Text("Total payable Rs %.2f".format(total), style = MaterialTheme.typography.titleMedium)
        }
    }
}

private fun filteredInvoices(invoices: List<InvoiceRow>, tab: String): List<InvoiceRow> =
    when (tab) {
        "Paid" -> invoices.filter { it.status == "Paid" }
        "Outstanding" -> invoices.filter { it.balanceAmount > 0.0 }
        else -> invoices.filter { it.status != "Paid" }
    }

@Composable
private fun InvoiceCard(invoice: InvoiceRow, customerName: String, onMarkPaid: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(invoice.invoiceNumber, style = MaterialTheme.typography.titleMedium)
            Text("$customerName - ${DateFormatter.formatBillingMonth(invoice.billingMonth)}")
            Text("Total Rs %.2f - Paid Rs %.2f - Balance Rs %.2f".format(invoice.totalAmount, invoice.paidAmount, invoice.balanceAmount))
            Text("Status: ${invoice.status}")
            if (invoice.status != "Paid") {
                OutlinedButton(onClick = onMarkPaid, modifier = Modifier.fillMaxWidth()) {
                    Text("Mark paid")
                }
            }
        }
    }
}
