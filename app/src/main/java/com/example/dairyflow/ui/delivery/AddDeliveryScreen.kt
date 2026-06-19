package com.example.dairyflow.ui.delivery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.viewmodel.DeliveryViewModel
import com.example.dairyflow.ui.viewmodel.todayIsoDate

@Composable
fun AddDeliveryScreen(viewModel: DeliveryViewModel, onSaved: () -> Unit, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    val data = state.data
    val customers = data?.customerRows.orEmpty()
    val products = data?.productRows.orEmpty()
    var customerLabel by remember(customers) { mutableStateOf(customers.firstOrNull()?.displayName.orEmpty()) }
    var productLabel by remember(products) { mutableStateOf(products.firstOrNull()?.name.orEmpty()) }
    var date by remember { mutableStateOf(todayIsoDate()) }
    var deliveryTime by remember { mutableStateOf("Morning") }
    var quantity by remember { mutableStateOf("") }
    var unitPrice by remember(products) { mutableStateOf(products.firstOrNull()?.price?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var deliveryStatus by remember { mutableStateOf("Pending") }
    var paymentStatus by remember { mutableStateOf("Unpaid") }
    var notes by remember { mutableStateOf("") }
    val errors = remember { mutableStateMapOf<String, String>() }
    val selectedCustomer = customers.firstOrNull { it.displayName == customerLabel }
    val selectedProduct = products.firstOrNull { it.name == productLabel }
    val qty = quantity.toDoubleOrNull() ?: 0.0
    val price = unitPrice.toDoubleOrNull() ?: 0.0
    val total = qty * price

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Add Delivery", style = MaterialTheme.typography.headlineSmall)
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (state.isLoading && data == null) LoadingState("Loading customers and products...")
                OptionDropdown(
                    "Select customer",
                    customerLabel,
                    customers.map { it.displayName },
                    { customerLabel = it },
                    Modifier.fillMaxWidth()
                )
                errors["customer"]?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                OptionDropdown(
                    "Select product",
                    productLabel,
                    products.map { it.name },
                    {
                        productLabel = it
                        unitPrice = products.firstOrNull { product -> product.name == it }?.price?.toString().orEmpty()
                    },
                    Modifier.fillMaxWidth()
                )
                errors["product"]?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                OutlinedTextField(
                    date,
                    { date = it },
                    label = { Text("Delivery date") },
                    isError = errors["date"] != null,
                    supportingText = { errors["date"]?.let { Text(it) } },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OptionDropdown("Delivery time", deliveryTime, listOf("Morning", "Evening"), { deliveryTime = it }, Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        quantity,
                        { quantity = it },
                        label = { Text("Quantity") },
                        isError = errors["quantity"] != null,
                        supportingText = { errors["quantity"]?.let { Text(it) } },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        unitPrice,
                        { unitPrice = it },
                        label = { Text("Unit price") },
                        isError = errors["price"] != null,
                        supportingText = { errors["price"]?.let { Text(it) } },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f)
                    )
                }
                Text("Total amount: Rs %.2f".format(total), style = MaterialTheme.typography.titleMedium)
                OptionDropdown("Delivery status", deliveryStatus, listOf("Pending", "Delivered", "Skipped"), { deliveryStatus = it }, Modifier.fillMaxWidth())
                OptionDropdown("Payment status", paymentStatus, listOf("Paid", "Unpaid"), { paymentStatus = it }, Modifier.fillMaxWidth())
                OutlinedTextField(notes, { notes = it }, label = { Text("Notes optional") }, modifier = Modifier.fillMaxWidth())
            }
        }
        state.error?.let { ErrorState(it) }
        if (state.isLoading && data != null) LoadingState("Saving delivery...")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = onBack, enabled = !state.isLoading, modifier = Modifier.weight(1f)) {
                Text("Cancel")
            }
            Button(
                onClick = {
                    errors.clear()
                    if (selectedCustomer?.id == null) errors["customer"] = "Customer is required."
                    if (selectedProduct?.id == null) errors["product"] = "Product is required."
                    if (date.isBlank()) errors["date"] = "Date is required."
                    if (qty <= 0.0) errors["quantity"] = "Quantity must be positive."
                    if (price <= 0.0) errors["price"] = "Unit price must be positive."
                    if (errors.isEmpty()) {
                        viewModel.addDelivery(
                            customerId = selectedCustomer?.id.orEmpty(),
                            productId = selectedProduct?.id,
                            deliveryDate = date,
                            deliveryTime = deliveryTime,
                            quantity = qty,
                            unitPrice = price,
                            deliveryStatus = deliveryStatus,
                            paymentStatus = paymentStatus,
                            notes = notes.trim().ifBlank { null },
                            onSaved = onSaved
                        )
                    }
                },
                enabled = !state.isLoading,
                modifier = Modifier.weight(1f)
            ) {
                Text("Save Delivery")
            }
        }
    }
}
