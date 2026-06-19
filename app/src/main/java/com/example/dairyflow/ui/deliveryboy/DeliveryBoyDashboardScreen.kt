package com.example.dairyflow.ui.deliveryboy

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryBoyViewModel

@Composable
fun DeliveryBoyDashboardScreen(
    viewModel: DeliveryBoyViewModel,
    authViewModel: AuthViewModel,
    onAddCustomer: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    var skipTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var editTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var extraTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var detailTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var completeConfirm by remember { mutableStateOf(false) }
    var skipReason by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        authViewModel.loadProfile()
        viewModel.load()
    }

    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Delivery Boy Dashboard", style = MaterialTheme.typography.headlineSmall)
        OutlinedButton(onClick = onAddCustomer, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Filled.PersonAdd, contentDescription = null)
            Text("Add Customer")
        }
        Button(onClick = { completeConfirm = true }, modifier = Modifier.fillMaxWidth()) {
            Text("Complete Today Delivery")
        }
        if (state.isLoading && state.data == null) LoadingState("Loading today's route...")
        if (state.isLoading && state.data != null) RefreshingState("Refreshing route...")
        state.error?.let { ErrorState(it, onRetry = { viewModel.load() }) }
        detailTarget?.let { delivery ->
            DeliveryBoyDetailsPage(
                delivery = delivery,
                routeName = state.data?.route?.displayName ?: "No route assigned",
                customers = state.data?.customers.orEmpty(),
                products = state.data?.products.orEmpty(),
                invoices = state.data?.outstandingInvoices.orEmpty(),
                onEdit = { editTarget = delivery },
                onAddExtra = { extraTarget = delivery },
                onBack = { detailTarget = null }
            )
        } ?: TodayDeliveriesContent(
            deliveries = state.data?.deliveries.orEmpty(),
            customers = state.data?.customers.orEmpty(),
            products = state.data?.products.orEmpty(),
            onDelivered = { viewModel.markDelivered(it) },
            onSkip = { delivery -> skipTarget = delivery },
            onDetails = { delivery -> detailTarget = delivery }
        )
    }

    skipTarget?.let { delivery ->
        AlertDialog(
            onDismissRequest = { skipTarget = null },
            title = { Text("Skip Today") },
            text = {
                OutlinedTextField(skipReason, { skipReason = it }, label = { Text("Skip reason") }, modifier = Modifier.fillMaxWidth())
            },
            confirmButton = {
                Button({
                    delivery.id?.let { viewModel.skipToday(it, skipReason) }
                    skipReason = ""
                    skipTarget = null
                }) { Text("Skip Today") }
            },
            dismissButton = { TextButton({ skipTarget = null }) { Text("Cancel") } }
        )
    }

    if (completeConfirm) {
        AlertDialog(
            onDismissRequest = { completeConfirm = false },
            title = { Text("Complete Today Delivery") },
            text = { Text("Are you sure you want to complete today's delivery?") },
            confirmButton = {
                Button(onClick = {
                    viewModel.completeTodayDeliveries()
                    completeConfirm = false
                }) {
                    Text("Complete")
                }
            },
            dismissButton = { TextButton(onClick = { completeConfirm = false }) { Text("Cancel") } }
        )
    }

    editTarget?.let { delivery ->
        DeliveryEditDialog(
            title = "Edit Delivery",
            delivery = delivery,
            products = state.data?.products.orEmpty(),
            confirmLabel = "Save",
            onDismiss = { editTarget = null },
            onConfirm = { productId, quantity ->
                delivery.id?.let { viewModel.updateDeliveryDetails(it, productId, quantity) }
                editTarget = null
            }
        )
    }

    extraTarget?.let { delivery ->
        DeliveryEditDialog(
            title = "Add Extra Product",
            delivery = delivery,
            products = state.data?.products.orEmpty(),
            quantityOverride = "",
            confirmLabel = "Add Product",
            onDismiss = { extraTarget = null },
            onConfirm = { productId, quantity ->
                if (!productId.isNullOrBlank()) {
                    delivery.id?.let { viewModel.addExtraProduct(it, productId, quantity) }
                    extraTarget = null
                }
            }
        )
    }
}

