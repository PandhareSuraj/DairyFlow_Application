package com.example.dairyflow.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
import com.example.dairyflow.data.model.AdminDeliveryBoy
import com.example.dairyflow.data.model.AdminDeliveryStatus
import com.example.dairyflow.ui.admin.AdminPanelScreen
import com.example.dairyflow.ui.admin.deliveryboys.AdminQrGeneratorScreen
import com.example.dairyflow.ui.admin.deliveryboys.DeliveryBoyPaymentCollectionScreen
import com.example.dairyflow.ui.admin.deliveryboys.DeliveryBoyPerformanceScreen
import com.example.dairyflow.ui.auth.AdminOtpLoginScreen
import com.example.dairyflow.ui.auth.DeliveryBoyQrScannerScreen
import com.example.dairyflow.ui.auth.WelcomeLoginTypeScreen
import com.example.dairyflow.ui.billing.BillingScreen
import com.example.dairyflow.ui.customer.AddCustomerScreen
import com.example.dairyflow.ui.customer.CustomerDetailScreen
import com.example.dairyflow.ui.customer.CustomerDeliveryChartScreen
import com.example.dairyflow.ui.customer.CustomerPaymentHistoryScreen
import com.example.dairyflow.ui.customer.CustomersScreen
import com.example.dairyflow.ui.delivery.AddDeliveryScreen
import com.example.dairyflow.ui.delivery.DeliveryScreen
import com.example.dairyflow.ui.deliveryboy.DeliveryBoyDashboardScreen
import com.example.dairyflow.ui.deliveryboy.DeliveryBoyPaymentsScreen
import com.example.dairyflow.ui.dashboard.DashboardScreen
import com.example.dairyflow.ui.payment.PaymentsScreen
import com.example.dairyflow.ui.profile.ProfileScreen
import com.example.dairyflow.ui.product.AddProductScreen
import com.example.dairyflow.ui.reports.ReportsScreen
import com.example.dairyflow.ui.common.DairyBottomNavItem
import com.example.dairyflow.ui.common.DairyBottomNavigation
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.theme.DairyBlueSea
import com.example.dairyflow.data.repository.AppSettingsRepository
import com.example.dairyflow.ui.localization.DairyStrings
import com.example.dairyflow.ui.localization.LocalDairyStrings
import com.example.dairyflow.ui.util.DateFormatter
import com.example.dairyflow.ui.viewmodel.AdminViewModel
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.example.dairyflow.ui.viewmodel.BillingViewModel
import com.example.dairyflow.ui.viewmodel.CustomersViewModel
import com.example.dairyflow.ui.viewmodel.CustomerInsightsViewModel
import com.example.dairyflow.ui.viewmodel.DashboardViewModel
import com.example.dairyflow.ui.viewmodel.DairyFlowViewModelFactory
import com.example.dairyflow.ui.viewmodel.DeliveryBoyPaymentsViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryBoyAdminActionViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryBoyViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.PaymentsViewModel
import com.example.dairyflow.ui.viewmodel.ProductViewModel
import com.example.dairyflow.ui.viewmodel.QrLoginViewModel
import com.example.dairyflow.ui.viewmodel.ReportsViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

private data class AppRoute(val route: String, val label: String, val icon: ImageVector)

