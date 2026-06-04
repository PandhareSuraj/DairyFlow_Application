package com.example.dairyflow.ui.customer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Button
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
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.DairyDashboardHeader
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.CustomersViewModel

@Composable
fun CustomersScreen(viewModel: CustomersViewModel, onOpenDetail: (String) -> Unit) {
    val state by viewModel.state.collectAsState()
    val routes by viewModel.routes.collectAsState()
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
            DairyDashboardHeader(title = "Customers", subtitle = "Manage daily operations")
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
                }, onClear = {
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
                CustomerCard(customer, routeName = routeRows.firstOrNull { it.id == customer.routeId }?.displayName, onOpen = { customer.id?.let(onOpenDetail) }, onEdit = {
                    editing = customer
                    showForm = true
                }, onDelete = {
                    customer.id?.let(viewModel::delete)
                })
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
private fun CustomerCard(customer: Customer, routeName: String?, onOpen: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onOpen)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(customer.name)
            Text("${customer.phone.orEmpty()}  ${customer.address.orEmpty()}")
            Text("Route: ${routeName ?: "No route"}")
            Text("Rate Rs ${customer.milkRate} / L, Daily ${customer.dailyQuantity} L")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onEdit) { Text("Edit") }
                OutlinedButton(onClick = onOpen) { Text("Detail") }
                OutlinedButton(onClick = onDelete) { Text("Delete") }
            }
        }
    }
}

private const val NO_ROUTE_FILTER = "__NO_ROUTE__"
