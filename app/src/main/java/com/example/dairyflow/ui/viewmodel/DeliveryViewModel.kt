package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.ProductRow
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
    val deliveries: List<DeliveryRecord> = emptyList(),
    val customerRows: List<CustomerRow> = emptyList(),
    val productRows: List<ProductRow> = emptyList(),
    val deliveryRows: List<DeliveryRow> = emptyList(),
    val selectedDate: String = todayIsoDate(),
    val autoCreatedCount: Int = 0
)

class DeliveryViewModel(
    private val deliveryRepository: DeliveryRepository,
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<DeliveryScreenState>())
    val state: StateFlow<UiState<DeliveryScreenState>> = _state.asStateFlow()

    fun load(date: String = todayIsoDate()) = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching {
            val createdCount = deliveryRepository.ensureDailyDeliveries(date)
            DeliveryScreenState(
                customers = customerRepository.getCustomers(),
                products = deliveryRepository.getProducts(),
                deliveries = deliveryRepository.getDeliveriesForDate(date),
                customerRows = customerRepository.getCustomerRows(),
                productRows = deliveryRepository.getProductRows(),
                deliveryRows = deliveryRepository.getDeliveryRows(date),
                selectedDate = date,
                autoCreatedCount = createdCount
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _state.value.data, error = it.message ?: "Unable to load deliveries.") }
        )
    }

    fun save(record: DeliveryRecord) = viewModelScope.launch {
        runCatching { deliveryRepository.saveDelivery(record) }.fold(
            onSuccess = { load(record.deliveryDate) },
            onFailure = {
                Log.e("DeliverySaveError", "Failed to save delivery.", it)
                _state.value = UiState(
                    data = _state.value.data,
                    error = it.userFacingSaveError("Unable to save delivery. Please try again.")
                )
            }
        )
    }

    fun addDelivery(
        customerId: String,
        productId: String?,
        deliveryDate: String,
        deliveryTime: String,
        quantity: Double,
        unitPrice: Double,
        deliveryStatus: String,
        paymentStatus: String,
        notes: String?,
        onSaved: () -> Unit
    ) = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        runCatching {
            deliveryRepository.addDelivery(
                deliveryRepository.deliveryPayload(
                    customerId = customerId,
                    productId = productId,
                    deliveryDate = deliveryDate,
                    deliveryTime = deliveryTime,
                    quantity = quantity,
                    unitPrice = unitPrice,
                    deliveryStatus = deliveryStatus,
                    paymentStatus = paymentStatus,
                    notes = notes
                )
            )
        }.fold(
            onSuccess = {
                load(deliveryDate)
                onSaved()
            },
            onFailure = {
                Log.e("DeliverySaveError", "Failed to save delivery.", it)
                _state.value = UiState(
                    data = _state.value.data,
                    error = it.userFacingSaveError("Unable to save delivery. Please try again.")
                )
            }
        )
    }

    fun updateDeliveryStatus(id: String, status: String) = viewModelScope.launch {
        runCatching { deliveryRepository.updateDeliveryStatus(id, status) }.fold(
            onSuccess = { load(_state.value.data?.selectedDate ?: todayIsoDate()) },
            onFailure = {
                Log.e("DeliverySaveError", "Failed to update delivery status.", it)
                _state.value = UiState(
                    data = _state.value.data,
                    error = it.userFacingSaveError("Unable to save delivery. Please try again.")
                )
            }
        )
    }

    fun deleteDelivery(id: String) = viewModelScope.launch {
        runCatching { deliveryRepository.deleteDelivery(id) }
        load(_state.value.data?.selectedDate ?: todayIsoDate())
    }
}
