package com.example.dairyflow.core

import android.content.Context
import com.example.dairyflow.data.repository.AppSettingsRepository
import com.example.dairyflow.data.repository.AuthRepository
import com.example.dairyflow.data.repository.AdminRepository
import com.example.dairyflow.data.repository.BillingRepository
import com.example.dairyflow.data.repository.CustomerRepository
import com.example.dairyflow.data.repository.DashboardRepository
import com.example.dairyflow.data.repository.DeliveryBoyRepository
import com.example.dairyflow.data.repository.DeliveryRepository
import com.example.dairyflow.data.repository.InvoiceRepository
import com.example.dairyflow.data.repository.PaymentRepository
import com.example.dairyflow.data.repository.ProductRepository
import com.example.dairyflow.data.repository.ProfileRepository
import com.example.dairyflow.data.repository.QrLoginRepository
import com.example.dairyflow.data.repository.RazorpayGateway
import com.example.dairyflow.data.repository.ReportsRepository
import com.example.dairyflow.data.repository.RouteRepository
import com.example.dairyflow.data.repository.OtpRepository

class AppContainer(context: Context) {
    private val appContext = context.applicationContext
    private val supabase = SupabaseModule.client(appContext)
    private val secureSessionStore = SupabaseModule.sessionStore(appContext)

    val otpRepository = OtpRepository(appContext)
    val qrLoginRepository = QrLoginRepository(supabase)
    val authRepository = AuthRepository(supabase, otpRepository, qrLoginRepository, secureSessionStore)
    val profileRepository = ProfileRepository(supabase, secureSessionStore)
    val adminRepository = AdminRepository(supabase)
    val customerRepository = CustomerRepository(supabase)
    val productRepository = ProductRepository(supabase)
    val deliveryRepository = DeliveryRepository(supabase)
    val routeRepository = RouteRepository(supabase)
    val deliveryBoyRepository = DeliveryBoyRepository(supabase)
    val invoiceRepository = InvoiceRepository(supabase)
    val billingRepository = BillingRepository(supabase, customerRepository, deliveryRepository)
    val paymentRepository = PaymentRepository(supabase, billingRepository, RazorpayGateway())
    val dashboardRepository = DashboardRepository(supabase)
    val reportsRepository = ReportsRepository(deliveryRepository, billingRepository, paymentRepository)
    val appSettingsRepository = AppSettingsRepository(appContext)
}
