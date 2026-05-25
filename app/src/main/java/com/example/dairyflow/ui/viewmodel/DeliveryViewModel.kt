package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.CustomerRepository
import com.example.dairyflow.data.repository.DeliveryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DeliveryScreenState(
    val customers: List<Customer> = emptyList(),
    val products: List<Product> = emptyList(),
    val deliveries: List<DeliveryRecord> = emptyList()
)

class DeliveryViewModel(
    private val deliveryRepository: DeliveryRepository,
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<DeliveryScreenState>())
    val state: StateFlow<UiState<DeliveryScreenState>> = _state.asStateFlow()

    fun load(date: String = todayIsoDate()) = viewModelScope.launch {
        _state.value = UiState(isLoading = true)
        _state.value = runCatching {
            DeliveryScreenState(
                customers = customerRepository.getCustomers(),
                products = deliveryRepository.getProducts(),
                deliveries = deliveryRepository.getDeliveriesForDate(date)
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = it.message ?: "Unable to load deliveries.") }
        )
    }

    fun save(record: DeliveryRecord) = viewModelScope.launch {
        runCatching { deliveryRepository.saveDelivery(record) }
        load(record.deliveryDate)
    }
}
