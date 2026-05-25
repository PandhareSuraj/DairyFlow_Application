package com.example.dairyflow.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.data.model.PaymentMethod
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.BillingRepository
import com.example.dairyflow.data.repository.PaymentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PaymentsScreenState(
    val bills: List<BillingRecord> = emptyList(),
    val payments: List<Payment> = emptyList()
)

class PaymentsViewModel(
    private val paymentRepository: PaymentRepository,
    private val billingRepository: BillingRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<PaymentsScreenState>())
    val state: StateFlow<UiState<PaymentsScreenState>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true)
        _state.value = runCatching {
            PaymentsScreenState(billingRepository.getBills(), paymentRepository.getPayments())
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = it.message ?: "Unable to load payments.") }
        )
    }

    fun recordPayment(bill: BillingRecord, amount: Double, method: PaymentMethod, transactionId: String?, notes: String?) = viewModelScope.launch {
        runCatching { paymentRepository.recordPayment(bill, amount, method, transactionId, notes) }
        load()
    }

    fun upiIntent(payeeVpa: String, payeeName: String, amount: Double, note: String): Intent =
        paymentRepository.createUpiIntent(payeeVpa, payeeName, amount, note)

    fun startOnlinePayment(context: Context, bill: BillingRecord, amount: Double) = viewModelScope.launch {
        paymentRepository.startOnlinePayment(context, bill, amount)
    }
}
