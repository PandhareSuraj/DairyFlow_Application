package com.example.dairyflow.ui.product

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
import com.example.dairyflow.ui.viewmodel.ProductViewModel

@Composable
fun AddProductScreen(viewModel: ProductViewModel, onSaved: () -> Unit, onBack: () -> Unit) {
    val saveState by viewModel.saveState.collectAsState()
    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Milk") }
    var unit by remember { mutableStateOf("Liter") }
    var price by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("active") }
    val errors = remember { mutableStateMapOf<String, String>() }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Add Product", style = MaterialTheme.typography.headlineSmall)
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    name,
                    { name = it },
                    label = { Text("Product name") },
                    isError = errors["name"] != null,
                    supportingText = { errors["name"]?.let { Text(it) } },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OptionDropdown("Category", category, listOf("Milk", "Curd", "Paneer", "Ghee", "Butter", "Other"), { category = it }, Modifier.fillMaxWidth())
                errors["category"]?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                OptionDropdown("Unit", unit, listOf("Liter", "Kg", "Gram", "Packet", "Piece"), { unit = it }, Modifier.fillMaxWidth())
                errors["unit"]?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                OutlinedTextField(
                    price,
                    { price = it },
                    label = { Text("Price") },
                    isError = errors["price"] != null,
                    supportingText = { errors["price"]?.let { Text(it) } },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    stock,
                    { stock = it },
                    label = { Text("Stock quantity optional") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(description, { description = it }, label = { Text("Description optional") }, modifier = Modifier.fillMaxWidth())
                OptionDropdown("Status", status, listOf("active", "inactive"), { status = it }, Modifier.fillMaxWidth())
            }
        }
        saveState.error?.let { ErrorState(it) }
        if (saveState.isSaving) LoadingState("Saving product...")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = onBack, enabled = !saveState.isSaving, modifier = Modifier.weight(1f)) {
                Text("Cancel")
            }
            Button(
                onClick = {
                    errors.clear()
                    val amount = price.toDoubleOrNull() ?: 0.0
                    if (name.isBlank()) errors["name"] = "Product name is required."
                    if (category.isBlank()) errors["category"] = "Category is required."
                    if (unit.isBlank()) errors["unit"] = "Unit is required."
                    if (amount <= 0.0) errors["price"] = "Price must be positive."
                    if (errors.isEmpty()) {
                        viewModel.addProduct(
                            name = name.trim(),
                            category = category,
                            unit = unit,
                            price = amount,
                            stockQuantity = stock.toDoubleOrNull() ?: 0.0,
                            description = description.trim().ifBlank { null },
                            status = status,
                            onSaved = onSaved
                        )
                    }
                },
                enabled = !saveState.isSaving,
                modifier = Modifier.weight(1f)
            ) {
                Text("Save Product")
            }
        }
    }
}
