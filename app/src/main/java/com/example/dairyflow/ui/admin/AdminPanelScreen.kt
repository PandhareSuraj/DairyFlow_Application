package com.example.dairyflow.ui.admin

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.AdminCustomer
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
import com.example.dairyflow.data.model.AdminDeliveryBoy
import com.example.dairyflow.data.model.AdminDeliveryShift
import com.example.dairyflow.data.model.AdminDeliveryStatus
import com.example.dairyflow.data.model.AdminPayment
import com.example.dairyflow.data.model.AdminPaymentMethod
import com.example.dairyflow.data.model.AdminProfile
import com.example.dairyflow.data.model.AdminRole
import com.example.dairyflow.data.model.Invoice
import com.example.dairyflow.data.model.InvoiceStatus
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.ProductType
import com.example.dairyflow.data.model.ProductUnit
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.MetricCard
import com.example.dairyflow.ui.viewmodel.AdminViewModel
import com.example.dairyflow.ui.viewmodel.currentMonth
import com.example.dairyflow.ui.viewmodel.currentYear
import com.example.dairyflow.ui.viewmodel.todayIsoDate

private enum class AdminSection(val label: String) {
    DASHBOARD("Dashboard"),
    PRODUCTS("Products"),
    CUSTOMERS("Customers"),
    DELIVERY_BOYS("Delivery Boys"),
    DELIVERIES("Deliveries"),
    INVOICES("Invoices"),
    PAYMENTS("Payments"),
    USERS("Users"),
    SETTINGS("Settings")
}

@Composable
fun AdminPanelScreen(viewModel: AdminViewModel) {
    var section by remember { mutableStateOf(AdminSection.DASHBOARD) }
    val dataState by viewModel.dataState.collectAsState()
    val dashboardState by viewModel.dashboardState.collectAsState()
    val generationState by viewModel.generationState.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    Scaffold { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("Admin Panel", style = MaterialTheme.typography.headlineSmall)
                SectionChooser(section) { section = it }
            }
            if (dataState.isLoading && dataState.data == null) {
                item { LoadingState() }
            }
            dataState.error?.let { item { ErrorState(it, onRetry = { viewModel.load() }) } }
            dashboardState.error?.let { item { ErrorState(it, onRetry = { viewModel.load() }) } }
            when (section) {
                AdminSection.DASHBOARD -> item {
                    AdminDashboardContent(
                        stats = dashboardState.data,
                        onSection = { section = it },
                        onRefresh = { viewModel.load() }
                    )
                }
                AdminSection.PRODUCTS -> item {
                    ProductsContent(dataState.data.orEmpty(), viewModel)
                }
                AdminSection.CUSTOMERS -> item {
                    AdminCustomersContent(dataState.data.orEmpty(), viewModel)
                }
                AdminSection.DELIVERY_BOYS -> item {
                    DeliveryBoysContent(dataState.data.orEmpty(), viewModel)
                }
                AdminSection.DELIVERIES -> item {
                    DeliveriesContent(dataState.data.orEmpty(), viewModel)
                }
                AdminSection.INVOICES -> item {
                    InvoicesContent(dataState.data.orEmpty(), generationState.data?.messages.orEmpty(), viewModel)
                }
                AdminSection.PAYMENTS -> item {
                    PaymentsContent(dataState.data.orEmpty(), viewModel)
                }
                AdminSection.USERS -> item {
                    UsersContent(dataState.data.orEmpty(), viewModel)
                }
                AdminSection.SETTINGS -> item {
                    SettingsContent()
                }
            }
        }
    }
}

private fun AdminDataBundle?.orEmpty(): AdminDataBundle = this ?: AdminDataBundle()

@Composable
private fun SectionChooser(selected: AdminSection, onSelect: (AdminSection) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AdminSection.entries.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { item ->
                    FilterChip(selected = selected == item, onClick = { onSelect(item) }, label = { Text(item.label) })
                }
            }
        }
    }
}

