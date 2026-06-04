package com.example.dairyflow.ui.admin

import android.content.Intent
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import com.example.dairyflow.BuildConfig
import com.example.dairyflow.data.model.AdminCustomer
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
import com.example.dairyflow.data.model.AdminDeliveryBoy
import com.example.dairyflow.data.model.AdminDeliveryShift
import com.example.dairyflow.data.model.AdminDeliveryStatus
import com.example.dairyflow.data.model.AdminPayment
import com.example.dairyflow.data.model.AdminPaymentMethod
import com.example.dairyflow.data.model.AdminRole
import com.example.dairyflow.data.model.AdminRoute
import com.example.dairyflow.data.model.Invoice
import com.example.dairyflow.data.model.InvoiceStatus
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.ProductType
import com.example.dairyflow.data.model.ProductUnit
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.DairyInfoPanel
import com.example.dairyflow.ui.common.DairyMetricCard
import com.example.dairyflow.ui.common.DairySectionTitle
import com.example.dairyflow.ui.common.DairySummaryCard
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.MetricCard
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.theme.DairyBlueSea
import com.example.dairyflow.ui.theme.DairyGold
import com.example.dairyflow.ui.theme.DairyGreen
import com.example.dairyflow.ui.theme.DairyViolet
import com.example.dairyflow.ui.viewmodel.AdminViewModel
import com.example.dairyflow.ui.viewmodel.currentMonth
import com.example.dairyflow.ui.viewmodel.currentYear
import com.example.dairyflow.ui.viewmodel.todayIsoDate

private enum class AdminSection(val label: String) {
    DASHBOARD("Dashboard"),
    CUSTOMERS("Customers"),
    ROUTES("Routes"),
    DELIVERY_BOYS("Delivery Boys"),
    PRODUCTS("Products"),
    DELIVERIES("Deliveries"),
    PAYMENTS("Payments"),
    BILLING("Billing"),
    REPORTS("Reports"),
    PROFILE("Profile")
}

@Composable
fun AdminPanelScreen(
    viewModel: AdminViewModel,
    startOnDeliveryBoys: Boolean = false,
    deliveryBoySetupOnly: Boolean = false,
    onOpenQrGenerator: (String) -> Unit = {}
) {
    var section by remember { mutableStateOf(if (startOnDeliveryBoys) AdminSection.DELIVERY_BOYS else AdminSection.DASHBOARD) }
    val dataState by viewModel.dataState.collectAsState()
    val dashboardState by viewModel.dashboardState.collectAsState()
    val generationState by viewModel.generationState.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            DairyDashboardHeader(
                title = if (section == AdminSection.DASHBOARD) "Operations Dashboard" else section.label,
                subtitle = if (section == AdminSection.DASHBOARD) {
                    "Today - ${todayIsoDate()}"
                } else {
                    "Review and update ${section.label.lowercase()} records"
                }
            )
            if (deliveryBoySetupOnly) {
                DeliveryBoySetupChooser(section) { section = it }
            } else {
                SectionChooser(section) { section = it }
            }
        }
        if (dataState.isLoading && dataState.data == null) {
            item { LoadingState() }
        }
        if ((dataState.isLoading && dataState.data != null) || (dashboardState.isLoading && dashboardState.data != null)) {
            item { RefreshingState("Refreshing latest changes...") }
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
            AdminSection.ROUTES -> item {
                RoutesContent(dataState.data.orEmpty(), viewModel)
            }
            AdminSection.DELIVERY_BOYS -> item {
                DeliveryBoysContent(dataState.data.orEmpty(), viewModel, onOpenQrGenerator, compactForm = deliveryBoySetupOnly)
            }
            AdminSection.DELIVERIES -> item {
                DeliveriesContent(dataState.data.orEmpty(), viewModel)
            }
            AdminSection.BILLING -> item {
                InvoicesContent(dataState.data.orEmpty(), generationState.data?.messages.orEmpty(), viewModel)
            }
            AdminSection.PAYMENTS -> item {
                PaymentsContent(dataState.data.orEmpty(), viewModel)
            }
            AdminSection.REPORTS -> item {
                ReportsContent(dataState.data.orEmpty())
            }
            AdminSection.PROFILE -> item {
                UsersContent(dataState.data.orEmpty(), viewModel)
            }
        }
    }
}

private fun AdminDataBundle?.orEmpty(): AdminDataBundle = this ?: AdminDataBundle()

