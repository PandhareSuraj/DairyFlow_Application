package com.example.dairyflow.ui.payment

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.example.dairyflow.data.model.BillStatus
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.data.model.PaymentMethod
import com.example.dairyflow.ui.common.ActionRow
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.localization.LocalDairyStrings
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.PaymentsViewModel
import com.example.dairyflow.ui.viewmodel.currentMonth
import com.example.dairyflow.ui.viewmodel.currentYear
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import java.io.File
import java.io.FileOutputStream

@Composable
fun PaymentsScreen(viewModel: PaymentsViewModel) {
    val strings = LocalDairyStrings.current
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var mode by remember { mutableStateOf(PaymentsMode.GENERATE_INVOICE) }
    var selectedInvoiceForPayment by remember { mutableStateOf<BillingRecord?>(null) }
    var selectedInvoiceDetails by remember { mutableStateOf<BillingRecord?>(null) }
    var selectedPayment by remember { mutableStateOf<PaymentDetails?>(null) }
    val paymentPrefs = remember(context) { context.getSharedPreferences("dairyflow_payments", Context.MODE_PRIVATE) }
    var adminUpiId by remember { mutableStateOf(paymentPrefs.getString("admin_upi_id", "").orEmpty()) }
    LaunchedEffect(Unit) { viewModel.load() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { DairyDashboardHeader(title = strings.payments, subtitle = strings.manageDailyOperations) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = { mode = PaymentsMode.GENERATE_INVOICE }, modifier = Modifier.weight(1f)) {
                    Text("Generate Invoice")
                }
                Button(onClick = { mode = PaymentsMode.PAYMENT_MENU }, modifier = Modifier.weight(1f)) {
                    Text("Payment")
                }
            }
        }

        when (mode) {
            PaymentsMode.GENERATE_INVOICE -> {
                item {
                    InvoiceQuickEntry(
                        customers = state.data?.customers.orEmpty(),
                        isLoading = state.isLoading,
                        onGenerate = { customerId, month -> viewModel.generateInvoice(customerId, month) }
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
            }
            PaymentsMode.PAYMENT_MENU -> item {
                PaymentMenuCard(
                    onInvoices = { mode = PaymentsMode.INVOICES },
                    onHistory = { mode = PaymentsMode.PAYMENT_HISTORY }
                )
            }
            PaymentsMode.INVOICES -> {
                item { SectionTitle("Invoices") }
                if (state.isLoading && state.data != null) item { RefreshingState("Refreshing invoices...") }
                when {
                    state.isLoading && state.data == null -> item { LoadingState("Loading invoices...") }
                    state.error != null -> item { ErrorState(state.error ?: "Error", viewModel::load) }
                    state.data?.bills.isNullOrEmpty() -> item { EmptyState("No invoices generated yet.") }
                    else -> items(state.data?.bills.orEmpty(), key = { it.id ?: it.invoiceNumber }) { invoice ->
                        InvoiceCard(
                            invoice = invoice,
                            customers = state.data?.customers.orEmpty(),
                            onMakePayment = { selectedInvoiceForPayment = invoice },
                            onDetails = { selectedInvoiceDetails = invoice }
                        )
                    }
                }
            }
            PaymentsMode.PAYMENT_HISTORY -> {
                item { SectionTitle("Payment history") }
                if (state.isLoading && state.data != null) item { RefreshingState("Refreshing payments...") }
                when {
                    state.isLoading && state.data == null -> item { LoadingState("Loading payments...") }
                    state.error != null -> item { ErrorState(state.error ?: "Error", viewModel::load) }
                    state.data?.payments.isNullOrEmpty() -> item { EmptyState("No payments recorded yet.") }
                    else -> items(state.data?.payments.orEmpty(), key = { it.id ?: "${it.billingRecordId}-${it.amount}" }) { payment ->
                        val customers = state.data?.customers.orEmpty()
                        val bills = state.data?.bills.orEmpty()
                        val customerName = customers.firstOrNull { it.id == payment.customerId }?.displayName ?: "Customer"
                        val bill = bills.firstOrNull { it.id == payment.invoiceId }
                        val invoiceLabel = if (payment.isAdvancePayment) {
                            "Advance Payment"
                        } else {
                            bill?.displayLabel(customers) ?: payment.invoiceId?.let { "Invoice ${it.take(8)}" } ?: customerName
                        }
                        PaymentHistoryCard(
                            payment = payment,
                            customerName = customerName,
                            invoiceLabel = invoiceLabel,
                            onDetails = {
                                selectedPayment = PaymentDetails(
                                    payment = payment,
                                    customerName = customerName,
                                    invoiceLabel = invoiceLabel
                                )
                            },
                            onDelete = payment.id?.let { id -> { viewModel.deletePayment(id) } }
                        )
                    }
                }
            }
        }
    }

    selectedInvoiceForPayment?.let { invoice ->
        Dialog(onDismissRequest = { selectedInvoiceForPayment = null }) {
            Card(Modifier.fillMaxWidth().heightIn(max = 720.dp)) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Collect payment", style = MaterialTheme.typography.headlineSmall)
                PaymentEntry(
                    invoices = listOf(invoice),
                    customers = state.data?.customers.orEmpty(),
                    adminUpiId = adminUpiId,
                    onAdminUpiIdChange = {
                        adminUpiId = it
                        paymentPrefs.edit().putString("admin_upi_id", it).apply()
                    },
                    onCash = { bill, amount, txn ->
                        viewModel.recordPayment(bill, amount, PaymentMethod.CASH, txn, "Manual cash entry")
                        selectedInvoiceForPayment = null
                    },
                    onUpiReceived = { bill, amount, upi ->
                        viewModel.recordPayment(bill, amount, PaymentMethod.UPI, null, "UPI received${upi?.let { " at $it" } ?: ""}")
                        selectedInvoiceForPayment = null
                    },
                    onShareInvoice = { bill, amount, upi -> shareInvoiceOnWhatsApp(context, bill, amount, upi, state.data?.customers.orEmpty()) },
                    onOnline = { bill, amount ->
                        viewModel.startOnlinePayment(context, bill, amount)
                        selectedInvoiceForPayment = null
                    }
                )
                    TextButton(
                        onClick = { selectedInvoiceForPayment = null },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text("Close")
                    }
                }
            }
        }
    }

    selectedInvoiceDetails?.let { invoice ->
        InvoiceDetailsDialog(
            invoice = invoice,
            customers = state.data?.customers.orEmpty(),
            onShareWhatsApp = {
                shareInvoiceToCustomerWhatsApp(
                    context = context,
                    bill = invoice,
                    amount = invoice.dueAmount,
                    upiId = adminUpiId,
                    customers = state.data?.customers.orEmpty()
                )
            },
            onDismiss = { selectedInvoiceDetails = null }
        )
    }

    selectedPayment?.let { details ->
        PaymentDetailsDialog(details = details, onDismiss = { selectedPayment = null })
    }
}

