package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.CustomerRepository
import com.example.dairyflow.data.repository.RouteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CustomersViewModel(
    private val repository: CustomerRepository,
    private val routeRepository: RouteRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<Customer>>())
    val state: StateFlow<UiState<List<Customer>>> = _state.asStateFlow()

    private val _routes = MutableStateFlow(UiState<List<RouteRow>>())
    val routes: StateFlow<UiState<List<RouteRow>>> = _routes.asStateFlow()

    private val _saveState = MutableStateFlow(SaveState())
    val saveState: StateFlow<SaveState> = _saveState.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        loadRoutes()
        _state.value = runCatching { repository.getCustomers() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _state.value.data, error = it.message ?: "Unable to load customers.") }
        )
    }

    fun loadRoutes() = viewModelScope.launch {
        _routes.value = UiState(isLoading = true, data = _routes.value.data)
        _routes.value = runCatching { routeRepository.getRouteRows() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _routes.value.data, error = it.message ?: "Unable to load routes.") }
        )
    }

    fun save(customer: Customer, onSaved: (() -> Unit)? = null) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        _state.value = UiState(isLoading = true, data = _state.value.data)
        runCatching {
            if (customer.id == null) repository.addCustomer(customer) else repository.updateCustomer(customer)
        }.fold(
            onSuccess = {
                _saveState.value = SaveState(message = "Customer saved.")
                load()
                onSaved?.invoke()
            },
            onFailure = {
                Log.e("CustomerSaveError", "Failed to save customer.", it)
                val message = it.userFacingSaveError("Unable to save customer. Please try again.")
                _saveState.value = SaveState(error = message)
                _state.value = UiState(
                    data = _state.value.data,
                    error = message
                )
            }
        )
    }

    fun delete(id: String) = viewModelScope.launch {
        runCatching { repository.deleteCustomer(id) }
        load()
    }

    fun addCustomer(
        fullName: String,
        phone: String,
        email: String?,
        address: String?,
        area: String?,
        dailyQuantity: Double,
        milkType: String,
        pricePerLiter: Double,
        deliveryTime: String,
        status: String,
        openingBalance: Double,
        notes: String?,
        onSaved: () -> Unit
    ) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        runCatching {
            repository.addCustomer(
                repository.customerPayload(
                    fullName = fullName,
                    phone = phone,
                    email = email,
                    address = address,
                    area = area,
                    dailyQuantity = dailyQuantity,
                    milkType = milkType,
                    pricePerLiter = pricePerLiter,
                    deliveryTime = deliveryTime,
                    status = status,
                    openingBalance = openingBalance,
                    notes = notes
                )
            )
        }.fold(
            onSuccess = {
                _saveState.value = SaveState(message = "Customer saved.")
                load()
                onSaved()
            },
            onFailure = {
                Log.e("CustomerSaveError", "Failed to save customer.", it)
                _saveState.value = SaveState(
                    error = it.userFacingSaveError("Unable to save customer. Please try again.")
                )
            }
        )
    }
}
