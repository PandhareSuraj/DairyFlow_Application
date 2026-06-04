package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.BillingRepository
import com.example.dairyflow.data.repository.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BillingScreenState(
    val customers: List<Customer> = emptyList(),
    val bills: List<BillingRecord> = emptyList(),
    val customerRows: List<CustomerRow> = emptyList(),
    val pendingDeliveries: List<DeliveryRow> = emptyList(),
    val invoices: List<InvoiceRow> = emptyList()
)

class BillingViewModel(
    private val billingRepository: BillingRepository,
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<BillingScreenState>())
    val state: StateFlow<UiState<BillingScreenState>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching {
            BillingScreenState(
                customers = customerRepository.getCustomers(),
                bills = billingRepository.getBills(),
                customerRows = customerRepository.getCustomerRows(),
                invoices = billingRepository.getInvoices()
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _state.value.data, error = it.message ?: "Unable to load bills.") }
        )
    }

    fun generate(customerId: String, month: Int = currentMonth(), year: Int = currentYear()) = viewModelScope.launch {
        runCatching { billingRepository.generateMonthlyBill(customerId, month, year) }.fold(
            onSuccess = { load() },
            onFailure = {
                Log.e("InvoiceSaveError", "Failed to generate invoice.", it)
                _state.value = UiState(
                    data = _state.value.data,
                    error = it.userFacingSaveError("Unable to generate invoice. Please try again.")
                )
            }
        )
    }

    fun previewPending(customerId: String, billingMonth: String) = viewModelScope.launch {
        val existing = _state.value.data ?: BillingScreenState()
        _state.value = UiState(isLoading = true, data = existing)
        _state.value = runCatching {
            existing.copy(pendingDeliveries = billingRepository.getPendingDeliveries(customerId, billingMonth))
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = {
                Log.e("BillingError", "Failed to load pending deliveries.", it)
                UiState(data = existing, error = it.userFacingSaveError("Unable to load pending deliveries."))
            }
        )
    }

    fun generateInvoice(customerId: String, billingMonth: String) = viewModelScope.launch {
        val existing = _state.value.data ?: BillingScreenState()
        _state.value = UiState(isLoading = true, data = existing)
        runCatching { billingRepository.generateInvoice(customerId, billingMonth) }.fold(
            onSuccess = { load() },
            onFailure = {
                Log.e("InvoiceSaveError", "Failed to generate invoice.", it)
                _state.value = UiState(
                    data = existing,
                    error = it.userFacingSaveError("Unable to generate invoice. Please try again.")
                )
            }
        )
    }

    fun markInvoicePaid(invoiceId: String, paidAmount: Double) = viewModelScope.launch {
        val existing = _state.value.data ?: BillingScreenState()
        _state.value = UiState(isLoading = true, data = existing)
        runCatching { billingRepository.markInvoicePaid(invoiceId, paidAmount) }.fold(
            onSuccess = { load() },
            onFailure = {
                Log.e("InvoiceSaveError", "Failed to mark invoice paid.", it)
                _state.value = UiState(
                    data = existing,
                    error = it.userFacingSaveError("Unable to update invoice payment. Please try again.")
                )
            }
        )
    }
}
