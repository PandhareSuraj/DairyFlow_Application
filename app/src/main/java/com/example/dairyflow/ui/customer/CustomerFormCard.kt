package com.example.dairyflow.ui.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.ui.common.OptionDropdown

@Composable
fun CustomerFormCard(
    editing: Customer?,
    routes: List<RouteRow> = emptyList(),
    onSave: (Customer) -> Unit,
    onClear: () -> Unit,
    primaryLabel: String = if (editing == null) "Add" else "Update",
    secondaryLabel: String = "Clear"
) {
    var fullName by remember(editing?.id) { mutableStateOf(editing?.name.orEmpty()) }
    var phone by remember(editing?.id) { mutableStateOf(editing?.phone.orEmpty().takeLast(10)) }
    var email by remember(editing?.id) { mutableStateOf(editing?.email.orEmpty()) }
    var address by remember(editing?.id) { mutableStateOf(editing?.address.orEmpty()) }
    var area by remember(editing?.id) { mutableStateOf(editing?.area.orEmpty()) }
    var selectedRouteId by remember(editing?.id, routes) {
        mutableStateOf(editing?.routeId?.takeIf { id -> routes.any { it.id == id } }.orEmpty())
    }
    var dailyQuantity by remember(editing?.id) { mutableStateOf(editing?.dailyQuantity?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var milkType by remember(editing?.id) { mutableStateOf(editing?.milkType ?: "Cow") }
    var pricePerLiter by remember(editing?.id) { mutableStateOf(editing?.milkRate?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var deliveryTime by remember(editing?.id) { mutableStateOf(editing?.deliveryTime ?: "Morning") }
    var status by remember(editing?.id) { mutableStateOf(if (editing?.isActive == false) "inactive" else "active") }
    var openingBalance by remember(editing?.id) { mutableStateOf(editing?.openingBalance?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var notes by remember(editing?.id) { mutableStateOf(editing?.notes.orEmpty()) }
    val errors = remember(editing?.id) { mutableStateMapOf<String, String>() }
    val routeOptions = remember(routes) {
        listOf("No route") + routes.map { it.displayName }
    }
    val selectedRouteName = routes.firstOrNull { it.id == selectedRouteId }?.displayName ?: "No route"

    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(if (editing == null) "Add customer" else "Edit customer", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                fullName,
                { fullName = it },
                label = { Text("Customer full name") },
                isError = errors["fullName"] != null,
                supportingText = { errors["fullName"]?.let { Text(it) } },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                phone,
                { phone = it.filter(Char::isDigit).take(10) },
                label = { Text("Mobile number") },
                isError = errors["phone"] != null,
                supportingText = { errors["phone"]?.let { Text(it) } },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(email, { email = it }, label = { Text("Email optional") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(address, { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
            OptionDropdown(
                "Route",
                selectedRouteName,
                routeOptions,
                { selected ->
                    selectedRouteId = routes.firstOrNull { it.displayName == selected }?.id.orEmpty()
                },
                Modifier.fillMaxWidth()
            )
            OutlinedTextField(area, { area = it }, label = { Text("Area / locality") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    dailyQuantity,
                    { dailyQuantity = it },
                    label = { Text("Daily liters") },
                    isError = errors["quantity"] != null,
                    supportingText = { errors["quantity"]?.let { Text(it) } },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    pricePerLiter,
                    { pricePerLiter = it },
                    label = { Text("Price / liter") },
                    isError = errors["price"] != null,
                    supportingText = { errors["price"]?.let { Text(it) } },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f)
                )
            }
            OptionDropdown("Milk type", milkType, listOf("Cow", "Buffalo", "Mixed"), { milkType = it }, Modifier.fillMaxWidth())
            OptionDropdown("Delivery time", deliveryTime, listOf("Morning", "Evening", "Both"), { deliveryTime = it }, Modifier.fillMaxWidth())
            OptionDropdown("Status", status, listOf("active", "inactive"), { status = it }, Modifier.fillMaxWidth())
            OutlinedTextField(
                openingBalance,
                { openingBalance = it },
                label = { Text("Opening pending balance optional") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(notes, { notes = it }, label = { Text("Notes optional") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onClear, modifier = Modifier.weight(1f)) {
                    Text(secondaryLabel)
                }
                Button(
                    onClick = {
                        errors.clear()
                        val qty = dailyQuantity.toDoubleOrNull() ?: 0.0
                        val price = pricePerLiter.toDoubleOrNull() ?: 0.0
                        if (fullName.isBlank()) errors["fullName"] = "Name is required."
                        if (phone.length != 10) errors["phone"] = "Mobile number must be 10 digits."
                        if (qty <= 0.0) errors["quantity"] = "Quantity must be positive."
                        if (price <= 0.0) errors["price"] = "Price must be positive."
                        if (errors.isEmpty()) {
                            onSave(
                                Customer(
                                    id = editing?.id,
                                    adminId = editing?.adminId,
                                    profileId = editing?.profileId,
                                    routeId = selectedRouteId.ifBlank { null },
                                    fullName = fullName.trim(),
                                    name = fullName.trim(),
                                    phone = phone,
                                    email = email.trim().ifBlank { null },
                                    address = address.trim().ifBlank { null },
                                    area = area.trim().ifBlank { null },
                                    milkRate = price,
                                    dailyQuantity = qty,
                                    milkType = milkType,
                                    deliveryTime = deliveryTime,
                                    openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                                    notes = notes.trim().ifBlank { null },
                                    isActive = status == "active",
                                    createdAt = editing?.createdAt
                                )
                            )
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text(primaryLabel)
                }
            }
        }
    }
}
