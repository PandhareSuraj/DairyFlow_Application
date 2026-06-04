package com.example.dairyflow.ui.payment

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.PaymentMethod
import com.example.dairyflow.ui.common.ActionRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.PaymentsViewModel
import com.example.dairyflow.ui.viewmodel.currentMonth
import com.example.dairyflow.ui.viewmodel.currentYear
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import java.io.File
import java.io.FileOutputStream

@Composable
fun PaymentsScreen(viewModel: PaymentsViewModel) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var showEntry by remember { mutableStateOf(false) }
    var showInvoice by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { viewModel.load() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { DairyDashboardHeader(title = "Payments", subtitle = "Manage daily operations") }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = {
                        showInvoice = !showInvoice
                        if (showInvoice) showEntry = false
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Generate Invoice")
                }
                Button(
                    onClick = {
                        showEntry = !showEntry
                        if (showEntry) showInvoice = false
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text(if (showEntry) "Hide Payment" else "Add Payment")
                }
            }
        }
        if (showInvoice) item {
            InvoiceQuickEntry(
                customers = state.data?.customers.orEmpty(),
                isLoading = state.isLoading,
                onGenerate = { customerId, month ->
                    viewModel.generateInvoice(customerId, month)
                    showInvoice = false
                }
            )
        }
        state.data?.lastGeneratedInvoice?.let { invoice ->
            item {
                GeneratedInvoiceShareCard(
                    invoice = invoice,
                    customers = state.data?.customers.orEmpty(),
                    onShare = { shareInvoiceOnWhatsApp(context, invoice, invoice.dueAmount, "", state.data?.customers.orEmpty()) }
                )
            }
        }
        if (showEntry) item {
            PaymentEntry(
                invoices = state.data?.bills.orEmpty(),
                customers = state.data?.customers.orEmpty(),
                onCash = { bill, amount, txn ->
                    viewModel.recordPayment(bill, amount, PaymentMethod.CASH, txn, "Manual cash entry")
                    showEntry = false
                },
                onUpiReceived = { bill, amount, upi ->
                    viewModel.recordPayment(bill, amount, PaymentMethod.UPI, null, "UPI received${upi?.let { " at $it" } ?: ""}")
                    showEntry = false
                },
                onShareInvoice = { bill, amount, upi -> shareInvoiceOnWhatsApp(context, bill, amount, upi, state.data?.customers.orEmpty()) },
                onOnline = { bill, amount ->
                    viewModel.startOnlinePayment(context, bill, amount)
                    showEntry = false
                }
            )
        }
        item { SectionTitle("Payment history") }
        if (state.isLoading && state.data != null) {
            item { RefreshingState("Refreshing payments...") }
        }
        when {
            state.isLoading && state.data == null -> item { LoadingState("Loading payments...") }
            state.error != null -> item { ErrorState(state.error ?: "Error", viewModel::load) }
            state.data?.payments.isNullOrEmpty() -> item { EmptyState("No payments recorded yet.") }
            else -> items(state.data?.payments.orEmpty(), key = { it.id ?: "${it.billingRecordId}-${it.amount}" }) { payment ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Rs ${payment.amount} via ${payment.method.name.lowercase()}")
                        Text("Invoice ${payment.invoiceId ?: "-"}")
                        Text(payment.notes ?: "Manual entry")
                    }
                }
            }
        }
    }
}

@Composable
private fun GeneratedInvoiceShareCard(
    invoice: BillingRecord,
    customers: List<CustomerRow>,
    onShare: () -> Unit
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Invoice generated", style = MaterialTheme.typography.titleMedium)
            Text(invoiceShareText(invoice, invoice.dueAmount, "", customers))
            Button(onClick = onShare, modifier = Modifier.fillMaxWidth()) {
                Text("Share Invoice on WhatsApp")
            }
        }
    }
}

