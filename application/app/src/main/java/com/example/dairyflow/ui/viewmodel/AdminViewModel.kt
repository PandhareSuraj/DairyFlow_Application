package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.AdminCustomer
import com.example.dairyflow.data.model.AdminDashboardStats
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
import com.example.dairyflow.data.model.AdminDeliveryStatus
import com.example.dairyflow.data.model.AdminDeliveryBoy
import com.example.dairyflow.data.model.AdminPayment
import com.example.dairyflow.data.model.AdminProfile
import com.example.dairyflow.data.model.AdminRoute
import com.example.dairyflow.data.model.Invoice
import com.example.dairyflow.data.model.InvoiceGenerationResult
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.AdminRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class AdminViewModel(private val repository: AdminRepository) : ViewModel() {
    private val _dataState = MutableStateFlow(UiState<AdminDataBundle>())
    val dataState: StateFlow<UiState<AdminDataBundle>> = _dataState.asStateFlow()

    private val _dashboardState = MutableStateFlow(UiState<AdminDashboardStats>())
    val dashboardState: StateFlow<UiState<AdminDashboardStats>> = _dashboardState.asStateFlow()

    private val _generationState = MutableStateFlow(UiState<InvoiceGenerationResult>())
    val generationState: StateFlow<UiState<InvoiceGenerationResult>> = _generationState.asStateFlow()

    private val _deliveryBoyStatsState = MutableStateFlow(UiState<Map<String, DeliveryBoyLiterStats>>())
    val deliveryBoyStatsState: StateFlow<UiState<Map<String, DeliveryBoyLiterStats>>> = _deliveryBoyStatsState.asStateFlow()

    fun load(date: String = todayIsoDate()) = viewModelScope.launch {
        _dataState.value = UiState(isLoading = true, data = _dataState.value.data)
        _dashboardState.value = UiState(isLoading = true, data = _dashboardState.value.data)
        _deliveryBoyStatsState.value = UiState(isLoading = true, data = _deliveryBoyStatsState.value.data)
        runCatching {
            repository.loadAdminData(date)
        }.onSuccess {
            _dataState.value = UiState(data = it)
            loadDeliveryBoyStats(date, it.deliveries)
        }.onFailure {
            _dataState.value = UiState(data = _dataState.value.data, error = it.message ?: "Unable to load admin data.")
            _deliveryBoyStatsState.value = UiState(
                data = _deliveryBoyStatsState.value.data,
                error = it.message ?: "Unable to load delivery boy liters."
            )
        }
        runCatching {
            repository.dashboardStats(date, currentMonth(), currentYear())
        }.onSuccess {
            _dashboardState.value = UiState(data = it)
        }.onFailure {
            _dashboardState.value = UiState(data = _dashboardState.value.data, error = it.message ?: "Unable to load dashboard.")
        }
    }

    private suspend fun loadDeliveryBoyStats(date: String, todayDeliveries: List<AdminDelivery>) {
        runCatching {
            val monthStart = date.take(7) + "-01"
            val monthEnd = monthEnd(date)
            val monthDeliveries = repository.loadDeliveriesBetween(monthStart, monthEnd)
            buildDeliveryBoyLiterStats(date, todayDeliveries, monthDeliveries)
        }.onSuccess {
            _deliveryBoyStatsState.value = UiState(data = it)
        }.onFailure {
            _deliveryBoyStatsState.value = UiState(
                data = _deliveryBoyStatsState.value.data,
                error = it.message ?: "Unable to load delivery boy liters."
            )
        }
    }

    fun saveProduct(product: Product) = runAndReload { repository.upsertProduct(product) }
    fun deleteProduct(id: String) = runAndReload { repository.deleteProduct(id) }
    fun saveCustomer(customer: AdminCustomer) = runAndReload { repository.upsertCustomer(customer) }
    fun deleteCustomer(id: String) = runAndReload { repository.deleteCustomer(id) }
    fun saveRoute(route: AdminRoute) = runAndReload { repository.upsertRoute(route) }
    fun deleteRoute(id: String) = runAndReload { repository.deleteRoute(id) }
    fun saveDeliveryBoy(deliveryBoy: AdminDeliveryBoy) = runAndReload { repository.upsertDeliveryBoy(deliveryBoy) }
    fun deleteDeliveryBoy(id: String) = runAndReload { repository.deleteDeliveryBoy(id) }
    fun saveProfile(profile: AdminProfile) = runAndReload { repository.upsertProfile(profile) }
    fun saveDelivery(delivery: AdminDelivery) = runAndReload { repository.saveDelivery(delivery) }
    fun skipDelivery(delivery: AdminDelivery, reason: String?) = runAndReload { repository.skipDelivery(delivery, reason) }
    fun addPayment(payment: AdminPayment) = runAndReload { repository.addPayment(payment) }
    fun markInvoicePaid(invoice: Invoice) = runAndReload { repository.markInvoicePaid(invoice) }
    fun createDailyDeliveries(date: String, routeId: String?) = runAndReload { repository.createDailyDeliveries(date, routeId) }

    fun generateMonthlyInvoices(month: Int, year: Int, customerId: String? = null, routeId: String? = null) = viewModelScope.launch {
        _generationState.value = UiState(isLoading = true)
        _generationState.value = runCatching {
            repository.generateMonthlyInvoices(month, year, customerId?.ifBlank { null }, routeId?.ifBlank { null })
        }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = it.message ?: "Unable to generate invoices.") }
        )
        load()
    }

    private fun runAndReload(block: suspend () -> Unit) = viewModelScope.launch {
        _dataState.value = UiState(isLoading = true, data = _dataState.value.data)
        runCatching { block() }.fold(
            onSuccess = { load() },
            onFailure = {
                _dataState.value = UiState(
                    data = _dataState.value.data,
                    error = it.message ?: "Operation failed."
                )
            }
        )
    }
}