@Composable
private fun TodayDeliveriesContent(
    deliveries: List<DeliveryRow>,
    customers: List<CustomerRow>,
    products: List<ProductRow>,
    onDelivered: (String) -> Unit,
    onSkip: (DeliveryRow) -> Unit,
    onDetails: (DeliveryRow) -> Unit
) {
    if (deliveries.isEmpty()) {
        EmptyState("No deliveries generated for today.")
        return
    }
    Column(
        modifier = Modifier
            .verticalScroll(rememberScrollState())
            .padding(bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        val deliveredDeliveries = deliveries
            .filter { (it.deliveryBoyStatus ?: it.deliveryStatus).equals("Delivered", ignoreCase = true) }
        val cowLiters = deliveredDeliveries
            .filter { delivery -> milkTypeLabel(customers, products, delivery).equals("Cow milk", ignoreCase = true) }
            .sumOf { it.quantity }
        val buffaloLiters = deliveredDeliveries
            .filter { delivery -> milkTypeLabel(customers, products, delivery).equals("Buffalo milk", ignoreCase = true) }
            .sumOf { it.quantity }
        Text(
            "Delivered liters: Cow %.1f L, Buffalo %.1f L".format(cowLiters, buffaloLiters),
            style = MaterialTheme.typography.titleSmall
        )
        DeliveryCards(
            deliveries = deliveries,
            customers = customers,
            products = products,
            onDelivered = onDelivered,
            onSkip = onSkip,
            onDetails = onDetails
        )
    }
}

@Composable
private fun DeliveryCards(
    deliveries: List<DeliveryRow>,
    customers: List<CustomerRow>,
    products: List<ProductRow>,
    onDelivered: (String) -> Unit,
    onSkip: (DeliveryRow) -> Unit,
    onDetails: (DeliveryRow) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        deliveries.forEach { delivery ->
            val customer = customers.firstOrNull { it.id == delivery.customerId }
            val productName = products.firstOrNull { it.id == delivery.productId }?.name ?: customer?.milkType ?: "Product"
            val selectedStatus = delivery.deliveryBoyStatus ?: "Delivered"
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(customer?.displayName ?: delivery.customerId, style = MaterialTheme.typography.titleMedium)
                    Text("Current status: $selectedStatus")
                    Text("Product: $productName")
                    Text("Quantity: %.1f %s".format(delivery.quantity, productUnit(products, delivery)))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { delivery.id?.let(onDelivered) }, modifier = Modifier.weight(1f)) { Text("Delivered") }
                        OutlinedButton(onClick = { onSkip(delivery) }, modifier = Modifier.weight(1f)) { Text("Skipped") }
                    }
                    OutlinedButton(onClick = { onDetails(delivery) }, modifier = Modifier.fillMaxWidth()) { Text("Details") }
                }
            }
        }
    }
}

