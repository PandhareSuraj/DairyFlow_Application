package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.DeliveryBoyRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

data class DeliveryBoyDashboardState(
    val route: RouteRow? = null,
    val customers: List<CustomerRow> = emptyList(),
    val products: List<ProductRow> = emptyList(),
    val deliveries: List<DeliveryRow> = emptyList(),
    val extraBaseDeliveryIds: Map<String, String> = emptyMap()
)

class DeliveryBoyViewModel(
    private val repository: DeliveryBoyRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<DeliveryBoyDashboardState>())
    val state: StateFlow<UiState<DeliveryBoyDashboardState>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching {
            DeliveryBoyDashboardState(
                route = repository.getAssignedRouteForCurrentDeliveryBoy(),
                customers = repository.getRouteCustomersForCurrentDeliveryBoy(),
                products = repository.getProductRowsForCurrentDeliveryBoy(),
                deliveries = repository.getTodayDeliveriesForCurrentDeliveryBoy().map { it.withDefaultDeliveryBoyStatus() }
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                Log.w("DeliveryBoyDashboard", "Unable to load delivery boy dashboard.", it)
                UiState(data = _state.value.data, error = it.message ?: "Unable to load today's route.")
            }
        )
    }

    fun markDelivered(deliveryId: String) {
        updateLocalDelivery(deliveryId) {
            copy(
                deliveryBoyStatus = "Delivered",
                deliveryBoySkipReason = null,
                totalAmount = quantity * unitPrice
            )
        }
    }

    fun skipToday(deliveryId: String, reason: String) {
        updateLocalDelivery(deliveryId) {
            copy(
                deliveryBoyStatus = "Skipped",
                deliveryBoySkipReason = reason.ifBlank { "Skipped by delivery boy" },
                totalAmount = 0.0
            )
        }
    }

    fun updateDeliveryDetails(deliveryId: String, productId: String?, quantity: Double) {
        if (quantity <= 0.0) {
            _state.value = UiState(data = _state.value.data, error = "Quantity must be positive.")
            return
        }
        val products = _state.value.data?.products.orEmpty()
        updateLocalDelivery(deliveryId) {
            val selectedProduct = products.firstOrNull { it.id == productId }
            val nextProductId = selectedProduct?.id ?: this.productId
            val nextUnitPrice = selectedProduct?.price ?: unitPrice
            val nextStatus = deliveryBoyStatus ?: "Delivered"
            copy(
                productId = nextProductId,
                quantity = quantity,
                unitPrice = nextUnitPrice,
                totalAmount = if (nextStatus.equals("Skipped", ignoreCase = true)) 0.0 else quantity * nextUnitPrice,
                deliveryBoyStatus = nextStatus
            )
        }
    }

    fun addExtraProduct(deliveryId: String, productId: String, quantity: Double) {
        val data = _state.value.data ?: return
        val baseDelivery = data.deliveries.firstOrNull { it.id == deliveryId } ?: return
        val product = data.products.firstOrNull { it.id == productId }
        if (product == null || quantity <= 0.0) {
            _state.value = UiState(data = data, error = "Select a product and positive quantity.")
            return
        }
        val tempId = "local-extra-${UUID.randomUUID()}"
        val extraDelivery = baseDelivery.copy(
            id = tempId,
            productId = product.id,
            deliveryTime = "${baseDelivery.deliveryTime} Extra",
            quantity = quantity,
            unitPrice = product.price,
            totalAmount = quantity * product.price,
            deliveryStatus = "Pending",
            deliveryBoyStatus = "Delivered",
            paymentStatus = "Unpaid",
            skipReason = null,
            deliveryBoySkipReason = null,
            notes = "Extra product added by delivery boy"
        )
        _state.value = UiState(
            data = data.copy(
                deliveries = data.deliveries + extraDelivery,
                extraBaseDeliveryIds = data.extraBaseDeliveryIds + (tempId to deliveryId)
            )
        )
    }

    fun completeTodayDeliveries() = viewModelScope.launch {
        val data = _state.value.data ?: return@launch
        _state.value = UiState(isLoading = true, data = data)
        runCatching {
            data.deliveries
                .filterNot { it.id.orEmpty().startsWith("local-extra-") }
                .forEach { delivery ->
                    val deliveryId = delivery.id ?: return@forEach
                    val status = delivery.deliveryBoyStatus ?: "Delivered"
                    repository.updateTodayDeliveryDetails(deliveryId, delivery.productId, delivery.quantity)
                    when {
                        status.equals("Skipped", ignoreCase = true) ->
                            repository.skipTodayDelivery(deliveryId, delivery.deliveryBoySkipReason.orEmpty())
                        status.equals("Delivered", ignoreCase = true) ->
                            repository.markTodayDelivered(deliveryId)
                    }
                }

            data.deliveries
                .filter { it.id.orEmpty().startsWith("local-extra-") }
                .forEach { delivery ->
                    val tempId = delivery.id ?: return@forEach
                    val baseDeliveryId = data.extraBaseDeliveryIds[tempId] ?: return@forEach
                    val productId = delivery.productId ?: return@forEach
                    val inserted = repository.addExtraTodayProduct(baseDeliveryId, productId, delivery.quantity)
                    if ((delivery.deliveryBoyStatus ?: "Delivered").equals("Skipped", ignoreCase = true)) {
                        inserted.id?.let { repository.skipTodayDelivery(it, delivery.deliveryBoySkipReason.orEmpty()) }
                    }
                }

            repository.completeTodayDeliveries()
        }.fold(
            onSuccess = { load() },
            onFailure = {
                Log.w("DeliveryBoyDashboard", "Complete today delivery failed.", it)
                _state.value = UiState(data = data, error = it.message ?: "Unable to complete today's delivery.")
            }
        )
    }

    fun markPayment(deliveryId: String, paid: Boolean) = runAndReload {
        repository.markTodayPaymentStatus(deliveryId, paid)
    }

    private fun runAndReload(block: suspend () -> Unit) = viewModelScope.launch {
        runCatching { block() }.onFailure {
            Log.w("DeliveryBoyDashboard", "Delivery boy action failed.", it)
            _state.value = UiState(data = _state.value.data, error = it.message ?: "Unable to update delivery.")
        }
        load()
    }

    private fun updateLocalDelivery(deliveryId: String, update: DeliveryRow.() -> DeliveryRow) {
        val data = _state.value.data ?: return
        _state.value = UiState(
            data = data.copy(
                deliveries = data.deliveries.map { delivery ->
                    if (delivery.id == deliveryId) delivery.update() else delivery
                }
            )
        )
    }

    private fun DeliveryRow.withDefaultDeliveryBoyStatus(): DeliveryRow {
        val selectedStatus = when {
            deliveryCompletedAt != null -> deliveryStatus
            deliveryBoyStatus.isNullOrBlank() -> "Delivered"
            else -> deliveryBoyStatus
        }
        return copy(
            deliveryBoyStatus = selectedStatus,
            totalAmount = if (selectedStatus.equals("Skipped", ignoreCase = true)) 0.0 else quantity * unitPrice
        )
    }
}
