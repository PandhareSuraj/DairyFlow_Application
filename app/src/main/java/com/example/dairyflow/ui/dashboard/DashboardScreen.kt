package com.example.dairyflow.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.DairyMetricCard
import com.example.dairyflow.ui.common.DairySectionTitle
import com.example.dairyflow.ui.common.DairySummaryCard
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.theme.DairyBlueSea
import com.example.dairyflow.ui.theme.DairyGold
import com.example.dairyflow.ui.theme.DairyGreen
import com.example.dairyflow.ui.theme.DairyViolet
import com.example.dairyflow.ui.viewmodel.DashboardViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onAddCustomer: () -> Unit = {},
    onAddProduct: () -> Unit = {},
    onAddDelivery: () -> Unit = {},
    onInvoice: () -> Unit = {},
    onAddDeliveryBoy: () -> Unit = {},
    onShowDeliveryQr: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            DairyDashboardHeader("Dashboard", "Today - ${todayIsoDate()}")
        }
        if (state.isLoading) {
            item { RefreshingState(if (state.data == null) "Preparing dashboard..." else "Refreshing dashboard...") }
        }
        val stats = state.data
        if (stats != null) {
            item {
                DairySummaryCard(
                    title = "Tenant summary",
                    subtitle = "Daily delivery and billing snapshot",
                    primaryValue = "Rs %.0f".format(stats.monthlyRevenue),
                    primaryLabel = "Monthly revenue",
                    secondaryValue = stats.deliveredToday.toString(),
                    secondaryLabel = "Delivered today"
                )
            }
            item {
                DairySectionTitle("Key metrics")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DairyMetricCard("Customers", stats.totalCustomers.toString(), Modifier.weight(1f), Icons.Filled.Groups, DairyViolet)
                    DairyMetricCard("Products", stats.totalProducts.toString(), Modifier.weight(1f), Icons.Filled.Inventory2, DairyBlueSea)
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DairyMetricCard("Delivery Boys", stats.totalDeliveryBoys.toString(), Modifier.weight(1f), Icons.Filled.LocalShipping, DairyGreen)
                    DairyMetricCard("Today", stats.deliveredToday.toString(), Modifier.weight(1f), Icons.Filled.LocalShipping, DairyBlueSea)
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DairyMetricCard("Pending Bills", stats.pendingBills.toString(), Modifier.weight(1f), Icons.AutoMirrored.Filled.ReceiptLong, DairyGold)
                    DairyMetricCard("Revenue", "Rs %.0f".format(stats.monthlyRevenue), Modifier.weight(1f), Icons.Filled.Payments, DairyGreen)
                }
            }
            item {
                DairySectionTitle("Quick Actions")
                Card {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = onAddCustomer, modifier = Modifier.weight(1f)) { Text("Add Customer") }
                            Button(onClick = onAddProduct, modifier = Modifier.weight(1f)) { Text("Add Product") }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = onAddDelivery, modifier = Modifier.weight(1f)) { Text("Add Delivery") }
                            Button(onClick = onInvoice, modifier = Modifier.weight(1f)) { Text("Invoice") }
                        }
                        Button(onClick = onAddDeliveryBoy, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Filled.PersonAdd, contentDescription = null)
                            Text(" Add Delivery Boy")
                        }
                        Button(onClick = onShowDeliveryQr, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Filled.QrCode, contentDescription = null)
                            Text(" Show QR for Delivery Boy Login")
                        }
                    }
                }
            }
            item {
                DairySectionTitle("Today Delivery Status")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DairyMetricCard("Delivered", stats.deliveredToday.toString(), Modifier.weight(1f), Icons.Filled.LocalShipping, DairyGreen)
                    DairyMetricCard("Pending", stats.pendingToday.toString(), Modifier.weight(1f), Icons.AutoMirrored.Filled.ReceiptLong, DairyGold)
                    DairyMetricCard("Skipped", stats.skippedToday.toString(), Modifier.weight(1f), Icons.Filled.Info, DairyViolet)
                }
                if (stats.deliveredToday + stats.pendingToday + stats.skippedToday == 0) {
                    EmptyState("No deliveries found for today.")
                }
            }
            item {
                DairySectionTitle("Payment Summary")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DairyMetricCard("Collected", "Rs %.0f".format(stats.totalCollection), Modifier.weight(1f), Icons.Filled.Payments, DairyGreen)
                    DairyMetricCard("Previous Due", "Rs %.0f".format(stats.previousPending), Modifier.weight(1f), Icons.AutoMirrored.Filled.ReceiptLong, DairyGold)
                }
            }
        }
        state.error?.let {
            item {
                ErrorState(
                    message = "Unable to load dashboard data. Please try again.",
                    onRetry = viewModel::load,
                    details = it
                )
            }
        }
    }
}
