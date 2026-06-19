package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerHold
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.DeliveryStatus
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.CustomerRepository
import com.example.dairyflow.data.repository.DeliveryRepository
import com.example.dairyflow.data.repository.InvoiceRepository
import com.example.dairyflow.data.repository.PaymentRepository
import java.util.Calendar
import java.util.Locale
import java.text.SimpleDateFormat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CustomerInsightsViewModel(
    private val customerRepository: CustomerRepository,
    private val deliveryRepository: DeliveryRepository,
    private val invoiceRepository: InvoiceRepository,
    private val paymentRepository: PaymentRepository
) : ViewModel() {
    private val _deliveryChart = MutableStateFlow(UiState<CustomerDeliveryChartData>())
    val deliveryChart: StateFlow<UiState<CustomerDeliveryChartData>> = _deliveryChart.asStateFlow()

    private val _paymentHistory = MutableStateFlow(UiState<CustomerPaymentHistoryData>())
    val paymentHistory: StateFlow<UiState<CustomerPaymentHistoryData>> = _paymentHistory.asStateFlow()

    private val _holdState = MutableStateFlow(SaveState())
    val holdState: StateFlow<SaveState> = _holdState.asStateFlow()

    fun loadDeliveryChart(customerId: String, month: Int, year: Int) = viewModelScope.launch {
        _deliveryChart.value = UiState(isLoading = true, data = _deliveryChart.value.data)
        _deliveryChart.value = runCatching {
            val customer = customerRepository.getCustomer(customerId)
            val deliveries = deliveryRepository.getCustomerDeliveriesForMonth(customerId, month, year)
            val holds = customerRepository.getCustomerHoldRowsForMonth(customerId, month, year)
                .map {
                    CustomerHold(
                        id = it.id,
                        customerId = it.customerId,
                        startDate = it.holdDate,
                        endDate = it.holdDate,
                        reason = it.reason,
                        status = it.status,
                        createdAt = it.createdAt
                    )
                }
            val totalDays = daysInMonth(month, year)
            val deliveredDays = deliveries.filter { it.status == DeliveryStatus.DELIVERED }.map { it.deliveryDate }.distinct().size
            val skippedDays = deliveries.filter { it.status == DeliveryStatus.SKIPPED }.map { it.deliveryDate }.distinct().size
            val pendingDays = deliveries.filter { it.status == DeliveryStatus.PENDING }.map { it.deliveryDate }.distinct().size
            CustomerDeliveryChartData(
                customer = customer,
                month = month,
                year = year,
                totalDays = totalDays,
                deliveredDays = deliveredDays,
                skippedDays = skippedDays,
                pendingDays = pendingDays,
                totalQuantityDelivered = deliveries.filter { it.status == DeliveryStatus.DELIVERED }.sumOf { it.quantity },
                records = deliveries.sortedBy { it.deliveryDate },
                holds = holds.sortedBy { it.startDate }
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _deliveryChart.value.data, error = it.message ?: "Unable to load delivery chart.") }
        )
    }

    fun loadPaymentHistory(customerId: String) = viewModelScope.launch {
        _paymentHistory.value = UiState(isLoading = true, data = _paymentHistory.value.data)
        _paymentHistory.value = runCatching {
            val customer = customerRepository.getCustomer(customerId)
            val invoices = invoiceRepository.getInvoices(customerId)
            val payments = paymentRepository.getPayments(customerId)
            val regularPayments = payments.filterNot { it.isAdvancePayment }
            val advancePayments = payments.filter { it.isAdvancePayment }
            val deliveries = deliveryRepository.getDeliveries().filter { it.customerId == customerId }
            val totalBillAmount = invoices.sumOf { it.totalAmount }
            val paidAmount = regularPayments.sumOf { it.amount }
            CustomerPaymentHistoryData(
                customer = customer,
                totalBillAmount = totalBillAmount,
                paidAmount = paidAmount,
                pendingAmount = (totalBillAmount - paidAmount).coerceAtLeast(0.0),
                advancePaymentAmount = advancePayments.sumOf { it.amount },
                lastPaymentDate = regularPayments.maxByOrNull { it.paymentDate }?.paymentDate,
                skippedDeliveryExcludedAmount = deliveries.filter { it.status == DeliveryStatus.SKIPPED }.sumOf { it.quantity * it.unitPrice },
                invoices = invoices.sortedByDescending { it.billingMonth },
                payments = payments.sortedByDescending { it.paymentDate }
            )
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _paymentHistory.value.data, error = it.message ?: "Unable to load payment history.") }
        )
    }

    fun holdCustomer(customerId: String, startDate: String, endDate: String, reason: String?) = viewModelScope.launch {
        _holdState.value = SaveState(isSaving = true)
        runCatching { customerRepository.addCustomerHold(customerId, startDate, endDate, reason) }.fold(
            onSuccess = {
                _holdState.value = SaveState(message = "Customer hold saved successfully.")
            },
            onFailure = {
                Log.e("CustomerHoldSaveError", "Failed to save customer hold.", it)
                _holdState.value = SaveState(error = it.userFacingSaveError("Unable to save hold. Please try again."))
            }
        )
    }

    fun holdCustomerRange(customerId: String, startDate: String, endDate: String, reason: String?, month: Int, year: Int) = viewModelScope.launch {
        _holdState.value = SaveState(isSaving = true)
        runCatching {
            require(startDate <= endDate) { "To Date cannot be before From Date." }
            val requestedDates = datesBetween(startDate, endDate)
            val deliveredDates = _deliveryChart.value.data
                ?.records
                .orEmpty()
                .filter { it.status == DeliveryStatus.DELIVERED }
                .map { it.deliveryDate }
                .toSet()
            val holdDates = requestedDates.filterNot { it in deliveredDates }
            require(holdDates.isNotEmpty()) { "Selected range only contains delivered dates." }
            customerRepository.addCustomerHolds(customerId, holdDates, reason)
            requestedDates.size - holdDates.size
        }.fold(
            onSuccess = { skippedDelivered ->
                _holdState.value = SaveState(
                    message = if (skippedDelivered > 0) {
                        "Customer hold saved successfully. $skippedDelivered delivered date(s) skipped."
                    } else {
                        "Customer hold saved successfully."
                    }
                )
                loadDeliveryChart(customerId, month, year)
            },
            onFailure = {
                Log.e("CustomerHoldSaveError", "Failed to save customer hold range.", it)
                _holdState.value = SaveState(error = it.userFacingSaveError("Unable to save hold. Please try again."))
            }
        )
    }

    fun holdCustomerDates(customerId: String, dates: List<String>, reason: String?, month: Int, year: Int) = viewModelScope.launch {
        _holdState.value = SaveState(isSaving = true)
        runCatching { customerRepository.addCustomerHolds(customerId, dates, reason) }.fold(
            onSuccess = {
                _holdState.value = SaveState(message = "Customer hold saved successfully.")
                loadDeliveryChart(customerId, month, year)
            },
            onFailure = {
                Log.e("CustomerHoldSaveError", "Failed to save customer hold dates.", it)
                _holdState.value = SaveState(error = it.userFacingSaveError("Unable to save hold. Please try again."))
            }
        )
    }

    fun removeCustomerHoldDate(customerId: String, holdDate: String, month: Int, year: Int) = viewModelScope.launch {
        _holdState.value = SaveState(isSaving = true)
        runCatching { customerRepository.removeCustomerHold(customerId, holdDate) }.fold(
            onSuccess = {
                _holdState.value = SaveState(message = "Customer hold removed successfully.")
                loadDeliveryChart(customerId, month, year)
            },
            onFailure = {
                Log.e("CustomerHoldSaveError", "Failed to remove customer hold date.", it)
                _holdState.value = SaveState(error = it.userFacingSaveError("Unable to remove hold. Please try again."))
            }
        )
    }

    private fun daysInMonth(month: Int, year: Int): Int =
        Calendar.getInstance(Locale.US).apply {
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }.getActualMaximum(Calendar.DAY_OF_MONTH)

    private fun datesBetween(startDate: String, endDate: String): List<String> {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
        val calendar = Calendar.getInstance(Locale.US).apply {
            time = formatter.parse(startDate)!!
        }
        val end = formatter.parse(endDate)!!
        val dates = mutableListOf<String>()
        while (!calendar.time.after(end)) {
            dates += formatter.format(calendar.time)
            calendar.add(Calendar.DAY_OF_MONTH, 1)
        }
        return dates
    }
}

data class CustomerDeliveryChartData(
    val customer: Customer,
    val month: Int,
    val year: Int,
    val totalDays: Int,
    val deliveredDays: Int,
    val skippedDays: Int,
    val pendingDays: Int,
    val totalQuantityDelivered: Double,
    val records: List<DeliveryRecord>,
    val holds: List<CustomerHold> = emptyList()
)

data class CustomerPaymentHistoryData(
    val customer: Customer,
    val totalBillAmount: Double,
    val paidAmount: Double,
    val pendingAmount: Double,
    val advancePaymentAmount: Double,
    val lastPaymentDate: String?,
    val skippedDeliveryExcludedAmount: Double,
    val invoices: List<InvoiceRow>,
    val payments: List<Payment>
)
