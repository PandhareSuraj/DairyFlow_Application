package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.dairyflow.core.AppContainer

class DairyFlowViewModelFactory(
    private val container: AppContainer
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when (modelClass) {
            AuthViewModel::class.java -> AuthViewModel(container.authRepository)
            AdminViewModel::class.java -> AdminViewModel(container.adminRepository)
            DashboardViewModel::class.java -> DashboardViewModel(container.dashboardRepository)
            CustomersViewModel::class.java -> CustomersViewModel(container.customerRepository)
            DeliveryViewModel::class.java -> DeliveryViewModel(container.deliveryRepository, container.customerRepository)
            BillingViewModel::class.java -> BillingViewModel(container.billingRepository, container.customerRepository)
            PaymentsViewModel::class.java -> PaymentsViewModel(container.paymentRepository, container.billingRepository)
            ReportsViewModel::class.java -> ReportsViewModel(container.reportsRepository)
            else -> error("Unknown ViewModel class: ${modelClass.name}")
        } as T
    }
}