private val authRoutes = setOf("login", "admin_otp_login", "delivery_qr_login")
private val deliveryBoyAllowedRoutes = setOf("delivery_boy_dashboard", "delivery_boy_payments", "delivery_boy_add_customer", "profile")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph(
    factory: DairyFlowViewModelFactory,
    appSettingsRepository: AppSettingsRepository,
    authCallbackUri: String? = null,
    onAuthCallbackConsumed: () -> Unit = {}
) {
    val strings = LocalDairyStrings.current
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel(factory = factory)
    val authState by authViewModel.state.collectAsState()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val isAuthRoute = currentRoute in authRoutes
    val role = authState.profile?.role?.lowercase()
    val homeRoute = if (role == "delivery_boy") "delivery_boy_dashboard" else "dashboard"
    val bottomRoutes = listOf(
        AppRoute("dashboard", strings.overview, Icons.Filled.Home),
        AppRoute("customers", strings.customers, Icons.Filled.People),
        AppRoute("deliveries", strings.deliveries, Icons.Filled.LocalShipping),
        AppRoute("payments", strings.payments, Icons.Filled.Payments),
        AppRoute("profile", strings.profile, Icons.Filled.AccountCircle)
    )
    val deliveryBoyBottomRoutes = listOf(
        AppRoute("delivery_boy_dashboard", strings.today, Icons.Filled.Today),
        AppRoute("delivery_boy_payments", strings.payments, Icons.Filled.Payments),
        AppRoute("profile", strings.profile, Icons.Filled.AccountCircle)
    )
    val mainRoutes = if (role == "delivery_boy") deliveryBoyBottomRoutes.map { it.route } else bottomRoutes.map { it.route }
    val canNavigateBack = authState.isSignedIn && currentRoute != null && currentRoute !in mainRoutes

    LaunchedEffect(authCallbackUri) {
        if (authCallbackUri != null) {
            authViewModel.handleAuthCallback(authCallbackUri)
            onAuthCallbackConsumed()
            navController.navigate("login") {
                popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
            }
        }
    }

    LaunchedEffect(authState.isSignedIn, currentRoute) {
        when {
            !authState.isSignedIn && currentRoute != null && !isAuthRoute -> {
                navController.navigate("login") {
                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                }
            }
            authState.isSignedIn && authState.profile == null && !authState.isLoading -> {
                authViewModel.loadProfile()
            }
            authState.isSignedIn && isAuthRoute -> {
                navController.navigate(homeRoute) {
                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                }
            }
            authState.isSignedIn && role == "delivery_boy" && currentRoute != null && currentRoute !in deliveryBoyAllowedRoutes -> {
                navController.navigate("delivery_boy_dashboard") {
                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                }
            }
            authState.isSignedIn && role == "admin" && currentRoute == "delivery_boy_dashboard" -> {
                navController.navigate("dashboard") {
                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                }
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            if (authState.isSignedIn) {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (!canNavigateBack) {
                                Icon(
                                    imageVector = Icons.Filled.Home,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(Modifier.width(8.dp))
                            }
                            Text(
                                text = routeTitle(currentRoute, strings),
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = DairyBlueSea,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White,
                        actionIconContentColor = Color.White
                    ),
                    navigationIcon = {
                        if (canNavigateBack) {
                            IconButton(
                                onClick = {
                                    if (!navController.popBackStack()) {
                                        navController.navigate(homeRoute) {
                                            popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
                                            launchSingleTop = true
                                        }
                                    }
                                }
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                            }
                        }
                    },
                )
            }
        },
        bottomBar = {
            if (authState.isSignedIn) {
                val routes = if (role == "delivery_boy") deliveryBoyBottomRoutes else bottomRoutes
                DairyBottomNavigation(
                    items = routes.map { DairyBottomNavItem(it.route, it.label, it.icon) },
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = when {
                !authState.isSignedIn -> "login"
                role == "delivery_boy" -> "delivery_boy_dashboard"
                authState.profile != null -> "dashboard"
                else -> "login"
            },
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(padding)
        ) {
            composable("login") {
                LaunchedEffect(Unit) { authViewModel.restoreSession() }
                WelcomeLoginTypeScreen(
                    onAdminLogin = { navController.navigate("admin_otp_login") },
                    onDeliveryBoyLogin = { navController.navigate("delivery_qr_login") }
                )
            }
            composable("admin_otp_login") {
                AdminOtpLoginScreen(
                    viewModel = authViewModel,
                    onBack = { navController.popBackStack() },
                    onSignedIn = {
                        navController.navigate("dashboard") {
                            popUpTo("login") { inclusive = true }
                        }
                    }
                )
            }
            composable("delivery_qr_login") {
                DeliveryBoyQrScannerScreen(
                    viewModel = authViewModel,
                    onBack = { navController.popBackStack() },
                    onSignedIn = {
                        navController.navigate("delivery_boy_dashboard") {
                            popUpTo("login") { inclusive = true }
                        }
                    }
                )
            }
            composable("dashboard") {
                DashboardScreen(
                    viewModel = viewModel<DashboardViewModel>(factory = factory),
                    onAddCustomer = { navController.navigate("add_customer") },
                    onAddProduct = { navController.navigate("add_product") },
                    onAddRoute = { navController.navigate("admin_routes") },
                    onInvoice = { navController.navigate("invoice") },
                    onAddDeliveryBoy = { navController.navigate("admin_delivery_boys") },
                    onShowDeliveryQr = { navController.navigate("admin_delivery_qr_picker") }
                )
            }
            composable("admin") {
                AdminPanelScreen(
                    viewModel = viewModel<AdminViewModel>(factory = factory),
                    onOpenQrGenerator = { deliveryBoyId -> navController.navigate("admin_delivery_qr/$deliveryBoyId") },
                    onOpenDeliveryBoyPerformance = { deliveryBoyId -> navController.navigate("admin_delivery_boy_performance/$deliveryBoyId") },
                    onOpenDeliveryBoyPayments = { deliveryBoyId -> navController.navigate("admin_delivery_boy_payment_collection/$deliveryBoyId") }
                )
            }
            composable("admin_delivery_boys") {
                AdminPanelScreen(
                    viewModel = viewModel<AdminViewModel>(factory = factory),
                    startOnDeliveryBoys = true,
                    deliveryBoySetupOnly = true,
                    onOpenQrGenerator = { deliveryBoyId ->
                        navController.navigate("admin_delivery_qr/$deliveryBoyId")
                    },
                    onOpenDeliveryBoyPerformance = { deliveryBoyId ->
                        navController.navigate("admin_delivery_boy_performance/$deliveryBoyId")
                    },
                    onOpenDeliveryBoyPayments = { deliveryBoyId ->
                        navController.navigate("admin_delivery_boy_payment_collection/$deliveryBoyId")
                    }
                )
            }
            composable("admin_routes") {
                AdminPanelScreen(
                    viewModel = viewModel<AdminViewModel>(factory = factory),
                    startOnRoutes = true
                )
            }
            composable("admin_delivery_qr/{deliveryBoyId}") { entry ->
                AdminQrGeneratorScreen(
                    deliveryBoyId = entry.arguments?.getString("deliveryBoyId").orEmpty(),
                    viewModel = viewModel<QrLoginViewModel>(factory = factory),
                    adminViewModel = viewModel<AdminViewModel>(factory = factory),
                    onBack = { navController.popBackStack() }
                )
            }
            composable("admin_delivery_boy_performance/{deliveryBoyId}") { entry ->
                DeliveryBoyPerformanceScreen(
                    deliveryBoyId = entry.arguments?.getString("deliveryBoyId").orEmpty(),
                    viewModel = viewModel<DeliveryBoyAdminActionViewModel>(factory = factory)
                )
            }
            composable("admin_delivery_boy_payment_collection/{deliveryBoyId}") { entry ->
                DeliveryBoyPaymentCollectionScreen(
                    deliveryBoyId = entry.arguments?.getString("deliveryBoyId").orEmpty(),
                    viewModel = viewModel<DeliveryBoyAdminActionViewModel>(factory = factory)
                )
            }
            composable("admin_delivery_qr_picker") {
                AdminDeliveryQrPickerScreen(
                    viewModel = viewModel<AdminViewModel>(factory = factory),
                    onOpenQr = { deliveryBoyId -> navController.navigate("admin_delivery_qr/$deliveryBoyId") },
                    onOpenPerformance = { deliveryBoyId -> navController.navigate("admin_delivery_boy_performance/$deliveryBoyId") },
                    onOpenPaymentCollection = { deliveryBoyId -> navController.navigate("admin_delivery_boy_payment_collection/$deliveryBoyId") }
                )
            }
            composable("delivery_boy_dashboard") {
                DeliveryBoyDashboardScreen(
                    viewModel = viewModel<DeliveryBoyViewModel>(factory = factory),
                    authViewModel = authViewModel,
                    onAddCustomer = { navController.navigate("delivery_boy_add_customer") }
                )
            }
            composable("delivery_boy_payments") {
                DeliveryBoyPaymentsScreen(viewModel<DeliveryBoyPaymentsViewModel>(factory = factory))
            }
            composable("delivery_boy_add_customer") {
                AddCustomerScreen(
                    viewModel = viewModel<CustomersViewModel>(factory = factory),
                    onSaved = {
                        navController.navigate("delivery_boy_dashboard") {
                            popUpTo("delivery_boy_dashboard") { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable("add_customer") {
                AddCustomerScreen(
                    viewModel = viewModel<CustomersViewModel>(factory = factory),
                    onSaved = {
                        navController.navigate("customers") {
                            popUpTo("dashboard")
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable("add_product") {
                AddProductScreen(
                    viewModel = viewModel<ProductViewModel>(factory = factory),
                    onSaved = {
                        navController.navigate("dashboard") {
                            popUpTo("dashboard") { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable("add_delivery") {
                AddDeliveryScreen(
                    viewModel = viewModel<DeliveryViewModel>(factory = factory),
                    onSaved = {
                        navController.navigate("deliveries") {
                            popUpTo("dashboard")
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable("customers") {
                CustomersScreen(
                    viewModel = viewModel<CustomersViewModel>(factory = factory),
                    onOpenDetail = { id -> navController.navigate("customer/$id") },
                    onOpenDeliveryChart = { id -> navController.navigate("customer_delivery_chart/$id") },
                    onOpenPaymentHistory = { id -> navController.navigate("customer_payment_history/$id") }
                )
            }
            composable("customer/{id}") { entry ->
                CustomerDetailScreen(
                    customerId = entry.arguments?.getString("id").orEmpty(),
                    viewModel = viewModel<CustomersViewModel>(factory = factory),
                    onBack = { navController.popBackStack() }
                )
            }
            composable("customer_delivery_chart/{id}") { entry ->
                CustomerDeliveryChartScreen(
                    customerId = entry.arguments?.getString("id").orEmpty(),
                    viewModel = viewModel<CustomerInsightsViewModel>(factory = factory)
                )
            }
            composable("customer_payment_history/{id}") { entry ->
                CustomerPaymentHistoryScreen(
                    customerId = entry.arguments?.getString("id").orEmpty(),
                    viewModel = viewModel<CustomerInsightsViewModel>(factory = factory)
                )
            }
            composable("deliveries") {
                DeliveryScreen(
                    viewModel = viewModel<DeliveryViewModel>(factory = factory),
                    onAddDelivery = { navController.navigate("add_delivery") }
                )
            }
            composable("billing") {
                BillingScreen(viewModel<BillingViewModel>(factory = factory))
            }
            composable("invoice") {
                BillingScreen(viewModel<BillingViewModel>(factory = factory))
            }
            composable("payments") {
                PaymentsScreen(viewModel<PaymentsViewModel>(factory = factory))
            }
            composable("reports") {
                ReportsScreen(viewModel<ReportsViewModel>(factory = factory))
            }
            composable("profile") {
                ProfileScreen(
                    viewModel = authViewModel,
                    appSettingsRepository = appSettingsRepository
                )
            }
        }
    }
}

private fun routeTitle(route: String?, strings: DairyStrings): String = when (route) {
    "dashboard" -> strings.adminDashboard
    "delivery_boy_dashboard" -> strings.deliveryBoyDashboard
    "delivery_boy_payments" -> strings.payments
    "delivery_boy_add_customer" -> "Add Customer"
    "customers" -> strings.customers
    "customer_delivery_chart/{id}" -> "Delivery Chart"
    "customer_payment_history/{id}" -> "Payment History"
    "deliveries" -> strings.deliveries
    "payments" -> strings.payments
    "billing" -> "Billing"
    "invoice" -> "Invoice"
    "add_customer" -> "Add Customer"
    "add_product" -> "Add Product"
    "add_delivery" -> "Add Delivery"
    "admin_routes" -> "Add Route"
    "admin_delivery_boys" -> "Delivery Boys"
    "admin_delivery_qr_picker" -> "Delivery Boy QR"
    "admin_delivery_qr/{deliveryBoyId}" -> "Delivery Boy QR"
    "admin_delivery_boy_performance/{deliveryBoyId}" -> "Performance"
    "admin_delivery_boy_payment_collection/{deliveryBoyId}" -> "Payment Collection"
    "profile" -> strings.profile
    "admin" -> "Admin"
    else -> "DairyFlow"
}

@Composable
private fun AdminDeliveryQrPickerScreen(
    viewModel: AdminViewModel,
    onOpenQr: (String) -> Unit,
    onOpenPerformance: (String) -> Unit,
    onOpenPaymentCollection: (String) -> Unit
) {
    val dataState by viewModel.dataState.collectAsState()
    var deleteTarget by remember { mutableStateOf<AdminDeliveryBoy?>(null) }
    LaunchedEffect(Unit) { viewModel.load() }
    val deliveryBoys = dataState.data?.deliveryBoys.orEmpty().filter { it.id != null && it.isActive }
    val routesById = dataState.data?.routes.orEmpty().mapNotNull { route ->
        route.id?.let { it to route.routeName }
    }.toMap()

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Show QR for Delivery Boy Login", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Select a delivery boy and show the linked login scanner QR.")
                }
            }
            if (dataState.isLoading && dataState.data == null) {
                item { LoadingState() }
            }
            dataState.error?.let { error ->
                item { ErrorState(error, onRetry = { viewModel.load() }) }
            }
            if (!dataState.isLoading && deliveryBoys.isEmpty()) {
                item { EmptyState("No active delivery boys found. Add a delivery boy first.") }
            }
            items(deliveryBoys) { boy ->
                Card {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(boy.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text("Mobile: ${boy.mobileNumber ?: "-"}")
                                Text("Route: " + (routesById[boy.assignedRouteId] ?: "Not assigned"))
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { boy.id?.let(onOpenQr) },
                                    enabled = boy.id != null
                                ) {
                                    Icon(Icons.Filled.QrCode, contentDescription = "Login QR")
                                }
                                IconButton(
                                    onClick = { deleteTarget = boy },
                                    enabled = boy.id != null
                                ) {
                                    Icon(
                                        Icons.Filled.Delete,
                                        contentDescription = "Delete delivery boy",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { boy.id?.let(onOpenPerformance) },
                                enabled = boy.id != null,
                                modifier = Modifier.weight(1f).height(54.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Filled.BarChart, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    "Performance",
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                            Button(
                                onClick = { boy.id?.let(onOpenPaymentCollection) },
                                enabled = boy.id != null,
                                modifier = Modifier.weight(1f).height(54.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Filled.Payments, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    "Payment",
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                        }
                    }
                }
            }
        }

        deleteTarget?.let { boy ->
            AlertDialog(
                onDismissRequest = { deleteTarget = null },
                title = { Text("Delete delivery boy?") },
                text = { Text("This will delete ${boy.name}'s delivery boy account.") },
                confirmButton = {
                    TextButton(onClick = {
                        boy.id?.let(viewModel::deleteDeliveryBoy)
                        deleteTarget = null
                    }) {
                        Text("Delete", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { deleteTarget = null }) { Text("Cancel") }
                }
            )
        }
    }
}

private fun formatQrPickerLiters(liters: Double): String = "%.1f L".format(liters)

@Composable
private fun DeliveryBoyPerformanceDashboard(
    boy: AdminDeliveryBoy,
    data: AdminDataBundle
) {
    val boyId = boy.id.orEmpty()
    val today = todayIsoDate()
    val monthPrefix = today.take(7)
    val productsById = data.products.mapNotNull { product -> product.id?.let { it to product } }.toMap()
    val monthDeliveries = data.deliveries
        .filter { it.deliveryBoyId == boyId && it.status == AdminDeliveryStatus.DELIVERED && it.deliveryDate.startsWith(monthPrefix) }
    val dailyCounts = monthDeliveries
        .groupBy { it.deliveryDate }
        .mapValues { (_, rows) -> rows.size }
        .toSortedMap()
    val cowMilk = monthDeliveries
        .filter { delivery -> productsById[delivery.productId]?.category?.equals("Cow", ignoreCase = true) == true }
        .sumOf { it.quantity }
    val buffaloMilk = monthDeliveries
        .filter { delivery -> productsById[delivery.productId]?.category?.equals("Buffalo", ignoreCase = true) == true }
        .sumOf { it.quantity }
    val collectedPayments = data.payments.filter { it.collectedBy == boyId && !it.isAdvancePayment }
    val collectedToday = collectedPayments.filter { it.paymentDate == today }.sumOf { it.amount }
    val collectedThisMonth = collectedPayments.filter { it.paymentDate.startsWith(monthPrefix) }.sumOf { it.amount }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Performance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PerformanceSummaryCard("Cow milk", formatQrPickerLiters(cowMilk), Modifier.weight(1f))
            PerformanceSummaryCard("Buffalo milk", formatQrPickerLiters(buffaloMilk), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PerformanceSummaryCard("Today collected", "Rs %.0f".format(collectedToday), Modifier.weight(1f))
            PerformanceSummaryCard("Month collected", "Rs %.0f".format(collectedThisMonth), Modifier.weight(1f))
        }
        MonthlyDeliveryChart(dailyCounts)
    }
}

@Composable
private fun PerformanceSummaryCard(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun MonthlyDeliveryChart(dailyCounts: Map<String, Int>) {
    val maxCount = dailyCounts.values.maxOrNull()?.coerceAtLeast(1) ?: 1
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Monthly delivery chart", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        if (dailyCounts.isEmpty()) {
            Text("No completed deliveries this month.", style = MaterialTheme.typography.bodySmall)
        } else {
            dailyCounts.entries.toList().takeLast(10).forEach { (date, count) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(DateFormatter.formatDate(date).substringBefore(" "), modifier = Modifier.width(24.dp), style = MaterialTheme.typography.labelMedium)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(10.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(count.toFloat() / maxCount)
                                .height(10.dp)
                                .background(DairyBlueSea, androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                        )
                    }
                    Text(count.toString(), style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}