@Composable
private fun SectionChooser(selected: AdminSection, onSelect: (AdminSection) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(top = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        AdminSection.entries.forEach { item ->
            FilterChip(
                selected = selected == item,
                onClick = { onSelect(item) },
                label = { Text(item.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = DairyBlueSea,
                    selectedLabelColor = androidx.compose.ui.graphics.Color.White
                )
            )
        }
    }
}

@Composable
private fun DeliveryBoySetupChooser(selected: AdminSection, onSelect: (AdminSection) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = selected == AdminSection.ROUTES,
            onClick = { onSelect(AdminSection.ROUTES) },
            label = { Text("Routes") },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = DairyBlueSea,
                selectedLabelColor = androidx.compose.ui.graphics.Color.White
            ),
            modifier = Modifier.weight(1f)
        )
        FilterChip(
            selected = selected == AdminSection.DELIVERY_BOYS,
            onClick = { onSelect(AdminSection.DELIVERY_BOYS) },
            label = { Text("Delivery boy account") },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = DairyBlueSea,
                selectedLabelColor = androidx.compose.ui.graphics.Color.White
            ),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun AdminDashboardContent(stats: com.example.dairyflow.data.model.AdminDashboardStats?, onSection: (AdminSection) -> Unit, onRefresh: () -> Unit) {
    val showingSampleData = stats == null
    val totalProducts = stats?.totalProducts ?: 18
    val totalCustomers = stats?.totalCustomers ?: 96
    val totalDeliveryBoys = stats?.totalDeliveryBoys ?: 8
    val todayDeliveries = stats?.todayDeliveries ?: 142
    val pendingBills = stats?.pendingBills ?: 12
    val monthlyRevenue = stats?.monthlyRevenue ?: 84250.0
    val previousPending = stats?.previousPendingAmount ?: 18600.0
    val collected = stats?.totalCollectedAmount ?: 51200.0
    val unpaidCustomers = stats?.totalUnpaidCustomers ?: 9

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        DairySummaryCard(
            title = "Tenant summary",
            subtitle = "Morning and evening delivery health at a glance",
            primaryValue = "Rs %.0f".format(monthlyRevenue),
            primaryLabel = "Monthly revenue",
            secondaryValue = todayDeliveries.toString(),
            secondaryLabel = "Today deliveries",
            actionLabel = "Refresh",
            onAction = onRefresh
        )
        if (showingSampleData) {
            DairyInfoPanel(
                title = "Sample dashboard",
                message = "Static placeholder figures are shown until live dashboard data is available.",
                icon = Icons.Filled.Info
            )
        }

        DairySectionTitle("Key metrics")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DairyMetricCard("Products", "$totalProducts", Modifier.weight(1f), Icons.Filled.Inventory2, DairyBlueSea)
            DairyMetricCard("Customers", "$totalCustomers", Modifier.weight(1f), Icons.Filled.Groups, DairyViolet)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DairyMetricCard("Delivery boys", "$totalDeliveryBoys", Modifier.weight(1f), Icons.Filled.Person, DairyGreen)
            DairyMetricCard("Today", "$todayDeliveries", Modifier.weight(1f), Icons.Filled.LocalShipping, DairyBlueSea)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DairyMetricCard("Pending bills", "$pendingBills", Modifier.weight(1f), Icons.AutoMirrored.Filled.ReceiptLong, DairyGold)
            DairyMetricCard("Collected", "Rs %.0f".format(collected), Modifier.weight(1f), Icons.Filled.Payments, DairyGreen)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DairyMetricCard("Previous due", "Rs %.0f".format(previousPending), Modifier.weight(1f), Icons.AutoMirrored.Filled.TrendingUp, DairyGold)
            DairyMetricCard("Unpaid", "$unpaidCustomers", Modifier.weight(1f), Icons.Filled.ShoppingCart, DairyViolet)
        }
        QuickActions(onSection, onRefresh)
    }
}

