package com.example.dairyflow.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: String? = null,
    @SerialName("product_name") val productName: String = "",
    @SerialName("product_type") val productType: ProductType = ProductType.MILK,
    val unit: ProductUnit = ProductUnit.LITER,
    @SerialName("price_per_unit") val pricePerUnit: Double = 0.0,
    @SerialName("stock_quantity") val stockQuantity: Double = 0.0,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class AdminCustomer(
    val id: String? = null,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("full_name") val fullName: String = "",
    @SerialName("mobile_number") val mobileNumber: String? = null,
    val address: String? = null,
    val area: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("default_product_id") val defaultProductId: String? = null,
    @SerialName("daily_quantity") val dailyQuantity: Double = 0.0,
    @SerialName("morning_quantity") val morningQuantity: Double = 0.0,
    @SerialName("evening_quantity") val eveningQuantity: Double = 0.0,
    val rate: Double = 0.0,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("opening_pending_balance") val openingPendingBalance: Double = 0.0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class AdminDeliveryBoy(
    val id: String? = null,
    @SerialName("profile_id") val profileId: String? = null,
    val name: String = "",
    @SerialName("mobile_number") val mobileNumber: String? = null,
    val email: String? = null,
    @SerialName("assigned_route_id") val assignedRouteId: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class AdminRoute(
    val id: String? = null,
    @SerialName("route_name") val routeName: String = "",
    val area: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class AdminDelivery(
    val id: String? = null,
    @SerialName("customer_id") val customerId: String = "",
    @SerialName("product_id") val productId: String = "",
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("delivery_date") val deliveryDate: String = "",
    @SerialName("delivery_shift") val deliveryShift: AdminDeliveryShift = AdminDeliveryShift.MORNING,
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = quantity * unitPrice,
    val status: AdminDeliveryStatus = AdminDeliveryStatus.PENDING,
    @SerialName("skip_reason") val skipReason: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class Invoice(
    val id: String? = null,
    @SerialName("invoice_number") val invoiceNumber: String = "",
    @SerialName("customer_id") val customerId: String = "",
    @SerialName("billing_month") val billingMonth: Int,
    @SerialName("billing_year") val billingYear: Int,
    @SerialName("monthly_delivery_amount") val monthlyDeliveryAmount: Double = 0.0,
    @SerialName("previous_pending_amount") val previousPendingAmount: Double = 0.0,
    @SerialName("total_bill_amount") val totalBillAmount: Double = 0.0,
    @SerialName("paid_amount") val paidAmount: Double = 0.0,
    @SerialName("pending_amount") val pendingAmount: Double = 0.0,
    @SerialName("invoice_status") val invoiceStatus: InvoiceStatus = InvoiceStatus.UNPAID,
    @SerialName("generated_date") val generatedDate: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val notes: String? = null
)

@Serializable
data class AdminPayment(
    val id: String? = null,
    @SerialName("invoice_id") val invoiceId: String = "",
    @SerialName("customer_id") val customerId: String = "",
    val amount: Double,
    @SerialName("payment_method") val paymentMethod: AdminPaymentMethod,
    @SerialName("transaction_id") val transactionId: String? = null,
    @SerialName("payment_date") val paymentDate: String = "",
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class AdminProfile(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: AdminRole = AdminRole.CUSTOMER,
    @SerialName("is_active") val isActive: Boolean = true,
    val permissions: List<String> = emptyList(),
    @SerialName("customer_id") val customerId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
enum class ProductType {
    @SerialName("milk") MILK,
    @SerialName("curd") CURD,
    @SerialName("paneer") PANEER,
    @SerialName("ghee") GHEE,
    @SerialName("butter") BUTTER,
    @SerialName("other") OTHER
}

@Serializable
enum class ProductUnit {
    @SerialName("liter") LITER,
    @SerialName("kg") KG,
    @SerialName("packet") PACKET
}

@Serializable
enum class AdminDeliveryShift {
    @SerialName("morning") MORNING,
    @SerialName("evening") EVENING
}

@Serializable
enum class AdminDeliveryStatus {
    @SerialName("pending") PENDING,
    @SerialName("delivered") DELIVERED,
    @SerialName("skipped") SKIPPED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
enum class InvoiceStatus {
    @SerialName("unpaid") UNPAID,
    @SerialName("partial") PARTIAL,
    @SerialName("paid") PAID
}

@Serializable
enum class AdminPaymentMethod {
    @SerialName("cash") CASH,
    @SerialName("upi") UPI,
    @SerialName("online") ONLINE,
    @SerialName("bank_transfer") BANK_TRANSFER
}

@Serializable
enum class AdminRole {
    @SerialName("admin") ADMIN,
    @SerialName("delivery_boy") DELIVERY_BOY,
    @SerialName("customer") CUSTOMER
}

data class AdminDashboardStats(
    val totalProducts: Int = 0,
    val totalCustomers: Int = 0,
    val totalDeliveryBoys: Int = 0,
    val todayDeliveries: Int = 0,
    val pendingBills: Int = 0,
    val monthlyRevenue: Double = 0.0,
    val previousPendingAmount: Double = 0.0,
    val totalCollectedAmount: Double = 0.0,
    val totalUnpaidCustomers: Int = 0
)

data class AdminDataBundle(
    val products: List<Product> = emptyList(),
    val customers: List<AdminCustomer> = emptyList(),
    val deliveryBoys: List<AdminDeliveryBoy> = emptyList(),
    val routes: List<AdminRoute> = emptyList(),
    val deliveries: List<AdminDelivery> = emptyList(),
    val invoices: List<Invoice> = emptyList(),
    val payments: List<AdminPayment> = emptyList(),
    val profiles: List<AdminProfile> = emptyList()
)

data class InvoiceGenerationResult(
    val created: Int,
    val skippedDuplicates: Int,
    val failed: Int,
    val messages: List<String>
)
