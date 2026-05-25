package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.BillingRepository
import com.example.dairyflow.data.repository.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BillingScreenState(
    val customers: List<Customer> = emptyList(),
    val bills: List<BillingRecord> = emptyList()
)

class BillingViewModel(
    private val billingRepository: BillingRepository,
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<BillingScreenState>())
    val state: StateFlow<UiState<BillingScreenState>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true)
        _state.value = runCatching {
            BillingScreenState(customerRepository.getCustomers(), billingRepository.getBills())
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = it.message ?: "Unable to load bills.") }
        )
    }

    fun generate(customerId: String, month: Int = currentMonth(), year: Int = currentYear()) = viewModelScope.launch {
        runCatching { billingRepository.generateMonthlyBill(customerId, month, year) }
        load()
    }
}
