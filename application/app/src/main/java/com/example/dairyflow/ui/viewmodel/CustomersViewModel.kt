package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerHold
import com.example.dairyflow.data.model.DeliveryStatus
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.BillingRepository
import com.example.dairyflow.data.repository.CustomerRepository
import com.example.dairyflow.data.repository.DeliveryRepository
import com.example.dairyflow.data.repository.ProductRepository
import com.example.dairyflow.data.repository.RouteRepository
import java.util.Calendar
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CustomersViewModel(
    private val repository: CustomerRepository,
    private val routeRepository: RouteRepository,
    private val productRepository: ProductRepository,
    private val billingRepository: BillingRepository,
    private val deliveryRepository: DeliveryRepository
) : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<Customer>>())
    val state: StateFlow<UiState<List<Customer>>> = _state.asStateFlow()

    private val _routes = MutableStateFlow(UiState<List<RouteRow>>())
    val routes: StateFlow<UiState<List<RouteRow>>> = _routes.asStateFlow()

    private val _products = MutableStateFlow(UiState<List<ProductRow>>())
    val products: StateFlow<UiState<List<ProductRow>>> = _products.asStateFlow()

    private val _cardStats = MutableStateFlow<Map<String, CustomerCardStats>>(emptyMap())
    val cardStats: StateFlow<Map<String, CustomerCardStats>> = _cardStats.asStateFlow()

    private val _holds = MutableStateFlow(UiState<List<CustomerHold>>())
    val holds: StateFlow<UiState<List<CustomerHold>>> = _holds.asStateFlow()

    private val _saveState = MutableStateFlow(SaveState())
    val saveState: StateFlow<SaveState> = _saveState.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        loadRoutes()
        loadProducts()
        _state.value = runCatching { repository.getCustomers() }.fold(
            onSuccess = {
                loadHolds()
                loadCardStats(it)
                UiState(data = it)
            },
            onFailure = { UiState(data = _state.value.data, error = it.message ?: "Unable to load customers.") }
        )
    }

    fun loadRoutes() = viewModelScope.launch {
        _routes.value = UiState(isLoading = true, data = _routes.value.data)
        _routes.value = runCatching { routeRepository.getRouteRows() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _routes.value.data, error = it.message ?: "Unable to load routes.") }
        )
    }

    fun loadProducts() = viewModelScope.launch {
        _products.value = UiState(isLoading = true, data = _products.value.data)
        _products.value = runCatching { productRepository.getProducts() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _products.value.data, error = it.message ?: "Unable to load products.") }
        )
    }

    fun save(customer: Customer, onSaved: (() -> Unit)? = null) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        _state.value = UiState(isLoading = true, data = _state.value.data)
        val isNewCustomer = customer.id == null
        runCatching {
            if (isNewCustomer) repository.addCustomer(customer) else repository.updateCustomer(customer)
        }.fold(
            onSuccess = {
                if (isNewCustomer) {
                    runCatching { deliveryRepository.ensureDailyDeliveries(todayIsoDate()) }
                        .onFailure { Log.w("CustomerSaveError", "Customer saved but today's delivery could not be generated.", it) }
                }
                _saveState.value = SaveState(message = "Customer saved.")
                load()
                onSaved?.invoke()
            },
            onFailure = {
                Log.e("CustomerSaveError", "Failed to save customer.", it)
                val message = it.userFacingSaveError("Unable to save customer. Please try again.")
                _saveState.value = SaveState(error = message)
                _state.value = UiState(
                    data = _state.value.data,
                    error = message
                )
            }
        )
    }

    fun delete(id: String) = viewModelScope.launch {
        runCatching { repository.deleteCustomer(id) }
        load()
    }

    fun holdCustomer(customerId: String, startDate: String, endDate: String, reason: String?) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        runCatching { repository.addCustomerHold(customerId, startDate, endDate, reason) }.fold(
            onSuccess = {
                _saveState.value = SaveState(message = "Customer hold saved.")
                load()
            },
            onFailure = {
                Log.e("CustomerSaveError", "Failed to hold customer.", it)
                _saveState.value = SaveState(error = it.userFacingSaveError("Unable to save hold. Please try again."))
            }
        )
    }

    fun removeHold(holdId: String) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        runCatching { repository.removeCustomerHold(holdId) }.fold(
            onSuccess = {
                _saveState.value = SaveState(message = "Customer hold removed.")
                load()
            },
            onFailure = {
                Log.e("CustomerSaveError", "Failed to remove customer hold.", it)
                _saveState.value = SaveState(error = it.userFacingSaveError("Unable to remove hold. Please try again."))
            }
        )
    }

    fun addCustomer(
        fullName: String,
        phone: String,
        email: String?,
        address: String?,
        area: String?,
        productId: String?,
        productName: String?,
        productCategory: String,
        dailyQuantity: Double,
        milkType: String,
        pricePerLiter: Double,
        deliveryTime: String,
        status: String,
        openingBalance: Double,
        advancePayment: Double,
        notes: String?,
        onSaved: () -> Unit
    ) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        runCatching {
            repository.addCustomer(
                repository.customerPayload(
                    fullName = fullName,
                    phone = phone,
                    email = email,
                    address = address,
                    area = area,
                    productId = productId,
                    productName = productName,
                    productCategory = productCategory,
                    dailyQuantity = dailyQuantity,
                    milkType = milkType,
                    pricePerLiter = pricePerLiter,
                    deliveryTime = deliveryTime,
                    status = status,
                    openingBalance = openingBalance,
                    advancePayment = advancePayment,
                    notes = notes
                )
            )
        }.fold(
            onSuccess = {
                runCatching { deliveryRepository.ensureDailyDeliveries(todayIsoDate()) }
                    .onFailure { Log.w("CustomerSaveError", "Customer saved but today's delivery could not be generated.", it) }
                _saveState.value = SaveState(message = "Customer saved.")
                load()
                onSaved()
            },
            onFailure = {
                Log.e("CustomerSaveError", "Failed to save customer.", it)
                _saveState.value = SaveState(
                    error = it.userFacingSaveError("Unable to save customer. Please try again.")
                )
            }
        )
    }

    private suspend fun loadCardStats(customers: List<Customer>) {
        val calendar = Calendar.getInstance(Locale.US)
        val month = calendar.get(Calendar.MONTH) + 1
        val year = calendar.get(Calendar.YEAR)
        val invoices = runCatching { billingRepository.getInvoices() }.getOrDefault(emptyList())
        val stats = customers.mapNotNull { customer ->
            val id = customer.id ?: return@mapNotNull null
            val deliveredDays = runCatching {
                deliveryRepository.getCustomerDeliveriesForMonth(id, month, year)
                    .filter { it.status == DeliveryStatus.DELIVERED }
                    .map { it.deliveryDate }
                    .distinct()
                    .size
            }.getOrDefault(0)
            id to CustomerCardStats(
                deliveredDays = deliveredDays,
                pendingAmount = invoices.filter { it.customerId == id }.sumOf { it.balanceAmount }
            )
        }.toMap()
        _cardStats.value = stats
    }

    private suspend fun loadHolds() {
        _holds.value = runCatching { repository.getActiveHolds() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _holds.value.data, error = it.message ?: "Unable to load customer holds.") }
        )
    }
}

data class CustomerCardStats(
    val deliveredDays: Int = 0,
    val pendingAmount: Double = 0.0
)
