package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.PaymentRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.DeliveryBoyRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DeliveryBoyPaymentsState(
    val customers: List<CustomerRow> = emptyList(),
    val invoices: List<InvoiceRow> = emptyList(),
    val payments: List<PaymentRow> = emptyList()
)

class DeliveryBoyPaymentsViewModel(
    private val repository: DeliveryBoyRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<DeliveryBoyPaymentsState>())
    val state: StateFlow<UiState<DeliveryBoyPaymentsState>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching {
            DeliveryBoyPaymentsState(
                customers = repository.getRouteCustomersForCurrentDeliveryBoy(),
                invoices = repository.getOutstandingInvoicesForCurrentDeliveryBoy(),
                payments = repository.getPaymentHistoryForCurrentDeliveryBoy()
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                Log.w("DeliveryBoyPayments", "Unable to load delivery boy payments.", it)
                UiState(data = _state.value.data, error = it.message ?: "Unable to load payments.")
            }
        )
    }

    fun collectPayment(
        invoiceId: String,
        amount: Double,
        paymentMode: String,
        transactionId: String?,
        notes: String?,
        onSaved: () -> Unit
    ) = viewModelScope.launch {
        val current = _state.value.data
        _state.value = UiState(isLoading = true, data = current)
        runCatching {
            repository.collectInvoicePayment(invoiceId, amount, paymentMode, transactionId, notes)
        }.fold(
            onSuccess = {
                load()
                onSaved()
            },
            onFailure = {
                Log.w("DeliveryBoyPayments", "Unable to collect payment.", it)
                _state.value = UiState(data = current, error = it.message ?: "Unable to save payment.")
            }
        )
    }
}