@Composable
private fun DeliveryBoyDetailsPage(
    delivery: DeliveryRow,
    routeName: String,
    customers: List<CustomerRow>,
    products: List<ProductRow>,
    invoices: List<InvoiceRow>,
    onEdit: () -> Unit,
    onAddExtra: () -> Unit,
    onBack: () -> Unit
) {
    val customer = customers.firstOrNull { it.id == delivery.customerId }
    val product = products.firstOrNull { it.id == delivery.productId }
    val status = delivery.deliveryBoyStatus ?: "Delivered"
    val amount = if (status.equals("Skipped", ignoreCase = true)) 0.0 else delivery.totalAmount
    val outstanding = invoices.filter { it.customerId == delivery.customerId }.sumOf { it.balanceAmount }
    Column(
        modifier = Modifier
            .verticalScroll(rememberScrollState())
            .padding(bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        TextButton(onClick = onBack) { Text("Back") }
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(customer?.displayName ?: delivery.customerId, style = MaterialTheme.typography.titleMedium)
                Button(onClick = onEdit, modifier = Modifier.fillMaxWidth()) { Text("Edit Quantity") }
                OutlinedButton(onClick = onAddExtra, modifier = Modifier.fillMaxWidth()) { Text("Add Product") }
                DetailRow("Mobile", customer?.phone ?: "-")
                DetailRow("Address", customer?.address ?: customer?.area ?: "-")
                DetailRow("Route", routeName)
                DetailRow("Milk type / product", product?.name ?: customer?.milkType ?: "Product")
                DetailRow("Morning quantity", "${customer?.morningQuantity ?: 0.0} L")
                DetailRow("Evening quantity", "${customer?.eveningQuantity ?: 0.0} L")
                DetailRow("Rate", "Rs %.2f".format(delivery.unitPrice))
                DetailRow("Amount", "Rs %.2f".format(amount))
                DetailRow("Delivery status", status)
                DetailRow("Payment outstanding amount", "Rs %.2f".format(outstanding))
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value.ifBlank { "-" }, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun DeliveryEditDialog(
    title: String,
    delivery: DeliveryRow,
    products: List<ProductRow>,
    confirmLabel: String,
    quantityOverride: String? = null,
    onDismiss: () -> Unit,
    onConfirm: (String?, Double) -> Unit
) {
    val labels = products.map { product -> productLabel(product) }
    var selectedLabel by remember(delivery.id, products) {
        mutableStateOf(products.firstOrNull { it.id == delivery.productId }?.let { productLabel(it) } ?: labels.firstOrNull().orEmpty())
    }
    var quantity by remember(delivery.id, quantityOverride) {
        mutableStateOf(quantityOverride ?: delivery.quantity.toString())
    }
    val selectedProduct = products.firstOrNull { productLabel(it) == selectedLabel }
    val parsedQuantity = quantity.toDoubleOrNull()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (labels.isNotEmpty()) {
                    OptionDropdown("Product", selectedLabel, labels, { selectedLabel = it }, Modifier.fillMaxWidth())
                }
                OutlinedTextField(
                    value = quantity,
                    onValueChange = { quantity = it },
                    label = { Text("Quantity") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    isError = parsedQuantity == null || parsedQuantity <= 0.0,
                    supportingText = {
                        if (parsedQuantity == null || parsedQuantity <= 0.0) Text("Enter a positive quantity.")
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { parsedQuantity?.takeIf { it > 0.0 }?.let { onConfirm(selectedProduct?.id, it) } },
                enabled = parsedQuantity != null && parsedQuantity > 0.0 && (selectedProduct != null || products.isEmpty())
            ) {
                Text(confirmLabel)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

private fun productLabel(product: ProductRow): String =
    "${product.name} - Rs %.2f".format(product.price)

private fun productUnit(products: List<ProductRow>, delivery: DeliveryRow): String =
    products.firstOrNull { it.id == delivery.productId }?.unit ?: "L"

private fun milkTypeLabel(customers: List<CustomerRow>, products: List<ProductRow>, delivery: DeliveryRow): String {
    val productName = products.firstOrNull { it.id == delivery.productId }?.name.orEmpty()
    val customerMilkType = customers.firstOrNull { it.id == delivery.customerId }?.milkType.orEmpty()
    val source = "$productName $customerMilkType".lowercase()
    return when {
        "buffalo" in source || "buffelo" in source -> "Buffalo milk"
        "cow" in source -> "Cow milk"
        else -> customerMilkType.ifBlank { productName }
    }
}

@Composable
private fun CollectionsContent(deliveries: List<DeliveryRow>, customers: List<CustomerRow>) {
    val billableDeliveries = deliveries.filterNot {
        (it.deliveryBoyStatus ?: it.deliveryStatus).equals("Skipped", ignoreCase = true)
    }
    val paid = billableDeliveries.filter { it.paymentStatus.equals("Paid", ignoreCase = true) }
    val unpaid = billableDeliveries.filter { it.paymentStatus.equals("Unpaid", ignoreCase = true) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Today's collections", style = MaterialTheme.typography.titleMedium)
                Text("Paid: Rs %.2f".format(paid.sumOf { it.totalAmount }))
                Text("Unpaid: Rs %.2f".format(unpaid.sumOf { it.totalAmount }))
            }
        }
        deliveries.forEach { delivery ->
            val customer = customers.firstOrNull { it.id == delivery.customerId }
            val selectedStatus = delivery.deliveryBoyStatus ?: delivery.deliveryStatus
            val amount = if (selectedStatus.equals("Skipped", ignoreCase = true)) 0.0 else delivery.totalAmount
            Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(customer?.displayName ?: delivery.customerId)
                    Text("Rs %.2f - ${delivery.paymentStatus} - $selectedStatus".format(amount))
                }
            }
        }
    }
}
