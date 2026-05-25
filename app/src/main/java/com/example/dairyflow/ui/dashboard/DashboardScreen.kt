package com.example.dairyflow.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.MetricCard
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.DashboardViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun DashboardScreen(viewModel: DashboardViewModel) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Dashboard", style = MaterialTheme.typography.headlineMedium)
                Text("Today • ${todayIsoDate()}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (state.isLoading) {
            item { LoadingState("Loading dashboard...") }
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
        val stats = state.data
        if (!state.isLoading && stats == null && state.error == null) {
            item { EmptyState("No data available yet.", "Retry", viewModel::load) }
        }
        stats?.let {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Customers", it.totalCustomers.toString(), Modifier.weight(1f))
                    MetricCard("Products", it.totalProducts.toString(), Modifier.weight(1f))
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Delivery Boys", it.totalDeliveryBoys.toString(), Modifier.weight(1f))
                    MetricCard("Today", it.deliveredToday.toString(), Modifier.weight(1f))
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Pending Bills", it.pendingBills.toString(), Modifier.weight(1f))
                    MetricCard("Revenue", "Rs %.0f".format(it.monthlyRevenue), Modifier.weight(1f))
                }
            }
            item {
                SectionTitle("Quick Actions")
                Card {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {}, modifier = Modifier.weight(1f)) { Text("Add Customer") }
                            Button(onClick = {}, modifier = Modifier.weight(1f)) { Text("Add Product") }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {}, modifier = Modifier.weight(1f)) { Text("Add Delivery") }
                            Button(onClick = {}, modifier = Modifier.weight(1f)) { Text("Invoice") }
                        }
                    }
                }
            }
            item {
                SectionTitle("Today Delivery Status")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Delivered", it.deliveredToday.toString(), Modifier.weight(1f))
                    MetricCard("Pending", it.pendingToday.toString(), Modifier.weight(1f))
                    MetricCard("Skipped", it.skippedToday.toString(), Modifier.weight(1f))
                }
                if (it.deliveredToday + it.pendingToday + it.skippedToday == 0) {
                    EmptyState("No deliveries found for today.")
                }
            }
            item {
                SectionTitle("Payment Summary")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Collected", "Rs %.0f".format(it.totalCollection), Modifier.weight(1f))
                    MetricCard("Previous Due", "Rs %.0f".format(it.previousPending), Modifier.weight(1f))
                }
            }
        }
    }
}