data class DeliveryBoyLiterStats(
    val todayLiters: Double = 0.0,
    val monthLiters: Double = 0.0,
    val monthlyDays: List<DeliveryBoyDailyLiters> = emptyList()
)

data class DeliveryBoyDailyLiters(
    val date: String,
    val liters: Double
)

private fun buildDeliveryBoyLiterStats(
    today: String,
    todayDeliveries: List<AdminDelivery>,
    monthDeliveries: List<AdminDelivery>
): Map<String, DeliveryBoyLiterStats> {
    val deliveredThisMonth = monthDeliveries.deliveredWithBoy()
    val deliveredToday = todayDeliveries.deliveredWithBoy().ifEmpty {
        deliveredThisMonth.filter { it.deliveryDate == today }
    }
    val monthlyByBoy = deliveredThisMonth.groupBy { it.deliveryBoyId.orEmpty() }
    val todayByBoy = deliveredToday.groupBy { it.deliveryBoyId.orEmpty() }
    return (monthlyByBoy.keys + todayByBoy.keys).associateWith { deliveryBoyId ->
        val monthRows = monthlyByBoy[deliveryBoyId].orEmpty()
        DeliveryBoyLiterStats(
            todayLiters = todayByBoy[deliveryBoyId].orEmpty().sumOf { it.quantity },
            monthLiters = monthRows.sumOf { it.quantity },
            monthlyDays = monthRows
                .groupBy { it.deliveryDate }
                .map { (date, rows) -> DeliveryBoyDailyLiters(date, rows.sumOf { it.quantity }) }
                .sortedByDescending { it.date }
        )
    }
}

private fun List<AdminDelivery>.deliveredWithBoy(): List<AdminDelivery> =
    filter { it.deliveryBoyId != null && it.status == AdminDeliveryStatus.DELIVERED }

private fun monthEnd(date: String): String {
    val year = date.substring(0, 4).toInt()
    val month = date.substring(5, 7).toInt()
    val calendar = Calendar.getInstance().apply {
        clear()
        set(Calendar.YEAR, year)
        set(Calendar.MONTH, month - 1)
        set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
    }
    return "%04d-%02d-%02d".format(
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH) + 1,
        calendar.get(Calendar.DAY_OF_MONTH)
    )
}
