package com.example.dairyflow.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.dairyflow.ui.admin.AdminPanelScreen
import com.example.dairyflow.ui.auth.ForgotPasswordScreen
import com.example.dairyflow.ui.auth.LoginScreen
import com.example.dairyflow.ui.auth.SignupScreen
import com.example.dairyflow.ui.billing.BillingScreen
import com.example.dairyflow.ui.customer.CustomerDetailScreen
import com.example.dairyflow.ui.customer.CustomersScreen
import com.example.dairyflow.ui.dashboard.DashboardScreen
import com.example.dairyflow.ui.delivery.DeliveryScreen
import com.example.dairyflow.ui.payment.PaymentsScreen
import com.example.dairyflow.ui.profile.ProfileScreen
import com.example.dairyflow.ui.reports.ReportsScreen
import com.example.dairyflow.ui.viewmodel.AdminViewModel
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.example.dairyflow.ui.viewmodel.BillingViewModel
import com.example.dairyflow.ui.viewmodel.CustomersViewModel
import com.example.dairyflow.ui.viewmodel.DairyFlowViewModelFactory
import com.example.dairyflow.ui.viewmodel.DashboardViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.PaymentsViewModel
import com.example.dairyflow.ui.viewmodel.ReportsViewModel

private data class AppRoute(val route: String, val label: String, val icon: String)

private val bottomRoutes = listOf(
    AppRoute("dashboard", "Home", "H"),
    AppRoute("delivery", "Deliveries", "D"),
    AppRoute("billing", "Billing", "B"),
    AppRoute("profile", "Profile", "P")
)

private val authRoutes = setOf("login", "signup", "forgot")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph(factory: DairyFlowViewModelFactory) {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel(factory = factory)
    val authState by authViewModel.state.collectAsState()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val isAuthRoute = currentRoute in authRoutes

    LaunchedEffect(authState.isSignedIn, currentRoute) {
        when {
            !authState.isSignedIn && currentRoute != null && !isAuthRoute -> {
                navController.navigate("login") {
                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                }
            }
            authState.isSignedIn && isAuthRoute -> {
                navController.navigate("dashboard") {
                    popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                }
            }
        }
    }

    Scaffold(
        topBar = {
            if (authState.isSignedIn) {
                TopAppBar(
                    title = { Text(routeTitle(currentRoute)) },
                    actions = {
                        TextButton(onClick = { navController.navigate("admin") }) { Text("Admin") }
                    }
                )
            }
        },
        bottomBar = {
            if (authState.isSignedIn) {
                NavigationBar {
                    bottomRoutes.forEach { item ->
                        NavigationBarItem(
                            selected = currentRoute == item.route,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            label = { Text(item.label) },
                            icon = { Text(item.icon) }
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = if (authState.isSignedIn) "dashboard" else "login",
            modifier = Modifier.padding(padding)
        ) {
            composable("login") {
                LoginScreen(
                    viewModel = authViewModel,
                    onSignedIn = {
                        navController.navigate("dashboard") {
                            popUpTo("login") { inclusive = true }
                        }
                    },
                    onCreateAccount = { navController.navigate("signup") },
                    onForgotPassword = { navController.navigate("forgot") }
                )
            }
            composable("signup") {
                SignupScreen(
                    viewModel = authViewModel,
                    onSignedIn = {
                        navController.navigate("dashboard") {
                            popUpTo("login") { inclusive = true }
                        }
                    },
                    onBackToLogin = {
                        navController.navigate("login") {
                            popUpTo("signup") { inclusive = true }
                        }
                    }
                )
            }
            composable("forgot") {
                ForgotPasswordScreen {
                    navController.navigate("login") {
                        popUpTo("forgot") { inclusive = true }
                    }
                }
            }
            composable("dashboard") {
                DashboardScreen(viewModel<DashboardViewModel>(factory = factory))
            }
            composable("admin") {
                AdminPanelScreen(viewModel<AdminViewModel>(factory = factory))
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
            composable("delivery") {
                DeliveryScreen(viewModel<DeliveryViewModel>(factory = factory))
            }
            composable("billing") {
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
    "delivery" -> "Deliveries"
    "billing" -> "Billing"
    "profile" -> "Profile"
    "admin" -> "Admin"
    else -> "DairyFlow"
}