@Composable
private fun QuickActions(onSection: (AdminSection) -> Unit, onRefresh: () -> Unit) {
    Card(
        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            DairySectionTitle("Quick actions")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSection(AdminSection.PRODUCTS) }, modifier = Modifier.weight(1f)) { Text("Products") }
                Button({ onSection(AdminSection.CUSTOMERS) }, modifier = Modifier.weight(1f)) { Text("Customers") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSection(AdminSection.DELIVERY_BOYS) }, modifier = Modifier.weight(1f)) { Text("Delivery boys") }
                Button({ onSection(AdminSection.DELIVERIES) }, modifier = Modifier.weight(1f)) { Text("Deliveries") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ onSection(AdminSection.BILLING) }, modifier = Modifier.weight(1f)) { Text("Billing") }
                Button({ onSection(AdminSection.PAYMENTS) }, modifier = Modifier.weight(1f)) { Text("Payments") }
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
                subtitle = "${product.productType.name.lowercase()} - ${product.stockQuantity} ${product.unit.name.lowercase()} - Rs ${product.pricePerUnit}",
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
                subtitle = "${customer.mobileNumber.orEmpty()} â€¢ route ${customer.routeId ?: "-"} â€¢ due opening Rs ${customer.openingPendingBalance}",
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
private fun RoutesContent(data: AdminDataBundle, viewModel: AdminViewModel) {
    var editing by remember { mutableStateOf<AdminRoute?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        RouteForm(editing) {
            viewModel.saveRoute(it)
            editing = null
        }
        if (data.routes.isEmpty()) EmptyState("No routes yet.") else data.routes.forEach { route ->
            val customerCount = data.customers.count { it.routeId == route.id }
            EntityCard(
                title = route.routeName,
                subtitle = "${route.area ?: "No area"} - $customerCount customers",
                active = route.isActive,
                onEdit = { editing = route },
                onDelete = { route.id?.let(viewModel::deleteRoute) }
            )
            val routeCustomers = data.customers.filter { it.routeId == route.id }
            if (routeCustomers.isNotEmpty()) {
                Card {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Customers on ${route.routeName}", style = MaterialTheme.typography.titleSmall)
                        routeCustomers.take(8).forEach { customer ->
                            Text("${customer.fullName} - ${customer.mobileNumber ?: "-"}")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RouteForm(editing: AdminRoute?, onSave: (AdminRoute) -> Unit) {
    var name by remember(editing?.id) { mutableStateOf(editing?.routeName.orEmpty()) }
    var area by remember(editing?.id) { mutableStateOf(editing?.area.orEmpty()) }
    var active by remember(editing?.id) { mutableStateOf(editing?.isActive ?: true) }
    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (editing == null) "Add route" else "Edit route")
            OutlinedTextField(name, { name = it }, label = { Text("Route name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(area, { area = it }, label = { Text("Area / notes") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Active")
                Switch(active, { active = it })
            }
            Button(onClick = {
                onSave(AdminRoute(editing?.id, name, area.ifBlank { null }, active, editing?.createdAt))
            }, enabled = name.isNotBlank()) { Text("Save route") }
        }
    }
}

@Composable
private fun DeliveryBoysContent(data: AdminDataBundle, viewModel: AdminViewModel, onOpenQrGenerator: (String) -> Unit, compactForm: Boolean = false) {
    var editing by remember { mutableStateOf<AdminDeliveryBoy?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        DeliveryBoyForm(editing, data, compact = compactForm) {
            viewModel.saveDeliveryBoy(it)
            editing = null
        }
        if (data.deliveryBoys.isEmpty()) {
            EmptyState("No delivery boys yet.")
            if (BuildConfig.DEBUG) {
                Button(
                    onClick = { onOpenQrGenerator("debug-delivery-boy") },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Open Test Login QR")
                }
            }
        } else data.deliveryBoys.forEach { boy ->
            val assigned = data.customers.count { it.routeId == boy.assignedRouteId }
            val routeName = data.routes.firstOrNull { it.id == boy.assignedRouteId }?.routeName
            EntityCard(
                title = boy.name,
                subtitle = listOf(
                    boy.mobileNumber.orEmpty(),
                    boy.email.orEmpty(),
                    "Route: " + (routeName ?: "Not assigned"),
                    "$assigned assigned customers"
                ).filter { it.isNotBlank() }.joinToString(" | "),
                active = boy.isActive,
                onEdit = { editing = boy },
                onDelete = { boy.id?.let(onOpenQrGenerator) },
                editLabel = "Edit",
                deleteLabel = "Login QR"
            )
        }
    }
}

@Composable
private fun DeliveryBoyForm(editing: AdminDeliveryBoy?, data: AdminDataBundle, compact: Boolean = false, onSave: (AdminDeliveryBoy) -> Unit) {
    var name by remember(editing?.id) { mutableStateOf(editing?.name.orEmpty()) }
    var mobile by remember(editing?.id) { mutableStateOf(editing?.mobileNumber.orEmpty()) }
    var email by remember(editing?.id) { mutableStateOf(editing?.email.orEmpty()) }
    var route by remember(editing?.id) { mutableStateOf(editing?.assignedRouteId.orEmpty()) }
    var active by remember(editing?.id) { mutableStateOf(editing?.isActive ?: true) }
    val fieldModifier = if (compact) Modifier.fillMaxWidth().heightIn(min = 48.dp) else Modifier.fillMaxWidth()
    Card {
        Column(
            Modifier.fillMaxWidth().padding(if (compact) 10.dp else 14.dp),
            verticalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 8.dp)
        ) {
            Text(if (editing == null) "Create delivery boy account" else "Edit delivery boy account")
            OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true, modifier = fieldModifier)
            OutlinedTextField(mobile, { mobile = it }, label = { Text("Mobile number") }, singleLine = true, modifier = fieldModifier)
            OutlinedTextField(email, { email = it }, label = { Text("Email / login ID") }, singleLine = true, modifier = fieldModifier)
            RouteSearchDropdown(
                label = "Assigned route",
                selectedRouteId = route,
                routes = data.routes,
                compact = compact,
                onSelected = { route = it }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Active")
                Switch(active, { active = it })
            }
            Button(
                onClick = {
                onSave(AdminDeliveryBoy(editing?.id, editing?.profileId, name, mobile.ifBlank { null }, email.ifBlank { null }, route.ifBlank { null }, active, editing?.createdAt))
                },
                enabled = name.isNotBlank() && email.isNotBlank(),
                modifier = if (compact) Modifier.heightIn(min = 44.dp) else Modifier
            ) { Text(if (editing == null) "Create account" else "Save account") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RouteSearchDropdown(
    label: String,
    selectedRouteId: String,
    routes: List<AdminRoute>,
    compact: Boolean = false,
    onSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    var query by remember(selectedRouteId, routes) {
        mutableStateOf(routes.firstOrNull { it.id == selectedRouteId }?.routeName.orEmpty())
    }
    val selectedRouteName = routes.firstOrNull { it.id == selectedRouteId }?.routeName.orEmpty()
    val filteredRoutes = routes
        .filter { route ->
            query.isBlank() ||
                route.routeName.contains(query, ignoreCase = true) ||
                route.area.orEmpty().contains(query, ignoreCase = true)
        }
        .take(8)

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded },
        modifier = Modifier.fillMaxWidth()
    ) {
        OutlinedTextField(
            value = if (expanded) query else selectedRouteName,
            onValueChange = {
                query = it
                expanded = true
            },
            label = { Text(label) },
            singleLine = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().heightIn(min = if (compact) 48.dp else 56.dp).menuAnchor()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = {
                expanded = false
                query = selectedRouteName
            }
        ) {
            if (filteredRoutes.isEmpty()) {
                DropdownMenuItem(
                    text = { Text("No route found") },
                    onClick = {}
                )
            } else {
                filteredRoutes.forEach { route ->
                    DropdownMenuItem(
                        text = { Text(route.routeName) },
                        onClick = {
                            route.id?.let(onSelected)
                            query = route.routeName
                            expanded = false
                        }
                    )
                }
            }
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
            Text("$customer â€¢ $product â€¢ ${delivery.deliveryShift.name.lowercase()}")
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
                subtitle = "${invoice.billingMonth}/${invoice.billingYear} â€¢ total Rs ${invoice.totalBillAmount} â€¢ pending Rs ${invoice.pendingAmount} â€¢ ${invoice.invoiceStatus.name.lowercase()}",
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
                    Text("Rs ${it.amount} â€¢ ${it.paymentMethod.name.lowercase()} â€¢ ${it.paymentDate}")
                    Text("Invoice ${it.invoiceId} â€¢ Txn ${it.transactionId ?: "-"}")
                }
            }
        }
    }
}

@Composable
private fun ReportsContent(data: AdminDataBundle) {
    val delivered = data.deliveries.count { it.status == AdminDeliveryStatus.DELIVERED }
    val unpaid = data.deliveries.count { it.status == AdminDeliveryStatus.DELIVERED && data.payments.none { payment -> payment.customerId == it.customerId && payment.paymentDate == it.deliveryDate } }
    val skipped = data.deliveries.count { it.status == AdminDeliveryStatus.SKIPPED }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Paid/delivered", "$delivered", Modifier.weight(1f))
            MetricCard("Unpaid", "$unpaid", Modifier.weight(1f))
        }
        MetricCard("Skipped", "$skipped")
        data.deliveryBoys.forEach { boy ->
            val boyDeliveries = data.deliveries.filter { it.deliveryBoyId == boy.id }
            val collections = data.payments.filter { it.transactionId == boy.id }.sumOf { it.amount }
            Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(boy.name, style = MaterialTheme.typography.titleMedium)
                    Text("${boyDeliveries.size} deliveries - Rs %.2f collected".format(collections))
                    Text("Delivered ${boyDeliveries.count { it.status == AdminDeliveryStatus.DELIVERED }}, skipped ${boyDeliveries.count { it.status == AdminDeliveryStatus.SKIPPED }}")
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
        val adminProfile = data.profiles.firstOrNull { it.role == AdminRole.ADMIN }
        adminProfile?.let {
            Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Admin profile", style = MaterialTheme.typography.titleMedium)
                    Text(it.fullName ?: it.email ?: it.id)
                    Text("Access code: ${it.adminAccessCode ?: "Not generated"}")
                }
            }
        }
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
            Text("Supabase is configured through BuildConfig using only SUPABASE_URL and SUPABASE_KEY.")
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
