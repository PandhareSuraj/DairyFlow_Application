package com.example.dairyflow.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.example.dairyflow.ui.admin.AdminPanelScreen
import com.example.dairyflow.ui.admin.deliveryboys.AdminQrGeneratorScreen
import com.example.dairyflow.ui.auth.AdminOtpLoginScreen
import com.example.dairyflow.ui.auth.DeliveryBoyQrScannerScreen
import com.example.dairyflow.ui.auth.WelcomeLoginTypeScreen
import com.example.dairyflow.ui.billing.BillingScreen
import com.example.dairyflow.ui.customer.AddCustomerScreen
import com.example.dairyflow.ui.customer.CustomerDetailScreen
import com.example.dairyflow.ui.customer.CustomersScreen
import com.example.dairyflow.ui.delivery.AddDeliveryScreen
import com.example.dairyflow.ui.delivery.DeliveryScreen
import com.example.dairyflow.ui.deliveryboy.DeliveryBoyDashboardScreen
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
import com.example.dairyflow.ui.theme.DairyCream
import com.example.dairyflow.ui.viewmodel.AdminViewModel
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.example.dairyflow.ui.viewmodel.BillingViewModel
import com.example.dairyflow.ui.viewmodel.CustomersViewModel
import com.example.dairyflow.ui.viewmodel.DashboardViewModel
import com.example.dairyflow.ui.viewmodel.DairyFlowViewModelFactory
import com.example.dairyflow.ui.viewmodel.DeliveryBoyViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.PaymentsViewModel
import com.example.dairyflow.ui.viewmodel.ProductViewModel
import com.example.dairyflow.ui.viewmodel.QrLoginViewModel
import com.example.dairyflow.ui.viewmodel.ReportsViewModel

private data class AppRoute(val route: String, val label: String, val icon: ImageVector)

private val bottomRoutes = listOf(
    AppRoute("dashboard", "Overview", Icons.Filled.Home),
    AppRoute("customers", "Customers", Icons.Filled.People),
    AppRoute("deliveries", "Deliveries", Icons.Filled.LocalShipping),
    AppRoute("payments", "Payments", Icons.Filled.Payments),
    AppRoute("profile", "Profile", Icons.Filled.AccountCircle)
)

private val deliveryBoyBottomRoutes = listOf(
    AppRoute("delivery_boy_dashboard", "Today", Icons.Filled.Today),
    AppRoute("profile", "Profile", Icons.Filled.AccountCircle)
)

private val authRoutes = setOf("login", "admin_otp_login", "delivery_qr_login")
private val deliveryBoyAllowedRoutes = setOf("delivery_boy_dashboard", "profile")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph(
    factory: DairyFlowViewModelFactory,
    authCallbackUri: String? = null,
    onAuthCallbackConsumed: () -> Unit = {}
) {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel(factory = factory)
    val authState by authViewModel.state.collectAsState()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val isAuthRoute = currentRoute in authRoutes
    val role = authState.profile?.role?.lowercase()
    val homeRoute = if (role == "delivery_boy") "delivery_boy_dashboard" else "dashboard"
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
        containerColor = DairyCream,
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
                                text = routeTitle(currentRoute),
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
                    actions = {
                        TextButton(
                            onClick = { authViewModel.signOut() },
                            colors = ButtonDefaults.textButtonColors(contentColor = Color.White)
                        ) {
                            Text("Sign out")
                        }
                    }
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
                .background(DairyCream)
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
                    onAddDelivery = { navController.navigate("add_delivery") },
                    onInvoice = { navController.navigate("invoice") },
                    onAddDeliveryBoy = { navController.navigate("admin_delivery_boys") },
                    onShowDeliveryQr = { navController.navigate("admin_delivery_qr_picker") }
                )
            }
            composable("admin") {
                AdminPanelScreen(viewModel<AdminViewModel>(factory = factory)) { deliveryBoyId ->
                    navController.navigate("admin_delivery_qr/$deliveryBoyId")
                }
            }
            composable("admin_delivery_boys") {
                AdminPanelScreen(
                    viewModel = viewModel<AdminViewModel>(factory = factory),
                    startOnDeliveryBoys = true,
                    deliveryBoySetupOnly = true,
                    onOpenQrGenerator = { deliveryBoyId ->
                        navController.navigate("admin_delivery_qr/$deliveryBoyId")
                    }
                )
            }
            composable("admin_delivery_qr/{deliveryBoyId}") { entry ->
                AdminQrGeneratorScreen(
                    deliveryBoyId = entry.arguments?.getString("deliveryBoyId").orEmpty(),
                    viewModel = viewModel<QrLoginViewModel>(factory = factory),
                    onBack = { navController.popBackStack() }
                )
            }
            composable("admin_delivery_qr_picker") {
                AdminDeliveryQrPickerScreen(
                    viewModel = viewModel<AdminViewModel>(factory = factory),
                    onOpenQr = { deliveryBoyId -> navController.navigate("admin_delivery_qr/$deliveryBoyId") }
                )
            }
            composable("delivery_boy_dashboard") {
                DeliveryBoyDashboardScreen(
                    viewModel = viewModel<DeliveryBoyViewModel>(factory = factory),
                    authViewModel = authViewModel
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
                CustomersScreen(viewModel<CustomersViewModel>(factory = factory)) { id ->
                    navController.navigate("customer/$id")
                }
            }
            composable("customer/{id}") { entry ->
                CustomerDetailScreen(
                    customerId = entry.arguments?.getString("id").orEmpty(),
                    viewModel = viewModel<CustomersViewModel>(factory = factory),
                    onBack = { navController.popBackStack() }
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
                ProfileScreen(authViewModel)
            }
        }
    }
}

private fun routeTitle(route: String?): String = when (route) {
    "dashboard" -> "Admin Dashboard"
    "delivery_boy_dashboard" -> "Delivery Boy Dashboard"
    "customers" -> "Customers"
    "deliveries" -> "Deliveries"
    "payments" -> "Payments"
    "billing" -> "Billing"
    "invoice" -> "Invoice"
    "add_customer" -> "Add Customer"
    "add_product" -> "Add Product"
    "add_delivery" -> "Add Delivery"
    "admin_delivery_boys" -> "Delivery Boys"
    "admin_delivery_qr_picker" -> "Delivery Boy QR"
    "profile" -> "Profile"
    "admin" -> "Admin"
    else -> "DairyFlow"
}

@Composable
private fun AdminDeliveryQrPickerScreen(
    viewModel: AdminViewModel,
    onOpenQr: (String) -> Unit
) {
    val dataState by viewModel.dataState.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    val deliveryBoys = dataState.data?.deliveryBoys.orEmpty().filter { it.id != null && it.isActive }
    val routesById = dataState.data?.routes.orEmpty().mapNotNull { route ->
        route.id?.let { it to route.routeName }
    }.toMap()

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
                    Text(boy.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(listOfNotNull(boy.mobileNumber, boy.email).joinToString(" | ").ifBlank { "No contact saved" })
                    Text("Route: " + (routesById[boy.assignedRouteId] ?: "Not assigned"))
                    Button(
                        onClick = { boy.id?.let(onOpenQr) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.QrCode, contentDescription = null)
                        Text(" Show Login QR")
                    }
                }
            }
        }
    }
}
