package com.example.dairyflow.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.CustomerRow
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
    val payments: List<Payment> = emptyList(),
    val customers: List<CustomerRow> = emptyList(),
    val lastGeneratedInvoice: BillingRecord? = null
)

class PaymentsViewModel(
    private val paymentRepository: PaymentRepository,
    private val billingRepository: BillingRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<PaymentsScreenState>())
    val state: StateFlow<UiState<PaymentsScreenState>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching {
            PaymentsScreenState(
                bills = billingRepository.getBills(),
                payments = paymentRepository.getPayments(),
                customers = billingRepository.getInvoiceCustomers(),
                lastGeneratedInvoice = _state.value.data?.lastGeneratedInvoice
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _state.value.data, error = it.message ?: "Unable to load payments.") }
        )
    }

    fun generateInvoice(customerId: String, billingMonth: String) = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        runCatching { billingRepository.generateBill(customerId, billingMonth) }.fold(
            onSuccess = { generated ->
                runCatching {
                    PaymentsScreenState(
                        bills = billingRepository.getBills(),
                        payments = paymentRepository.getPayments(),
                        customers = billingRepository.getInvoiceCustomers(),
                        lastGeneratedInvoice = generated
                    )
                }.fold(
                    onSuccess = { _state.value = UiState(data = it) },
                    onFailure = { _state.value = UiState(data = PaymentsScreenState(lastGeneratedInvoice = generated)) }
                )
            },
            onFailure = {
                Log.e("InvoiceSaveError", "Failed to generate invoice from payments.", it)
                _state.value = UiState(
                    data = _state.value.data,
                    error = it.userFacingSaveError("Unable to generate invoice. Please check deliveries and month.")
                )
            }
        )
    }

    fun recordPayment(bill: BillingRecord, amount: Double, method: PaymentMethod, transactionId: String?, notes: String?) = viewModelScope.launch {
        runCatching { paymentRepository.recordPayment(bill, amount, method, transactionId, notes) }.fold(
            onSuccess = { load() },
            onFailure = {
                Log.e("PaymentSaveError", "Failed to save payment.", it)
                _state.value = UiState(
                    data = _state.value.data,
                    error = it.userFacingSaveError("Unable to save payment. Please try again.")
                )
            }
        )
    }

    fun upiIntent(payeeVpa: String, payeeName: String, amount: Double, note: String): Intent =
        paymentRepository.createUpiIntent(payeeVpa, payeeName, amount, note)

    fun startOnlinePayment(context: Context, bill: BillingRecord, amount: Double) = viewModelScope.launch {
        paymentRepository.startOnlinePayment(context, bill, amount)
    }
}