@Composable
private fun AdminDashboardContent(stats: com.example.dairyflow.data.model.AdminDashboardStats?, onSection: (AdminSection) -> Unit, onRefresh: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Products", "${stats?.totalProducts ?: 0}", Modifier.weight(1f))
            MetricCard("Customers", "${stats?.totalCustomers ?: 0}", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Delivery boys", "${stats?.totalDeliveryBoys ?: 0}", Modifier.weight(1f))
            MetricCard("Today deliveries", "${stats?.todayDeliveries ?: 0}", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Pending bills", "${stats?.pendingBills ?: 0}", Modifier.weight(1f))
            MetricCard("Monthly revenue", "Rs %.2f".format(stats?.monthlyRevenue ?: 0.0), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Previous pending", "Rs %.2f".format(stats?.previousPendingAmount ?: 0.0), Modifier.weight(1f))
            MetricCard("Collected", "Rs %.2f".format(stats?.totalCollectedAmount ?: 0.0), Modifier.weight(1f))
        }
        MetricCard("Unpaid customers", "${stats?.totalUnpaidCustomers ?: 0}")
        QuickActions(onSection, onRefresh)
    }
}

@Composable
private fun QuickActions(onSection: (AdminSection) -> Unit, onRefresh: () -> Unit) {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Quick actions")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSection(AdminSection.PRODUCTS) }) { Text("Add Product") }
                Button({ onSection(AdminSection.CUSTOMERS) }) { Text("Add Customer") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSection(AdminSection.DELIVERY_BOYS) }) { Text("Add Delivery Boy") }
                Button({ onSection(AdminSection.DELIVERIES) }) { Text("Create Delivery") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSection(AdminSection.INVOICES) }) { Text("Generate Invoice") }
                Button({ onSection(AdminSection.PAYMENTS) }) { Text("View Payments") }
            }
            OutlinedButton(onClick = onRefresh) { Text("Pull to refresh") }
        }
    }
}

@Composable
private fun ProductsContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    var editing by remember { mutableStateOf<Product?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ProductForm(editing) {
            viewModel.saveProduct(it)
            editing = null
        }
        if (data.products.isEmpty()) EmptyState("No products yet.") else data.products.forEach { product ->
            EntityCard(
                title = product.productName,
                subtitle = "${product.productType.name.lowercase()} • ${product.stockQuantity} ${product.unit.name.lowercase()} • Rs ${product.pricePerUnit}",
                active = product.isActive,
                onEdit = { editing = product },
                onDelete = { product.id?.let(viewModel::deleteProduct) }
            )
        }
    }
}

@Composable
private fun ProductForm(editing: Product?, onSave: (Product) -> Unit) {
    var name by remember(editing?.id) { mutableStateOf(editing?.productName.orEmpty()) }
    var type by remember(editing?.id) { mutableStateOf(editing?.productType ?: ProductType.MILK) }
    var unit by remember(editing?.id) { mutableStateOf(editing?.unit ?: ProductUnit.LITER) }
    var price by remember(editing?.id) { mutableStateOf(editing?.pricePerUnit?.toString().orEmpty()) }
    var stock by remember(editing?.id) { mutableStateOf(editing?.stockQuantity?.toString().orEmpty()) }
    var active by remember(editing?.id) { mutableStateOf(editing?.isActive ?: true) }
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (editing == null) "Add product" else "Edit product")
            OutlinedTextField(name, { name = it }, label = { Text("Product name") }, modifier = Modifier.fillMaxWidth())
            ChipEnum(ProductType.entries, type) { type = it }
            ChipEnum(ProductUnit.entries, unit) { unit = it }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(price, { price = it }, label = { Text("Price/unit") }, modifier = Modifier.weight(1f))
                OutlinedTextField(stock, { stock = it }, label = { Text("Stock") }, modifier = Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Active")
                Switch(active, { active = it })
            }
            Button(onClick = {
                onSave(Product(editing?.id, name, type, unit, price.toDoubleOrNull() ?: 0.0, stock.toDoubleOrNull() ?: 0.0, active, editing?.createdAt))
            }, enabled = name.isNotBlank()) { Text("Save product") }
        }
    }
}

@Composable
private fun AdminCustomersContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    var editing by remember { mutableStateOf<AdminCustomer?>(null) }
    var search by remember { mutableStateOf("") }
    val filtered = data.customers.filter { it.fullName.contains(search, true) || it.mobileNumber.orEmpty().contains(search) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(search, { search = it }, label = { Text("Search customers") }, modifier = Modifier.fillMaxWidth())
        AdminCustomerForm(editing, data) {
            viewModel.saveCustomer(it)
            editing = null
        }
        if (filtered.isEmpty()) EmptyState("No customers found.") else filtered.forEach { customer ->
            EntityCard(
                title = customer.fullName,
                subtitle = "${customer.mobileNumber.orEmpty()} • route ${customer.routeId ?: "-"} • due opening Rs ${customer.openingPendingBalance}",
                active = customer.isActive,
                onEdit = { editing = customer },
                onDelete = { customer.id?.let(viewModel::deleteCustomer) }
            )
        }
    }
}

