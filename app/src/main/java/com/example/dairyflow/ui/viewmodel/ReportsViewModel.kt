package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.ReportsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ReportsScreenState(
    val deliveries: List<DeliveryRecord> = emptyList(),
    val monthlyBills: List<BillingRecord> = emptyList(),
    val pendingBills: List<BillingRecord> = emptyList(),
    val payments: List<Payment> = emptyList()
)

class ReportsViewModel(private val repository: ReportsRepository) : ViewModel() {
    private val _state = MutableStateFlow(UiState<ReportsScreenState>())
    val state: StateFlow<UiState<ReportsScreenState>> = _state.asStateFlow()

    fun load(date: String = todayIsoDate(), month: Int = currentMonth(), year: Int = currentYear()) = viewModelScope.launch {
        _state.value = UiState(isLoading = true)
        _state.value = runCatching {
            ReportsScreenState(
                deliveries = repository.dailyDeliveryReport(date),
                monthlyBills = repository.monthlyBillingReport(month, year),
                pendingBills = repository.pendingPaymentReport(),
                payments = repository.paymentHistory()
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = it.message ?: "Unable to load reports.") }
        )
    }
}
