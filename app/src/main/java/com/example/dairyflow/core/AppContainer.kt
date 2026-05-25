package com.example.dairyflow.core

import com.example.dairyflow.data.repository.AuthRepository
import com.example.dairyflow.data.repository.AdminRepository
import com.example.dairyflow.data.repository.BillingRepository
import com.example.dairyflow.data.repository.CustomerRepository
import com.example.dairyflow.data.repository.DashboardRepository
import com.example.dairyflow.data.repository.DeliveryRepository
import com.example.dairyflow.data.repository.PaymentRepository
import com.example.dairyflow.data.repository.RazorpayGateway
import com.example.dairyflow.data.repository.ReportsRepository

class AppContainer {
    private val supabase = SupabaseModule.client

    val authRepository = AuthRepository(supabase)
    val adminRepository = AdminRepository(supabase)
    val customerRepository = CustomerRepository(supabase)
    val deliveryRepository = DeliveryRepository(supabase)
    val billingRepository = BillingRepository(supabase, customerRepository, deliveryRepository)
    val paymentRepository = PaymentRepository(supabase, billingRepository, RazorpayGateway())
    val dashboardRepository = DashboardRepository(adminRepository)
    val reportsRepository = ReportsRepository(deliveryRepository, billingRepository, paymentRepository)
}