@Composable
private fun AdminCustomerForm(editing: AdminCustomer?, data: AdminDataBundle, onSave: (AdminCustomer) -> Unit) {
    var name by remember(editing?.id) { mutableStateOf(editing?.fullName.orEmpty()) }
    var mobile by remember(editing?.id) { mutableStateOf(editing?.mobileNumber.orEmpty()) }
    var address by remember(editing?.id) { mutableStateOf(editing?.address.orEmpty()) }
    var route by remember(editing?.id) { mutableStateOf(editing?.routeId.orEmpty()) }
    var product by remember(editing?.id) { mutableStateOf(editing?.defaultProductId.orEmpty()) }
    var morning by remember(editing?.id) { mutableStateOf(editing?.morningQuantity?.toString().orEmpty()) }
    var evening by remember(editing?.id) { mutableStateOf(editing?.eveningQuantity?.toString().orEmpty()) }
    var rate by remember(editing?.id) { mutableStateOf(editing?.rate?.toString().orEmpty()) }
    var pending by remember(editing?.id) { mutableStateOf(editing?.openingPendingBalance?.toString().orEmpty()) }
    var active by remember(editing?.id) { mutableStateOf(editing?.isActive ?: true) }
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (editing == null) "Add customer" else "Edit customer")
            OutlinedTextField(name, { name = it }, label = { Text("Full name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(mobile, { mobile = it }, label = { Text("Mobile number") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(address, { address = it }, label = { Text("Address / area") }, modifier = Modifier.fillMaxWidth())
            IdChooser("Route", route, data.routes.mapNotNull { item -> item.id?.let { it to item.routeName } }.toMap()) { route = it }
            IdChooser("Default product", product, data.products.mapNotNull { item -> item.id?.let { it to item.productName } }.toMap()) { product = it }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(morning, { morning = it }, label = { Text("Morning qty") }, modifier = Modifier.weight(1f))
                OutlinedTextField(evening, { evening = it }, label = { Text("Evening qty") }, modifier = Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(rate, { rate = it }, label = { Text("Rate") }, modifier = Modifier.weight(1f))
                OutlinedTextField(pending, { pending = it }, label = { Text("Opening pending") }, modifier = Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Active")
                Switch(active, { active = it })
            }
            Button(onClick = {
                val m = morning.toDoubleOrNull() ?: 0.0
                val e = evening.toDoubleOrNull() ?: 0.0
                onSave(
                    AdminCustomer(
                        id = editing?.id,
                        profileId = editing?.profileId,
                        fullName = name,
                        mobileNumber = mobile.ifBlank { null },
                        address = address.ifBlank { null },
                        area = address.ifBlank { null },
                        routeId = route.ifBlank { null },
                        defaultProductId = product.ifBlank { null },
                        dailyQuantity = m + e,
                        morningQuantity = m,
                        eveningQuantity = e,
                        rate = rate.toDoubleOrNull() ?: 0.0,
                        isActive = active,
                        openingPendingBalance = pending.toDoubleOrNull() ?: 0.0,
                        createdAt = editing?.createdAt
                    )
                )
            }, enabled = name.isNotBlank()) { Text("Save customer") }
        }
    }
}

@Composable
private fun DeliveryBoysContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    var editing by remember { mutableStateOf<AdminDeliveryBoy?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        DeliveryBoyForm(editing, data) {
            viewModel.saveDeliveryBoy(it)
            editing = null
        }
        if (data.deliveryBoys.isEmpty()) EmptyState("No delivery boys yet.") else data.deliveryBoys.forEach { boy ->
            val assigned = data.customers.count { it.routeId == boy.assignedRouteId }
            EntityCard(
                title = boy.name,
                subtitle = "${boy.mobileNumber.orEmpty()} • ${boy.email.orEmpty()} • $assigned assigned customers",
                active = boy.isActive,
                onEdit = { editing = boy },
                onDelete = { boy.id?.let(viewModel::deleteDeliveryBoy) }
            )
        }
    }
}

