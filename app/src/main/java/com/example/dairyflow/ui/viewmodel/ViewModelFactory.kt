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
            QrLoginViewModel::class.java -> QrLoginViewModel(container.qrLoginRepository)
            AdminViewModel::class.java -> AdminViewModel(container.adminRepository)
            DeliveryBoyAdminActionViewModel::class.java -> DeliveryBoyAdminActionViewModel(container.adminRepository)
            DashboardViewModel::class.java -> DashboardViewModel(container.dashboardRepository)
            CustomersViewModel::class.java -> CustomersViewModel(
                container.customerRepository,
                container.routeRepository,
                container.productRepository,
                container.billingRepository,
                container.deliveryRepository
            )
            CustomerInsightsViewModel::class.java -> CustomerInsightsViewModel(
                container.customerRepository,
                container.deliveryRepository,
                container.invoiceRepository,
                container.paymentRepository
            )
            ProductViewModel::class.java -> ProductViewModel(container.productRepository)
            DeliveryViewModel::class.java -> DeliveryViewModel(container.deliveryRepository, container.customerRepository, container.routeRepository)
            DeliveryBoyViewModel::class.java -> DeliveryBoyViewModel(container.deliveryBoyRepository)
            DeliveryBoyPaymentsViewModel::class.java -> DeliveryBoyPaymentsViewModel(container.deliveryBoyRepository)
            QrLoginViewModel::class.java -> QrLoginViewModel(container.qrLoginRepository)
            BillingViewModel::class.java -> BillingViewModel(container.billingRepository, container.customerRepository)
            PaymentsViewModel::class.java -> PaymentsViewModel(
                container.paymentRepository,
                container.billingRepository,
                container.invoiceRepository
            )
            ReportsViewModel::class.java -> ReportsViewModel(container.reportsRepository)
            else -> error("Unknown ViewModel class: ${modelClass.name}")
        } as T
    }
}