@Composable
private fun InvoiceQuickEntry(
    customers: List<CustomerRow>,
    isLoading: Boolean,
    onGenerate: (String, String) -> Unit
) {
    var customerName by remember(customers) { mutableStateOf("") }
    var billingMonth by remember { mutableStateOf("%04d-%02d".format(currentYear(), currentMonth())) }
    val customer = customers.firstOrNull { it.displayName == customerName }

    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Generate invoice", style = MaterialTheme.typography.titleMedium)
            OptionDropdown("Customer", customerName, customers.map { it.displayName }, { customerName = it }, Modifier.fillMaxWidth())
            OutlinedTextField(
                billingMonth,
                { billingMonth = it },
                label = { Text("Billing month yyyy-mm") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = { customer?.id?.let { onGenerate(it, billingMonth) } },
                enabled = !isLoading && customer?.id != null,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Generate Invoice")
            }
        }
    }
}

@Composable
private fun PaymentEntry(
    invoices: List<BillingRecord>,
    customers: List<CustomerRow>,
    onCash: (BillingRecord, Double, String?) -> Unit,
    onUpiReceived: (BillingRecord, Double, String?) -> Unit,
    onShareInvoice: (BillingRecord, Double, String) -> Unit,
    onOnline: (BillingRecord, Double) -> Unit
) {
    val payableInvoices = invoices.filter { it.dueAmount > 0.0 }
    val invoiceLabels = payableInvoices.map { it.displayLabel(customers) }
    var selectedInvoice by remember(invoiceLabels) { mutableStateOf(invoiceLabels.firstOrNull().orEmpty()) }
    val bill = payableInvoices.firstOrNull { it.displayLabel(customers) == selectedInvoice }
    var amount by remember(bill?.id) { mutableStateOf(bill?.dueAmount?.takeIf { it > 0.0 }?.let { "%.2f".format(it) }.orEmpty()) }
    var transactionId by remember { mutableStateOf("") }
    var upi by remember { mutableStateOf("") }
    var showUpiQr by remember(bill?.id) { mutableStateOf(false) }
    val payable = amount.toDoubleOrNull() ?: 0.0

    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Collect payment")
            if (payableInvoices.isEmpty()) {
                EmptyState("No unpaid invoices. Generate an invoice first.")
            } else {
                OptionDropdown("Invoice", selectedInvoice, invoiceLabels, { selectedInvoice = it }, Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    payableInvoices.take(3).forEach { item ->
                        val label = item.displayLabel(customers)
                        FilterChip(
                            selected = label == selectedInvoice,
                            onClick = { selectedInvoice = label },
                            label = { Text("Rs %.0f".format(item.dueAmount)) }
                        )
                    }
                }
                bill?.let {
                    Text(
                        "Due Rs %.2f for %s".format(it.dueAmount, it.invoiceNumber.ifBlank { "selected invoice" }),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                OutlinedTextField(amount, { amount = it }, label = { Text("Amount") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(transactionId, { transactionId = it }, label = { Text("Transaction ID optional") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(upi, { upi = it.trim() }, label = { Text("Your UPI ID") }, modifier = Modifier.fillMaxWidth())
                if (bill != null && payable > 0.0) {
                    ActionRow("Cash", { onCash(bill, payable, transactionId.ifBlank { null }) }, "UPI QR", { showUpiQr = true })
                    ActionRow("Online placeholder", { onOnline(bill, payable) })
                }
                if (showUpiQr && bill != null) {
                    UpiCollectionCard(
                        bill = bill,
                        customers = customers,
                        amount = payable,
                        upiId = upi,
                        onShareInvoice = { onShareInvoice(bill, payable, upi) },
                        onPaymentReceived = { onUpiReceived(bill, payable, upi.ifBlank { null }) }
                    )
                }
            }
        }
    }
}

@Composable
private fun UpiCollectionCard(
    bill: BillingRecord,
    customers: List<CustomerRow>,
    amount: Double,
    upiId: String,
    onShareInvoice: () -> Unit,
    onPaymentReceived: () -> Unit
) {
    val upiUri = remember(upiId, amount, bill.id) { buildUpiPaymentUri(upiId, amount, bill) }
    val qrBitmap = remember(upiUri) { rememberQrBitmap(upiUri) }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("UPI collection QR", style = MaterialTheme.typography.titleMedium)
            Text(invoiceShareText(bill, amount, upiId, customers))
            if (upiId.isBlank()) {
                Text("Enter your UPI ID to generate the payment QR.")
            } else {
                Image(
                    bitmap = qrBitmap.asImageBitmap(),
                    contentDescription = "UPI payment QR",
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = onShareInvoice, modifier = Modifier.weight(1f)) {
                        Text("Share WhatsApp")
                    }
                    Button(onClick = onPaymentReceived, modifier = Modifier.weight(1f)) {
                        Text("Payment Received")
                    }
                }
            }
        }
    }
}

private fun BillingRecord.displayLabel(customers: List<CustomerRow>): String {
    val customerName = customers.firstOrNull { it.id == customerId }?.displayName ?: "Customer"
    val invoice = invoiceNumber.ifBlank { id.orEmpty().take(8) }
    return "$invoice - $customerName - %02d/%04d".format(month, year)
}

private fun rememberQrBitmap(payload: String): Bitmap {
    val matrix = MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, 512, 512)
    return Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888).apply {
        for (x in 0 until 512) {
            for (y in 0 until 512) {
                setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
    }
}

private fun buildUpiPaymentUri(upiId: String, amount: Double, bill: BillingRecord): String =
    Uri.Builder()
        .scheme("upi")
        .authority("pay")
        .appendQueryParameter("pa", upiId)
        .appendQueryParameter("pn", "DairyFlow")
        .appendQueryParameter("am", "%.2f".format(amount))
        .appendQueryParameter("cu", "INR")
        .appendQueryParameter("tn", "Invoice ${bill.invoiceNumber.ifBlank { bill.id.orEmpty() }}")
        .build()
        .toString()

private fun invoiceShareText(bill: BillingRecord, amount: Double, upiId: String, customers: List<CustomerRow>): String {
    val customer = customers.firstOrNull { it.id == bill.customerId }?.displayName ?: "Customer"
    return buildString {
        appendLine("DairyFlow Invoice")
        appendLine("Customer: $customer")
        appendLine("Invoice: ${bill.invoiceNumber.ifBlank { bill.id.orEmpty() }}")
        appendLine("Month: %02d/%04d".format(bill.month, bill.year))
        appendLine("Total: Rs %.2f".format(bill.totalAmount))
        appendLine("Paid: Rs %.2f".format(bill.paidAmount))
        appendLine("Amount due: Rs %.2f".format(amount))
        if (upiId.isNotBlank()) appendLine("UPI ID: $upiId")
        appendLine()
        append("Thank you.")
    }
}

private fun shareInvoiceOnWhatsApp(
    context: Context,
    bill: BillingRecord,
    amount: Double,
    upiId: String,
    customers: List<CustomerRow>
) {
    val text = invoiceShareText(bill, amount, upiId, customers)
    val qrUri = upiId.takeIf { it.isNotBlank() }?.let {
        val payload = buildUpiPaymentUri(it, amount, bill)
        saveQrBitmapForSharing(context, bill, payload)
    }
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = if (qrUri != null) "image/png" else "text/plain"
        setPackage("com.whatsapp")
        putExtra(Intent.EXTRA_TEXT, text)
        qrUri?.let {
            putExtra(Intent.EXTRA_STREAM, it)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }
    runCatching {
        context.startActivity(intent)
    }.onFailure {
        context.startActivity(Intent.createChooser(intent.apply { setPackage(null) }, "Share invoice"))
    }
}

private fun saveQrBitmapForSharing(context: Context, bill: BillingRecord, payload: String): Uri {
    val dir = File(context.cacheDir, "shared_qr").apply { mkdirs() }
    val invoiceKey = bill.invoiceNumber.ifBlank { bill.id.orEmpty().ifBlank { "invoice" } }
        .replace(Regex("[^A-Za-z0-9._-]"), "_")
    val file = File(dir, "upi_qr_$invoiceKey.png")
    FileOutputStream(file).use { output ->
        rememberQrBitmap(payload).compress(Bitmap.CompressFormat.PNG, 100, output)
    }
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