@Composable
private fun DeliveryBoyForm(editing: AdminDeliveryBoy?, data: AdminDataBundle, onSave: (AdminDeliveryBoy) -> Unit) {
    var name by remember(editing?.id) { mutableStateOf(editing?.name.orEmpty()) }
    var mobile by remember(editing?.id) { mutableStateOf(editing?.mobileNumber.orEmpty()) }
    var email by remember(editing?.id) { mutableStateOf(editing?.email.orEmpty()) }
    var route by remember(editing?.id) { mutableStateOf(editing?.assignedRouteId.orEmpty()) }
    var active by remember(editing?.id) { mutableStateOf(editing?.isActive ?: true) }
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (editing == null) "Add delivery boy" else "Edit delivery boy")
            OutlinedTextField(name, { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(mobile, { mobile = it }, label = { Text("Mobile number") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(email, { email = it }, label = { Text("Email / login ID") }, modifier = Modifier.fillMaxWidth())
            IdChooser("Assigned route", route, data.routes.mapNotNull { item -> item.id?.let { it to item.routeName } }.toMap()) { route = it }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Active")
                Switch(active, { active = it })
            }
            Button(onClick = {
                onSave(AdminDeliveryBoy(editing?.id, editing?.profileId, name, mobile.ifBlank { null }, email.ifBlank { null }, route.ifBlank { null }, active, editing?.createdAt))
            }, enabled = name.isNotBlank()) { Text("Save delivery boy") }
        }
    }
}

@Composable
private fun DeliveriesContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    var date by remember { mutableStateOf(todayIsoDate()) }
    var route by remember { mutableStateOf("") }
    var product by remember { mutableStateOf("") }
    var deliveryBoy by remember { mutableStateOf("") }
    var skipTarget by remember { mutableStateOf<AdminDelivery?>(null) }
    var skipReason by remember { mutableStateOf("") }
    val filtered = data.deliveries.filter {
        it.deliveryDate == date &&
            (route.isBlank() || it.routeId == route) &&
            (product.isBlank() || it.productId == product) &&
            (deliveryBoy.isBlank() || it.deliveryBoyId == deliveryBoy)
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(date, { date = it }, label = { Text("Date yyyy-mm-dd") }, modifier = Modifier.fillMaxWidth())
        IdChooser("Route filter", route, data.routes.mapNotNull { item -> item.id?.let { it to item.routeName } }.toMap()) { route = it }
        IdChooser("Product filter", product, data.products.mapNotNull { item -> item.id?.let { it to item.productName } }.toMap()) { product = it }
        IdChooser("Delivery boy filter", deliveryBoy, data.deliveryBoys.mapNotNull { item -> item.id?.let { it to item.name } }.toMap()) { deliveryBoy = it }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button({ viewModel.createDailyDeliveries(date, route.ifBlank { null }) }) { Text("Create Delivery") }
            OutlinedButton({ viewModel.load(date) }) { Text("Pull to refresh") }
        }
        if (filtered.isEmpty()) EmptyState("No deliveries for selected filters.") else filtered.forEach { delivery ->
            DeliveryRow(delivery, data, onSave = viewModel::saveDelivery, onSkip = { skipTarget = delivery })
        }
    }
    skipTarget?.let { delivery ->
        AlertDialog(
            onDismissRequest = { skipTarget = null },
            title = { Text("Skip Today") },
            text = {
                OutlinedTextField(skipReason, { skipReason = it }, label = { Text("Reason / note") }, modifier = Modifier.fillMaxWidth())
            },
            confirmButton = {
                Button({
                    viewModel.skipDelivery(delivery, skipReason)
                    skipTarget = null
                    skipReason = ""
                }) { Text("Skip Today") }
            },
            dismissButton = { TextButton({ skipTarget = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun DeliveryRow(delivery: AdminDelivery, data: AdminDataBundle, onSave: (AdminDelivery) -> Unit, onSkip: () -> Unit) {
    var qty by remember(delivery.id) { mutableStateOf(delivery.quantity.toString()) }
    var notes by remember(delivery.id) { mutableStateOf(delivery.notes.orEmpty()) }
    var status by remember(delivery.id) { mutableStateOf(delivery.status) }
    val customer = data.customers.firstOrNull { it.id == delivery.customerId }?.fullName ?: delivery.customerId
    val product = data.products.firstOrNull { it.id == delivery.productId }?.productName ?: delivery.productId
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("$customer • $product • ${delivery.deliveryShift.name.lowercase()}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(qty, { qty = it }, label = { Text("Quantity") }, modifier = Modifier.weight(1f))
                OutlinedTextField(notes, { notes = it }, label = { Text("Notes") }, modifier = Modifier.weight(1f))
            }
            ChipEnum(AdminDeliveryStatus.entries, status) { status = it }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSave(delivery.copy(quantity = qty.toDoubleOrNull() ?: 0.0, totalAmount = (qty.toDoubleOrNull() ?: 0.0) * delivery.unitPrice, status = status, notes = notes.ifBlank { null })) }) {
                    Text("Save")
                }
                OutlinedButton(onClick = onSkip) { Text("Skip Today") }
            }
        }
    }
}

