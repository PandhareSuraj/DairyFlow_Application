package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.AdminCustomer
import com.example.dairyflow.data.model.AdminDashboardStats
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
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

class AdminViewModel(private val repository: AdminRepository) : ViewModel() {
    private val _dataState = MutableStateFlow(UiState<AdminDataBundle>())
    val dataState: StateFlow<UiState<AdminDataBundle>> = _dataState.asStateFlow()

    private val _dashboardState = MutableStateFlow(UiState<AdminDashboardStats>())
    val dashboardState: StateFlow<UiState<AdminDashboardStats>> = _dashboardState.asStateFlow()

    private val _generationState = MutableStateFlow(UiState<InvoiceGenerationResult>())
    val generationState: StateFlow<UiState<InvoiceGenerationResult>> = _generationState.asStateFlow()

    fun load(date: String = todayIsoDate()) = viewModelScope.launch {
        _dataState.value = UiState(isLoading = true, data = _dataState.value.data)
        _dashboardState.value = UiState(isLoading = true, data = _dashboardState.value.data)
        runCatching {
            repository.loadAdminData(date)
        }.onSuccess {
            _dataState.value = UiState(data = it)
        }.onFailure {
            _dataState.value = UiState(data = _dataState.value.data, error = it.message ?: "Unable to load admin data.")
        }
        runCatching {
            repository.dashboardStats(date, currentMonth(), currentYear())
        }.onSuccess {
            _dashboardState.value = UiState(data = it)
        }.onFailure {
            _dashboardState.value = UiState(data = _dashboardState.value.data, error = it.message ?: "Unable to load dashboard.")
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
