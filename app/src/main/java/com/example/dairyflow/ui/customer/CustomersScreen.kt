package com.example.dairyflow.ui.customer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
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
import com.example.dairyflow.ui.common.ActionRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.CustomersViewModel

@Composable
fun CustomersScreen(viewModel: CustomersViewModel, onOpenDetail: (String) -> Unit) {
    val state by viewModel.state.collectAsState()
    var editing by remember { mutableStateOf<Customer?>(null) }
    LaunchedEffect(Unit) { viewModel.load() }

    ScreenColumn("Customers") {
        CustomerForm(editing, onSave = {
            viewModel.save(it)
            editing = null
        }, onClear = { editing = null })

        SectionTitle("Customer list")
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(state.error ?: "Error", viewModel::load)
            state.data.isNullOrEmpty() -> EmptyState("No customers yet. Add your first customer above.")
            else -> PaddedList {
                items(state.data.orEmpty(), key = { it.id ?: it.name }) { customer ->
                    CustomerCard(customer, onOpen = { customer.id?.let(onOpenDetail) }, onEdit = { editing = customer }, onDelete = {
                        customer.id?.let(viewModel::delete)
                    })
                }
            }
        }
    }
}

@Composable
private fun CustomerForm(editing: Customer?, onSave: (Customer) -> Unit, onClear: () -> Unit) {
    var name by remember(editing?.id) { mutableStateOf(editing?.name.orEmpty()) }
    var phone by remember(editing?.id) { mutableStateOf(editing?.phone.orEmpty()) }
    var address by remember(editing?.id) { mutableStateOf(editing?.address.orEmpty()) }
    var rate by remember(editing?.id) { mutableStateOf(editing?.milkRate?.toString().orEmpty()) }
    var quantity by remember(editing?.id) { mutableStateOf(editing?.dailyQuantity?.toString().orEmpty()) }

    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (editing == null) "Add customer" else "Edit customer")
            OutlinedTextField(name, { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(phone, { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(address, { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(rate, { rate = it }, label = { Text("Milk rate") }, modifier = Modifier.weight(1f))
                OutlinedTextField(quantity, { quantity = it }, label = { Text("Daily qty") }, modifier = Modifier.weight(1f))
            }
            ActionRow(
                primary = if (editing == null) "Add" else "Update",
                onPrimary = {
                    onSave(
                        Customer(
                            id = editing?.id,
                            profileId = editing?.profileId,
                            routeId = editing?.routeId,
                            name = name,
                            phone = phone.ifBlank { null },
                            address = address.ifBlank { null },
                            milkRate = rate.toDoubleOrNull() ?: 0.0,
                            dailyQuantity = quantity.toDoubleOrNull() ?: 0.0
                        )
                    )
                },
                secondary = "Clear",
                onSecondary = onClear
            )
        }
    }
}

@Composable
private fun CustomerCard(customer: Customer, onOpen: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onOpen)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(customer.name)
            Text("${customer.phone.orEmpty()}  ${customer.address.orEmpty()}")
            Text("Rate Rs ${customer.milkRate} / L, Daily ${customer.dailyQuantity} L")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onEdit) { Text("Edit") }
                OutlinedButton(onClick = onOpen) { Text("Detail") }
                OutlinedButton(onClick = onDelete) { Text("Delete") }
            }
        }
    }
}