@Composable
private fun InvoicesContent(data: AdminDataBundle, messages: List<String>, viewModel: AdminViewModel) {
    var month by remember { mutableStateOf(currentMonth().toString()) }
    var year by remember { mutableStateOf(currentYear().toString()) }
    var customer by remember { mutableStateOf("") }
    var route by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<Invoice?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Generate Monthly Invoices")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(month, { month = it }, label = { Text("Month") }, modifier = Modifier.weight(1f))
                    OutlinedTextField(year, { year = it }, label = { Text("Year") }, modifier = Modifier.weight(1f))
                }
                IdChooser("Single customer", customer, data.customers.mapNotNull { item -> item.id?.let { it to item.fullName } }.toMap()) { customer = it }
                IdChooser("Selected route", route, data.routes.mapNotNull { item -> item.id?.let { it to item.routeName } }.toMap()) { route = it }
                Button({ viewModel.generateMonthlyInvoices(month.toIntOrNull() ?: currentMonth(), year.toIntOrNull() ?: currentYear(), customer, route) }) {
                    Text("Generate Monthly Invoices")
                }
                messages.take(3).forEach { Text(it, style = MaterialTheme.typography.bodySmall) }
            }
        }
        if (data.invoices.isEmpty()) EmptyState("No invoices yet.") else data.invoices.forEach { invoice ->
            EntityCard(
                title = invoice.invoiceNumber,
                subtitle = "${invoice.billingMonth}/${invoice.billingYear} • total Rs ${invoice.totalBillAmount} • pending Rs ${invoice.pendingAmount} • ${invoice.invoiceStatus.name.lowercase()}",
                active = invoice.invoiceStatus == InvoiceStatus.PAID,
                onEdit = { selected = invoice },
                onDelete = { viewModel.markInvoicePaid(invoice) },
                editLabel = "Details",
                deleteLabel = "Mark paid"
            )
        }
    }
    selected?.let {
        InvoiceDetailsDialog(it, data, viewModel) { selected = null }
    }
}

@Composable
private fun InvoiceDetailsDialog(invoice: Invoice, data: AdminDataBundle, viewModel: AdminViewModel, onClose: () -> Unit) {
    val context = LocalContext.current
    val customer = data.customers.firstOrNull { it.id == invoice.customerId }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("DairyFlow Invoice") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("Invoice: ${invoice.invoiceNumber}")
                Text("Customer: ${customer?.fullName ?: invoice.customerId}")
                Text("Billing: ${invoice.billingMonth}/${invoice.billingYear}")
                Text("Monthly amount: Rs ${invoice.monthlyDeliveryAmount}")
                Text("Previous pending: Rs ${invoice.previousPendingAmount}")
                Text("Paid: Rs ${invoice.paidAmount}")
                Text("Final pending: Rs ${invoice.pendingAmount}")
                Text("Due date: ${invoice.dueDate ?: "-"}")
                Text("Status: ${invoice.invoiceStatus.name.lowercase()}")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton({ }) { Text("Download PDF") }
                    OutlinedButton({ }) { Text("Print") }
                }
                OutlinedButton({ }) { Text("Add payment") }
            }
        },
        confirmButton = {
            Button({
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, "DairyFlow invoice ${invoice.invoiceNumber}: pending Rs ${invoice.pendingAmount}")
                }
                context.startActivity(Intent.createChooser(share, "Share invoice"))
            }) { Text("WhatsApp Share") }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton({ viewModel.markInvoicePaid(invoice); onClose() }) { Text("Mark paid") }
                TextButton(onClose) { Text("Close") }
            }
        }
    )
}

