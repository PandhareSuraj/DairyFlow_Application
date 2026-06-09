package com.example.dairyflow.ui.deliveryboy

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
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
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.OptionDropdown
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.RefreshingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.example.dairyflow.ui.viewmodel.DeliveryBoyViewModel

private enum class DeliveryBoySection(val label: String) {
    ROUTE("Today Route"),
    DELIVERIES("Today Deliveries"),
    COLLECTIONS("Collections"),
    PROFILE("Profile")
}

@Composable
fun DeliveryBoyDashboardScreen(
    viewModel: DeliveryBoyViewModel,
    authViewModel: AuthViewModel
) {
    val state by viewModel.state.collectAsState()
    val authState by authViewModel.state.collectAsState()
    var section by remember { mutableStateOf(DeliveryBoySection.DELIVERIES) }
    var skipTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var editTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var extraTarget by remember { mutableStateOf<DeliveryRow?>(null) }
    var completeConfirm by remember { mutableStateOf(false) }
    var skipReason by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        authViewModel.loadProfile()
        viewModel.load()
    }

    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Delivery Boy Dashboard", style = MaterialTheme.typography.headlineSmall)
        Button(onClick = { completeConfirm = true }, modifier = Modifier.fillMaxWidth()) {
            Text("Complete Today Delivery")
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            DeliveryBoySection.entries.forEach { item ->
                FilterChip(selected = section == item, onClick = { section = item }, label = { Text(item.label) })
            }
        }
        if (state.isLoading && state.data == null) LoadingState("Loading today's route...")
        if (state.isLoading && state.data != null) RefreshingState("Refreshing route...")
        state.error?.let { ErrorState(it, onRetry = { viewModel.load() }) }
        when (section) {
            DeliveryBoySection.ROUTE -> TodayRouteContent(
                routeName = state.data?.route?.displayName ?: "No route assigned",
                customers = state.data?.customers.orEmpty(),
                deliveries = state.data?.deliveries.orEmpty(),
                products = state.data?.products.orEmpty(),
                onDelivered = { viewModel.markDelivered(it) },
                onSkip = { delivery -> skipTarget = delivery },
                onEdit = { delivery -> editTarget = delivery },
                onAddExtra = { delivery -> extraTarget = delivery }
            )
            DeliveryBoySection.DELIVERIES -> TodayDeliveriesContent(
                deliveries = state.data?.deliveries.orEmpty(),
                customers = state.data?.customers.orEmpty(),
                products = state.data?.products.orEmpty(),
                onDelivered = { viewModel.markDelivered(it) },
                onSkip = { delivery -> skipTarget = delivery },
                onEdit = { delivery -> editTarget = delivery },
                onAddExtra = { delivery -> extraTarget = delivery }
            )
            DeliveryBoySection.COLLECTIONS -> CollectionsContent(state.data?.deliveries.orEmpty(), state.data?.customers.orEmpty())
            DeliveryBoySection.PROFILE -> Card {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(authState.profile?.fullName ?: authState.email ?: "Delivery boy", style = MaterialTheme.typography.titleMedium)
                    Text(authState.profile?.email ?: authState.email.orEmpty())
                    Text("Role: delivery boy")
                    OutlinedButton(onClick = { authViewModel.signOut() }) { Text("Sign out") }
                }
            }
        }
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
private fun TodayRouteContent(
    routeName: String,
    customers: List<CustomerRow>,
    deliveries: List<DeliveryRow>,
    products: List<ProductRow>,
    onDelivered: (String) -> Unit,
    onSkip: (DeliveryRow) -> Unit,
    onEdit: (DeliveryRow) -> Unit,
    onAddExtra: (DeliveryRow) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(routeName, style = MaterialTheme.typography.titleMedium)
                Text("${customers.size} customers assigned")
            }
        }
        if (customers.isEmpty()) {
            EmptyState("No customers assigned to this route.")
        } else {
            customers.forEach { customer ->
                Card {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(customer.displayName, style = MaterialTheme.typography.titleMedium)
                        Text(customer.phone)
                        Text(customer.address ?: customer.area ?: "No address")
                        Text("Morning ${customer.morningQuantity} L, Evening ${customer.eveningQuantity} L")
                    }
                }
            }
        }
        if (deliveries.isNotEmpty()) {
            Text("Today's deliveries", style = MaterialTheme.typography.titleMedium)
            DeliveryCards(
                deliveries = deliveries,
                customers = customers,
                products = products,
                onDelivered = onDelivered,
                onSkip = onSkip,
                onEdit = onEdit,
                onAddExtra = onAddExtra
            )
        }
    }
}

@Composable
private fun TodayDeliveriesContent(
    deliveries: List<DeliveryRow>,
    customers: List<CustomerRow>,
    products: List<ProductRow>,
    onDelivered: (String) -> Unit,
    onSkip: (DeliveryRow) -> Unit,
    onEdit: (DeliveryRow) -> Unit,
    onAddExtra: (DeliveryRow) -> Unit
) {
    if (deliveries.isEmpty()) {
        EmptyState("No deliveries generated for today.")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        val deliveredAmount = deliveries
            .filter { (it.deliveryBoyStatus ?: it.deliveryStatus).equals("Delivered", ignoreCase = true) }
            .sumOf { it.totalAmount }
        Text(
            "Delivered amount: Rs %.2f".format(deliveredAmount),
            style = MaterialTheme.typography.titleSmall
        )
        DeliveryCards(
            deliveries = deliveries,
            customers = customers,
            products = products,
            onDelivered = onDelivered,
            onSkip = onSkip,
            onEdit = onEdit,
            onAddExtra = onAddExtra
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
    onEdit: (DeliveryRow) -> Unit,
    onAddExtra: (DeliveryRow) -> Unit
) {
    PaddedList {
        items(deliveries, key = { it.id ?: "${it.customerId}-${it.deliveryTime}" }) { delivery ->
            val customer = customers.firstOrNull { it.id == delivery.customerId }
            val productName = products.firstOrNull { it.id == delivery.productId }?.name ?: "Product"
            val selectedStatus = delivery.deliveryBoyStatus ?: "Delivered"
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(customer?.displayName ?: delivery.customerId, style = MaterialTheme.typography.titleMedium)
                    Text(customer?.phone ?: "No mobile")
                    Text(customer?.address ?: customer?.area ?: "No address")
                    Text("Morning ${customer?.morningQuantity ?: 0.0} L, Evening ${customer?.eveningQuantity ?: 0.0} L")
                    Text("$productName - ${delivery.deliveryTime} - ${delivery.quantity} ${productUnit(products, delivery)}")
                    Text("Current status: $selectedStatus")
                    Text("Amount: Rs %.2f".format(if (selectedStatus.equals("Skipped", ignoreCase = true)) 0.0 else delivery.totalAmount))
                    (delivery.deliveryBoySkipReason ?: delivery.skipReason)?.takeIf { it.isNotBlank() }?.let { Text("Reason: $it") }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { delivery.id?.let(onDelivered) }) { Text("Delivered") }
                        OutlinedButton(onClick = { onSkip(delivery) }) { Text("Skipped") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { onEdit(delivery) }) { Text("Edit Quantity") }
                        OutlinedButton(onClick = { onAddExtra(delivery) }) { Text("Add Product") }
                    }
                }
            }
        }
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
