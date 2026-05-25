package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CustomersViewModel(private val repository: CustomerRepository) : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<Customer>>())
    val state: StateFlow<UiState<List<Customer>>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true)
        _state.value = runCatching { repository.getCustomers() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = it.message ?: "Unable to load customers.") }
        )
    }

    fun save(customer: Customer) = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        runCatching {
            if (customer.id == null) repository.addCustomer(customer) else repository.updateCustomer(customer)
        }.onFailure {
            _state.value = UiState(data = _state.value.data, error = it.message ?: "Unable to save customer.")
        }
        load()
    }

    fun delete(id: String) = viewModelScope.launch {
        runCatching { repository.deleteCustomer(id) }
        load()
    }
}