private enum class PaymentsMode {
    GENERATE_INVOICE,
    PAYMENT_MENU,
    INVOICES,
    PAYMENT_HISTORY
}

@Composable
private fun PaymentMenuCard(onInvoices: () -> Unit, onHistory: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Payment", style = MaterialTheme.typography.titleMedium)
            Button(onClick = onInvoices, modifier = Modifier.fillMaxWidth()) { Text("Invoices") }
            OutlinedButton(onClick = onHistory, modifier = Modifier.fillMaxWidth()) { Text("Payment History") }
        }
    }
}

@Composable
private fun InvoiceCard(
    invoice: BillingRecord,
    customers: List<CustomerRow>,
    onMakePayment: () -> Unit,
    onDetails: () -> Unit
) {
    val customerName = customers.firstOrNull { it.id == invoice.customerId }?.displayName ?: "Customer"
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(customerName, style = MaterialTheme.typography.titleMedium)
            DetailRow("Invoice generated date", DateFormatter.formatDate(invoice.generatedAt))
            DetailRow("Billing month", DateFormatter.formatBillingMonth(invoice.month, invoice.year))
            DetailRow("Total amount", "Rs %.2f".format(invoice.totalAmount))
            DetailRow("Paid amount", "Rs %.2f".format(invoice.paidAmount))
            DetailRow("Pending amount", "Rs %.2f".format(invoice.dueAmount))
            DetailRow("Status", invoice.statusLabel())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Button(onClick = onMakePayment, enabled = invoice.dueAmount > 0.0, modifier = Modifier.weight(1f)) {
                    Text("Make Payment")
                }
                OutlinedButton(onClick = onDetails, modifier = Modifier.weight(1f)) { Text("Details") }
            }
        }
    }
}

