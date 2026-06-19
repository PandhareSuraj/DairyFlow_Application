package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.DeliveryBoyPaymentCollection
import com.example.dairyflow.data.model.DeliveryBoyDailyPerformanceDetails
import com.example.dairyflow.data.model.DeliveryBoyPerformance
import com.example.dairyflow.data.model.PaymentCollectionFilter
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.AdminRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DeliveryBoyAdminActionViewModel(
    private val repository: AdminRepository
) : ViewModel() {
    private val _performanceState = MutableStateFlow(UiState<DeliveryBoyPerformance>())
    val performanceState: StateFlow<UiState<DeliveryBoyPerformance>> = _performanceState.asStateFlow()

    private val _paymentState = MutableStateFlow(UiState<DeliveryBoyPaymentCollection>())
    val paymentState: StateFlow<UiState<DeliveryBoyPaymentCollection>> = _paymentState.asStateFlow()

    private val _dailyDetailsState = MutableStateFlow(UiState<DeliveryBoyDailyPerformanceDetails>())
    val dailyDetailsState: StateFlow<UiState<DeliveryBoyDailyPerformanceDetails>> = _dailyDetailsState.asStateFlow()

    fun loadPerformance(
        deliveryBoyId: String,
        month: String = todayIsoDate().take(7),
        routeId: String? = null
    ) = viewModelScope.launch {
        _performanceState.value = UiState(isLoading = true, data = _performanceState.value.data)
        _performanceState.value = runCatching {
            repository.loadDeliveryBoyPerformance(deliveryBoyId, month, routeId?.ifBlank { null })
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                UiState(data = _performanceState.value.data, error = it.message ?: "Unable to load performance.")
            }
        )
    }

    fun loadPayments(
        deliveryBoyId: String,
        filter: PaymentCollectionFilter = PaymentCollectionFilter.THIS_MONTH,
        startDate: String = todayIsoDate().take(7) + "-01",
        endDate: String = todayIsoDate()
    ) = viewModelScope.launch {
        _paymentState.value = UiState(isLoading = true, data = _paymentState.value.data)
        _paymentState.value = runCatching {
            repository.loadDeliveryBoyPaymentCollection(deliveryBoyId, filter, startDate, endDate)
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                UiState(data = _paymentState.value.data, error = it.message ?: "Unable to load payment collection.")
            }
        )
    }

    fun loadDailyDetails(deliveryBoyId: String, date: String) = viewModelScope.launch {
        _dailyDetailsState.value = UiState(isLoading = true, data = _dailyDetailsState.value.data)
        _dailyDetailsState.value = runCatching {
            repository.loadDeliveryBoyDailyPerformanceDetails(deliveryBoyId, date)
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                UiState(data = _dailyDetailsState.value.data, error = it.message ?: "Unable to load daily performance.")
            }
        )
    }

    fun saveTakenMilk(
        deliveryBoyId: String,
        date: String,
        cowMilkTakenLiters: Double,
        buffaloMilkTakenLiters: Double,
        notes: String?,
        month: String = date.take(7),
        routeId: String? = null
    ) = viewModelScope.launch {
        _dailyDetailsState.value = UiState(isLoading = true, data = _dailyDetailsState.value.data)
        runCatching {
            repository.saveDeliveryBoyTakenMilk(
                deliveryBoyId = deliveryBoyId,
                date = date,
                cowMilkTakenLiters = cowMilkTakenLiters,
                buffaloMilkTakenLiters = buffaloMilkTakenLiters,
                notes = notes
            )
        }.onSuccess {
            loadDailyDetails(deliveryBoyId, date)
            loadPerformance(deliveryBoyId, month, routeId)
        }.onFailure {
            _dailyDetailsState.value = UiState(
                data = _dailyDetailsState.value.data,
                error = it.message ?: "Unable to save taken milk quantity."
            )
        }
    }
}
