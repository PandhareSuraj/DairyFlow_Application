package com.example.dairyflow.ui.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerHold
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.localization.LocalDairyStrings
import com.example.dairyflow.ui.viewmodel.CustomerCardStats
import com.example.dairyflow.ui.viewmodel.CustomersViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun CustomersScreen(
    viewModel: CustomersViewModel,
    onOpenDetail: (String) -> Unit,
    onOpenDeliveryChart: (String) -> Unit,
    onOpenPaymentHistory: (String) -> Unit
) {
    val strings = LocalDairyStrings.current
    val state by viewModel.state.collectAsState()
    val routes by viewModel.routes.collectAsState()
    val products by viewModel.products.collectAsState()
    val cardStats by viewModel.cardStats.collectAsState()
    val holds by viewModel.holds.collectAsState()
    var editing by remember { mutableStateOf<Customer?>(null) }
    var showForm by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedRouteId by remember(routes.data) { mutableStateOf("") }
    LaunchedEffect(Unit) { viewModel.load() }
    val routeRows = routes.data.orEmpty()
    val routeOptions = remember(routeRows) { listOf("All routes", "No route") + routeRows.map { it.displayName } }
    val selectedRouteName = routeRows.firstOrNull { it.id == selectedRouteId }?.displayName
        ?: if (selectedRouteId == NO_ROUTE_FILTER) "No route" else "All routes"
    val filteredCustomers = remember(state.data, searchQuery, selectedRouteId, routeRows) {
        state.data.orEmpty()
            .filter { customer ->
                val query = searchQuery.trim()
                query.isBlank() ||
                    customer.name.contains(query, ignoreCase = true) ||
                    customer.fullName.orEmpty().contains(query, ignoreCase = true) ||
                    customer.phone.orEmpty().contains(query, ignoreCase = true) ||
                    customer.mobileNumber.orEmpty().contains(query, ignoreCase = true)
            }
            .filter { customer ->
                when (selectedRouteId) {
                    "" -> true
                    NO_ROUTE_FILTER -> customer.routeId.isNullOrBlank()
                    else -> customer.routeId == selectedRouteId
                }
            }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            DairyDashboardHeader(title = strings.customers, subtitle = strings.manageDailyOperations)
        }
        item {
            Button(
                onClick = {
                    editing = null
                    showForm = true
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Add Customer")
            }
        }
        if (showForm || editing != null) {
            item {
                CustomerFormCard(editing, routes = routeRows, onSave = {
                    viewModel.save(it)
                    editing = null
                    showForm = false
                }, products = products.data.orEmpty(), onClear = {
                    editing = null
                    showForm = false
                })
            }
        }
        item {
            CustomerFilters(
                searchQuery = searchQuery,
                onSearchQuery = { searchQuery = it },
                selectedRouteName = selectedRouteName,
                routeOptions = routeOptions,
                onRouteSelected = { selected ->
                    selectedRouteId = when (selected) {
                        "All routes" -> ""
                        "No route" -> NO_ROUTE_FILTER
                        else -> routeRows.firstOrNull { it.displayName == selected }?.id.orEmpty()
                    }
                }
            )
        }
        item { SectionTitle("Customer list") }
        if (state.isLoading && state.data != null) {
            item { RefreshingState("Refreshing customers...") }
        }
        when {
            state.isLoading && state.data == null -> item { LoadingState("Loading customers...") }
            state.error != null -> item { ErrorState(state.error ?: "Error", viewModel::load) }
            state.data.isNullOrEmpty() -> item { EmptyState("No customers yet. Add your first customer above.") }
            filteredCustomers.isEmpty() -> item { EmptyState("No customers match this search or route.") }
            else -> items(filteredCustomers, key = { it.id ?: it.name }) { customer ->
                CustomerCard(customer, onEdit = {
                    editing = customer
                    showForm = true
                }, onDelete = {
                    customer.id?.let(viewModel::delete)
                }, onDeliveryChart = {
                    customer.id?.let(onOpenDeliveryChart)
                }, onPaymentHistory = {
                    customer.id?.let(onOpenPaymentHistory)
                }, stats = customer.id?.let { cardStats[it] } ?: CustomerCardStats(),
                    holds = holds.data.orEmpty().filter { it.customerId == customer.id }
                )
            }
        }
    }
}

@Composable
private fun CustomerFilters(
    searchQuery: String,
    onSearchQuery: (String) -> Unit,
    selectedRouteName: String,
    routeOptions: List<String>,
    onRouteSelected: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQuery,
            label = { Text("Search by name or mobile") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OptionDropdown(
            label = "Route filter",
            value = selectedRouteName,
            options = routeOptions,
            onSelected = onRouteSelected,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun CustomerCard(
    customer: Customer,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onDeliveryChart: () -> Unit,
    onPaymentHistory: () -> Unit,
    stats: CustomerCardStats,
    holds: List<CustomerHold>
) {
    var deleteConfirmStep by remember { mutableStateOf(0) }
    val customerName = customer.name.ifBlank { customer.fullName.orEmpty().ifBlank { "Customer" } }
    val isOnHold = holds.any { it.includes(todayIsoDate()) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    customerName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                CustomerIconButton(Icons.Filled.Edit, "Edit customer", onEdit)
                CustomerIconButton(Icons.Filled.Delete, "Delete customer", { deleteConfirmStep = 1 })
                CustomerStatusBadge(if (isOnHold) "On Hold" else if (customer.isActive) "Active" else "Inactive")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Button(onClick = onPaymentHistory, modifier = Modifier.weight(1f)) {
                    Icon(
                        Icons.Filled.History,
                        contentDescription = "Payment history, pending ${money(stats.pendingAmount)}",
                        modifier = Modifier.size(18.dp)
                    )
                    Text("Payment history")
                }
                Button(onClick = onDeliveryChart, modifier = Modifier.weight(1f)) {
                    Icon(
                        Icons.Filled.BarChart,
                        contentDescription = "Delivery chart, ${stats.deliveredDays} delivered days",
                        modifier = Modifier.size(18.dp)
                    )
                    Text("Delivery chart")
                }
            }
        }
    }
    if (deleteConfirmStep == 1) {
        AlertDialog(
            onDismissRequest = { deleteConfirmStep = 0 },
            title = { Text("Delete customer?") },
            text = { Text("Do you want to delete $customerName?") },
            confirmButton = {
                Button(onClick = { deleteConfirmStep = 2 }) {
                    Text("Continue")
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmStep = 0 }) {
                    Text("Cancel")
                }
            }
        )
    }
    if (deleteConfirmStep == 2) {
        AlertDialog(
            onDismissRequest = { deleteConfirmStep = 0 },
            title = { Text("Final confirmation") },
            text = { Text("This will permanently delete $customerName. This action cannot be undone.") },
            confirmButton = {
                Button(onClick = {
                    deleteConfirmStep = 0
                    onDelete()
                }) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmStep = 0 }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun CustomerIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    IconButton(
        onClick = onClick,
        modifier = modifier.size(48.dp)
    ) {
        Icon(icon, contentDescription = contentDescription, tint = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun CustomerStatusBadge(text: String) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (text == "Active") MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        contentColor = if (text == "Active") MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

private fun money(value: Double): String = "₹%.0f".format(value)

private const val NO_ROUTE_FILTER = "__NO_ROUTE__"