@Composable
private fun InvoiceDetailsDialog(
    invoice: BillingRecord,
    customers: List<CustomerRow>,
    onShareWhatsApp: () -> Unit,
    onDismiss: () -> Unit
) {
    val customerName = customers.firstOrNull { it.id == invoice.customerId }?.displayName ?: "Customer"
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Invoice details") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DetailRow("Customer", customerName)
                DetailRow("Invoice ID", invoice.id ?: "-")
                DetailRow("Invoice number", invoice.invoiceNumber.ifBlank { "-" })
                DetailRow("Billing month", DateFormatter.formatBillingMonth(invoice.month, invoice.year))
                DetailRow("Generated date", DateFormatter.formatDate(invoice.generatedAt))
                DetailRow("Total amount", "Rs %.2f".format(invoice.totalAmount))
                DetailRow("Paid amount", "Rs %.2f".format(invoice.paidAmount))
                DetailRow("Balance", "Rs %.2f".format(invoice.dueAmount))
                DetailRow("Status", invoice.statusLabel())
            }
        },
        confirmButton = {
            Button(onClick = onShareWhatsApp) {
                Text("Share WhatsApp")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

@Composable
private fun PaymentHistoryCard(
    payment: Payment,
    customerName: String,
    invoiceLabel: String,
    onDetails: () -> Unit,
    onDelete: (() -> Unit)?
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(customerName, style = MaterialTheme.typography.titleMedium)
            DetailRow("Amount paid", "Rs %.2f".format(payment.amount))
            DetailRow("Payment date", DateFormatter.formatDateTime(payment.paymentDate.ifBlank { payment.createdAt.orEmpty() }))
            DetailRow("Payment mode", if (payment.isAdvancePayment) "Advance Payment" else payment.paymentMethod)
            DetailRow("Invoice ID", payment.invoiceId ?: invoiceLabel)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onDetails, modifier = Modifier.weight(1f)) { Text("Details") }
                if (onDelete != null) {
                    TextButton(onClick = onDelete, modifier = Modifier.weight(1f)) { Text("Delete") }
                }
            }
        }
    }
}

@Composable
private fun PaymentDetailsDialog(details: PaymentDetails, onDismiss: () -> Unit) {
    val payment = details.payment
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Payment details") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DetailRow("Customer", details.customerName)
                DetailRow("Payment amount", "Rs %.2f".format(payment.amount))
                DetailRow("Payment mode", if (payment.isAdvancePayment) "Advance Payment" else payment.paymentMethod)
                DetailRow("Invoice ID", payment.invoiceId ?: "-")
                DetailRow("Invoice", details.invoiceLabel)
                DetailRow("Received by", payment.collectedBy ?: "-")
                DetailRow("Payment date", DateFormatter.formatDateTime(payment.paymentDate.ifBlank { payment.createdAt.orEmpty() }))
                DetailRow("Payment status", "Recorded")
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

private data class PaymentDetails(
    val payment: Payment,
    val customerName: String,
    val invoiceLabel: String
)

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
                DateFormatter.formatBillingMonth(billingMonth),
                {},
                label = { Text("Billing month") },
                readOnly = true,
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
    adminUpiId: String,
    onAdminUpiIdChange: (String) -> Unit,
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
    var showUpiQr by remember(bill?.id) { mutableStateOf(false) }
    val payable = amount.toDoubleOrNull() ?: 0.0

    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
            OutlinedTextField(
                adminUpiId,
                { onAdminUpiIdChange(it.trim()) },
                label = { Text("Your UPI ID") },
                modifier = Modifier.fillMaxWidth()
            )
            if (bill != null && payable > 0.0) {
                ActionRow("Cash", { onCash(bill, payable, transactionId.ifBlank { null }) }, "UPI QR", { showUpiQr = true })
                ActionRow("Online placeholder", { onOnline(bill, payable) })
            }
            if (showUpiQr && bill != null) {
                UpiCollectionCard(
                    bill = bill,
                    customers = customers,
                    amount = payable,
                    upiId = adminUpiId,
                    onShareInvoice = { onShareInvoice(bill, payable, adminUpiId) },
                    onPaymentReceived = { onUpiReceived(bill, payable, adminUpiId.ifBlank { null }) }
                )
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
                    modifier = Modifier.size(220.dp).align(Alignment.CenterHorizontally)
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
    return "$invoice - $customerName - ${DateFormatter.formatBillingMonth(month, year)}"
}

private fun BillingRecord.statusLabel(): String =
    when (billStatus) {
        BillStatus.PAID -> "Paid"
        BillStatus.PARTIAL -> "Partial"
        BillStatus.UNPAID -> "Unpaid"
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
        appendLine("Month: ${DateFormatter.formatBillingMonth(bill.month, bill.year)}")
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

private fun shareInvoiceToCustomerWhatsApp(
    context: Context,
    bill: BillingRecord,
    amount: Double,
    upiId: String,
    customers: List<CustomerRow>
) {
    val customer = customers.firstOrNull { it.id == bill.customerId }
    val phone = customer?.phone?.toWhatsAppPhone()
    val text = invoiceShareText(bill, amount, upiId, customers)
    val uri = if (phone.isNullOrBlank()) {
        Uri.parse("https://wa.me/?text=${Uri.encode(text)}")
    } else {
        Uri.parse("https://wa.me/$phone?text=${Uri.encode(text)}")
    }
    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
        setPackage("com.whatsapp")
    }
    runCatching {
        context.startActivity(intent)
    }.onFailure {
        context.startActivity(Intent.createChooser(intent.apply { setPackage(null) }, "Share invoice"))
    }
}

private fun String.toWhatsAppPhone(): String {
    val digits = filter { it.isDigit() }
    return when {
        digits.length == 10 -> "91$digits"
        digits.startsWith("0") && digits.length == 11 -> "91${digits.drop(1)}"
        else -> digits
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
