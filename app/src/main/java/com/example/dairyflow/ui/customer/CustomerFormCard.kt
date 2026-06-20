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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.ui.common.OptionDropdown
import android.app.Activity
import android.content.Intent
import android.provider.ContactsContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Contacts
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.ui.platform.LocalContext

@Composable
fun CustomerFormCard(
    editing: Customer?,
    routes: List<RouteRow> = emptyList(),
    products: List<ProductRow> = emptyList(),
    onSave: (Customer) -> Unit,
    onClear: () -> Unit,
    primaryLabel: String = if (editing == null) "Add" else "Update",
    secondaryLabel: String = "Clear"
) {
    var fullName by remember(editing?.id) { mutableStateOf(editing?.name.orEmpty()) }
    var phone by remember(editing?.id) { mutableStateOf(editing?.phone.orEmpty().takeLast(10)) }
    var address by remember(editing?.id) { mutableStateOf(editing?.address.orEmpty()) }
    var area by remember(editing?.id) { mutableStateOf(editing?.area.orEmpty()) }
    var selectedRouteId by remember(editing?.id, routes) {
        mutableStateOf(editing?.routeId?.takeIf { id -> routes.any { it.id == id } }.orEmpty())
    }
    var category by remember(editing?.id) { mutableStateOf(editing?.productCategory ?: editing?.milkType ?: "Cow") }
    var selectedProductId by remember(editing?.id, products) {
        mutableStateOf(editing?.productId?.takeIf { id -> products.any { it.id == id } }.orEmpty())
    }
    var dailyQuantity by remember(editing?.id) { mutableStateOf(editing?.dailyQuantity?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var pricePerLiter by remember(editing?.id) { mutableStateOf(editing?.milkRate?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var deliveryTime by remember(editing?.id) { mutableStateOf(editing?.deliveryTime ?: "Morning") }
    var status by remember(editing?.id) { mutableStateOf(if (editing?.isActive == false) "inactive" else "active") }
    var advancePayment by remember(editing?.id) { mutableStateOf(editing?.advancePayment?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var openingBalance by remember(editing?.id) { mutableStateOf(editing?.openingBalance?.takeIf { it > 0.0 }?.toString().orEmpty()) }
    var notes by remember(editing?.id) { mutableStateOf(editing?.notes.orEmpty()) }
    val errors = remember(editing?.id) { mutableStateMapOf<String, String>() }
    val routeOptions = remember(routes) {
        listOf("No route") + routes.map { it.displayName }
    }
    val selectedRouteName = routes.firstOrNull { it.id == selectedRouteId }?.displayName ?: "No route"
    val activeProducts = remember(products) { products.filter { it.status.equals("active", ignoreCase = true) } }
    val filteredProducts = remember(activeProducts, category) {
        activeProducts.filter { it.category.equals(category, ignoreCase = true) && !it.id.isNullOrBlank() }
    }
    val selectedProductName = filteredProducts.firstOrNull { it.id == selectedProductId }?.name
        ?: activeProducts.firstOrNull { it.id == selectedProductId }?.name
        ?: ""

    LaunchedEffect(category, filteredProducts) {
        if (selectedProductId.isNotBlank() && filteredProducts.none { it.id == selectedProductId }) {
            selectedProductId = ""
        }
    }

    val context = LocalContext.current
    val contactLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val contactUri = result.data?.data
            if (contactUri != null) {
                val projection = arrayOf(
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
                )
                try {
                    context.contentResolver.query(contactUri, projection, null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) {
                            val numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                            val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                            if (numberIndex >= 0) {
                                val rawNumber = cursor.getString(numberIndex).orEmpty()
                                phone = rawNumber.filter { it.isDigit() }.takeLast(10)
                            }
                            if (nameIndex >= 0) {
                                fullName = cursor.getString(nameIndex).orEmpty()
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    val onPickContact = {
        try {
            val intent = Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI)
            contactLauncher.launch(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

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
                trailingIcon = {
                    IconButton(onClick = onPickContact) {
                        Icon(
                            imageVector = Icons.Filled.Contacts,
                            contentDescription = "Select from Contacts",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                },
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
                trailingIcon = {
                    IconButton(onClick = onPickContact) {
                        Icon(
                            imageVector = Icons.Filled.Contacts,
                            contentDescription = "Select from Contacts",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
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
            OptionDropdown("Category", category, listOf("Cow", "Buffalo"), { selected ->
                category = selected
            }, Modifier.fillMaxWidth())
            errors["category"]?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            OptionDropdown(
                "Product",
                selectedProductName.ifBlank { if (filteredProducts.isEmpty()) "No products available for this category" else "" },
                filteredProducts.map { it.name },
                { selected ->
                    val product = filteredProducts.firstOrNull { it.name == selected }
                    selectedProductId = product?.id.orEmpty()
                    product?.price?.takeIf { it > 0.0 }?.let { pricePerLiter = it.toString() }
                },
                Modifier.fillMaxWidth()
            )
            errors["product"]?.let { Text(it, color = MaterialTheme.colorScheme.error) }
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
            OutlinedTextField(
                advancePayment,
                { advancePayment = it },
                label = { Text("Advance Payment optional") },
                isError = errors["advance"] != null,
                supportingText = { errors["advance"]?.let { Text(it) } },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )
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
                        val advance = advancePayment.toDoubleOrNull() ?: 0.0
                        if (fullName.isBlank()) errors["fullName"] = "Name is required."
                        if (phone.length != 10) errors["phone"] = "Mobile number must be 10 digits."
                        if (selectedProductId.isBlank()) errors["product"] = "Product is required."
                        if (qty <= 0.0) errors["quantity"] = "Quantity must be positive."
                        if (price <= 0.0) errors["price"] = "Price must be positive."
                        if (advance < 0.0) errors["advance"] = "Advance payment cannot be negative."
                        if (errors.isEmpty()) {
                            onSave(
                                Customer(
                                    id = editing?.id,
                                    adminId = editing?.adminId,
                                    profileId = editing?.profileId,
                                    routeId = selectedRouteId.ifBlank { null },
                                    productId = selectedProductId.ifBlank { null },
                                    productName = filteredProducts.firstOrNull { it.id == selectedProductId }?.name,
                                    productCategory = category,
                                    fullName = fullName.trim(),
                                    name = fullName.trim(),
                                    phone = phone,
                                    address = address.trim().ifBlank { null },
                                    area = area.trim().ifBlank { null },
                                    milkRate = price,
                                    dailyQuantity = qty,
                                    milkType = category,
                                    deliveryTime = deliveryTime,
                                    openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                                    advancePayment = advance,
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
