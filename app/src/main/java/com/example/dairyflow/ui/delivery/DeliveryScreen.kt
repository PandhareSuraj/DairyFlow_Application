package com.example.dairyflow.ui.delivery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
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
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.DeliveryShift
import com.example.dairyflow.data.model.DeliveryStatus
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.ui.common.ActionRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun DeliveryScreen(viewModel: DeliveryViewModel) {
    val state by viewModel.state.collectAsState()
    var selectedDate by remember { mutableStateOf(todayIsoDate()) }
    var search by remember { mutableStateOf("") }
    var shiftFilter by remember { mutableStateOf<DeliveryShift?>(null) }
    var skipReason by remember { mutableStateOf("") }
    LaunchedEffect(selectedDate) { viewModel.load(selectedDate) }

    ScreenColumn("Milk delivery") {
        val customers = state.data?.customers.orEmpty()
        val products = state.data?.products.orEmpty()
        DeliveryEntry(customers, products) { viewModel.save(it) }
        OutlinedTextField(selectedDate, { selectedDate = it }, label = { Text("Delivery date") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(search, { search = it }, label = { Text("Search customer") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(shiftFilter == null, { shiftFilter = null }, label = { Text("All") })
            FilterChip(shiftFilter == DeliveryShift.MORNING, { shiftFilter = DeliveryShift.MORNING }, label = { Text("Morning") })
            FilterChip(shiftFilter == DeliveryShift.EVENING, { shiftFilter = DeliveryShift.EVENING }, label = { Text("Evening") })
        }
        OutlinedTextField(skipReason, { skipReason = it }, label = { Text("Skip reason") }, modifier = Modifier.fillMaxWidth())
        SectionTitle("Today delivery")
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState("Unable to load deliveries. Please try again.", { viewModel.load(selectedDate) }, state.error)
            state.data?.deliveries.isNullOrEmpty() -> EmptyState("No deliveries found for selected date.", "Create Delivery") {}
            else -> PaddedList {
                val filtered = state.data?.deliveries.orEmpty().filter { delivery ->
                    val customerName = customers.firstOrNull { it.id == delivery.customerId }?.name.orEmpty()
                    (shiftFilter == null || delivery.shift == shiftFilter) &&
                        (search.isBlank() || customerName.contains(search, ignoreCase = true) || delivery.customerId.contains(search, ignoreCase = true))
                }
                items(filtered, key = { it.id ?: "${it.customerId}-${it.shift}" }) { delivery ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            val customerName = customers.firstOrNull { it.id == delivery.customerId }?.name ?: delivery.customerId
                            val productName = products.firstOrNull { it.id == delivery.productId }?.productName ?: "Product"
                            Text(customerName)
                            Text(productName)
                            Text("${delivery.shift.name.lowercase()} ${delivery.status.name.lowercase()}")
                            Text("Qty ${delivery.quantity} • Rs ${delivery.totalAmount}")
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { viewModel.save(delivery.copy(status = DeliveryStatus.DELIVERED)) }) {
                                    Text("Mark Delivered")
                                }
                                OutlinedButton(onClick = {
                                    viewModel.save(
                                        delivery.copy(
                                            status = DeliveryStatus.SKIPPED,
                                            quantity = 0.0,
                                            totalAmount = 0.0,
                                            skipReason = skipReason.ifBlank { "Skipped by admin" },
                                            notes = skipReason.ifBlank { "Skipped by admin" }
                                        )
                                    )
                                }) {
                                    Text("Skip Today")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DeliveryEntry(customers: List<Customer>, products: List<Product>, onSave: (DeliveryRecord) -> Unit) {
    var customerId by remember(customers) { mutableStateOf(customers.firstOrNull()?.id.orEmpty()) }
    var productId by remember(products) { mutableStateOf(products.firstOrNull()?.id.orEmpty()) }
    var date by remember { mutableStateOf(todayIsoDate()) }
    var quantity by remember { mutableStateOf("") }
    var unitPrice by remember(products) { mutableStateOf(products.firstOrNull()?.pricePerUnit?.toString().orEmpty()) }
    var shift by remember { mutableStateOf(DeliveryShift.MORNING) }
    var status by remember { mutableStateOf(DeliveryStatus.DELIVERED) }
    var notes by remember { mutableStateOf("") }

    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Entry")
            OutlinedTextField(customerId, { customerId = it }, label = { Text("Customer ID") }, modifier = Modifier.fillMaxWidth())
            if (customers.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    customers.take(3).forEach { customer ->
                        FilterChip(
                            selected = customer.id == customerId,
                            onClick = { customerId = customer.id.orEmpty() },
                            label = { Text(customer.name) }
                        )
                    }
                }
            }
            OutlinedTextField(productId, { productId = it }, label = { Text("Product ID") }, modifier = Modifier.fillMaxWidth())
            if (products.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    products.take(3).forEach { product ->
                        FilterChip(
                            selected = product.id == productId,
                            onClick = {
                                productId = product.id.orEmpty()
                                unitPrice = product.pricePerUnit.toString()
                            },
                            label = { Text(product.productName) }
                        )
                    }
                }
            }
            OutlinedTextField(date, { date = it }, label = { Text("Date yyyy-mm-dd") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(quantity, { quantity = it }, label = { Text("Quantity") }, modifier = Modifier.weight(1f))
                OutlinedTextField(unitPrice, { unitPrice = it }, label = { Text("Unit price") }, modifier = Modifier.weight(1f))
            }
            OutlinedTextField(notes, { notes = it }, label = { Text("Notes") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(shift == DeliveryShift.MORNING, { shift = DeliveryShift.MORNING }, label = { Text("Morning") })
                FilterChip(shift == DeliveryShift.EVENING, { shift = DeliveryShift.EVENING }, label = { Text("Evening") })
                FilterChip(status == DeliveryStatus.DELIVERED, { status = DeliveryStatus.DELIVERED }, label = { Text("Delivered") })
                FilterChip(status == DeliveryStatus.SKIPPED, { status = DeliveryStatus.SKIPPED }, label = { Text("Skipped") })
            }
            ActionRow("Save delivery", {
                if (customerId.isNotBlank() && productId.isNotBlank()) {
                    val qty = quantity.toDoubleOrNull() ?: 0.0
                    val price = unitPrice.toDoubleOrNull() ?: 0.0
                    onSave(
                        DeliveryRecord(
                            customerId = customerId,
                            productId = productId,
                            deliveryDate = date,
                            shift = shift,
                            quantity = qty,
                            unitPrice = price,
                            totalAmount = qty * price,
                            status = status,
                            notes = notes.ifBlank { null }
                        )
                    )
                }
            })
        }
    }
}
