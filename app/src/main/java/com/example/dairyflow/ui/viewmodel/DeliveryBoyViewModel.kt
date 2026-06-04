package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.DeliveryBoyRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DeliveryBoyDashboardState(
    val route: RouteRow? = null,
    val customers: List<CustomerRow> = emptyList(),
    val deliveries: List<DeliveryRow> = emptyList()
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
                deliveries = repository.getTodayDeliveriesForCurrentDeliveryBoy()
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                Log.w("DeliveryBoyDashboard", "Unable to load delivery boy dashboard.", it)
                UiState(data = _state.value.data, error = it.message ?: "Unable to load today's route.")
            }
        )
    }

    fun markDelivered(deliveryId: String) = runAndReload {
        repository.markTodayDelivered(deliveryId)
    }

    fun skipToday(deliveryId: String, reason: String) = runAndReload {
        repository.skipTodayDelivery(deliveryId, reason)
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
}