@Composable
private fun PaymentsContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    var invoiceId by remember { mutableStateOf("") }
    var customerId by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var transactionId by remember { mutableStateOf("") }
    var method by remember { mutableStateOf(AdminPaymentMethod.CASH) }
    var date by remember { mutableStateOf(todayIsoDate()) }
    val invoice = data.invoices.firstOrNull { it.id == invoiceId }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Add payment")
                IdChooser("Invoice", invoiceId, data.invoices.mapNotNull { item -> item.id?.let { it to item.invoiceNumber } }.toMap()) {
                    invoiceId = it
                    customerId = data.invoices.firstOrNull { invoice -> invoice.id == it }?.customerId.orEmpty()
                }
                OutlinedTextField(customerId, { customerId = it }, label = { Text("Customer ID") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(amount, { amount = it }, label = { Text("Amount") }, modifier = Modifier.fillMaxWidth())
                ChipEnum(AdminPaymentMethod.entries, method) { method = it }
                OutlinedTextField(transactionId, { transactionId = it }, label = { Text("Transaction ID") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(date, { date = it }, label = { Text("Payment date") }, modifier = Modifier.fillMaxWidth())
                Button({
                    val resolvedInvoice = invoice
                    if (resolvedInvoice != null) {
                        viewModel.addPayment(
                            AdminPayment(
                                invoiceId = resolvedInvoice.id.orEmpty(),
                                customerId = customerId.ifBlank { resolvedInvoice.customerId },
                                amount = amount.toDoubleOrNull() ?: 0.0,
                                paymentMethod = method,
                                transactionId = transactionId.ifBlank { null },
                                paymentDate = date
                            )
                        )
                    }
                }, enabled = invoiceId.isNotBlank() && amount.toDoubleOrNull() != null) { Text("Record payment") }
            }
        }
        if (data.payments.isEmpty()) EmptyState("No payment history.") else data.payments.forEach {
            Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Rs ${it.amount} • ${it.paymentMethod.name.lowercase()} • ${it.paymentDate}")
                    Text("Invoice ${it.invoiceId} • Txn ${it.transactionId ?: "-"}")
                }
            }
        }
    }
}

@Composable
private fun UsersContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    if (data.profiles.isEmpty()) {
        EmptyState("No users found in profiles.")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        data.profiles.forEach { profile ->
            var role by remember(profile.id) { mutableStateOf(profile.role) }
            var active by remember(profile.id) { mutableStateOf(profile.isActive) }
            Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(profile.fullName ?: profile.email ?: profile.id)
                    Text(profile.email ?: profile.phone ?: "No contact")
                    ChipEnum(AdminRole.entries, role) { role = it }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Enabled")
                        Switch(active, { active = it })
                    }
                    Text("Permissions: ${permissionsFor(role).joinToString()}")
                    Button({ viewModel.saveProfile(profile.copy(role = role, isActive = active, permissions = permissionsFor(role))) }) {
                        Text("Save role")
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsContent() {
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Settings")
            Text("Supabase is configured through BuildConfig using only SUPABASE_URL and SUPABASE_ANON_KEY.")
            Text("Admin permissions are enforced by Supabase RLS policies in the migration.")
        }
    }
}

private fun permissionsFor(role: AdminRole): List<String> = when (role) {
    AdminRole.ADMIN -> listOf("manage_all")
    AdminRole.DELIVERY_BOY -> listOf("view_assigned_deliveries", "update_delivery_status")
    AdminRole.CUSTOMER -> listOf("view_own_invoices", "view_own_payments")
}

@Composable
private fun EntityCard(
    title: String,
    subtitle: String,
    active: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    editLabel: String = "Edit",
    deleteLabel: String = "Delete"
) {
    var confirm by remember { mutableStateOf(false) }
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium)
            Text(if (active) "Active" else "Inactive", style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onEdit) { Text(editLabel) }
                OutlinedButton(onClick = { confirm = true }) { Text(deleteLabel) }
            }
        }
    }
    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text("Confirm") },
            text = { Text("Continue with $deleteLabel?") },
            confirmButton = { Button({ onDelete(); confirm = false }) { Text(deleteLabel) } },
            dismissButton = { TextButton({ confirm = false }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun IdChooser(label: String, selected: String, options: Map<String, String>, onSelected: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        OutlinedTextField(selected, onSelected, label = { Text(label) }, modifier = Modifier.fillMaxWidth())
        if (options.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                options.entries.take(3).forEach { (id, title) ->
                    FilterChip(selected = selected == id, onClick = { onSelected(id) }, label = { Text(title.take(12)) })
                }
            }
        }
    }
}

@Composable
private fun <T : Enum<T>> ChipEnum(values: List<T>, selected: T, onSelected: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        values.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { value ->
                    FilterChip(selected = selected == value, onClick = { onSelected(value) }, label = { Text(value.name.lowercase().replace('_', ' ')) })
                }
            }
        }
    }
}
