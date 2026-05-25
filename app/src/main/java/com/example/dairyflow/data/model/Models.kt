package com.example.dairyflow.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: String = "customer",
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Customer(
    val id: String? = null,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    val name: String = fullName.orEmpty(),
    @SerialName("mobile_number") val mobileNumber: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val rate: Double = 0.0,
    @SerialName("milk_rate") val milkRate: Double = rate,
    @SerialName("daily_quantity") val dailyQuantity: Double = 0.0,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class MilkProduct(
    val id: String? = null,
    val name: String,
    @SerialName("default_rate") val defaultRate: Double = 0.0,
    val unit: String = "liter",
    @SerialName("is_active") val isActive: Boolean = true
)

@Serializable
data class DeliveryRecord(
    val id: String? = null,
    @SerialName("customer_id") val customerId: String,
    @SerialName("product_id") val productId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("delivery_date") val deliveryDate: String,
    @SerialName("delivery_shift") val shift: DeliveryShift = DeliveryShift.MORNING,
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = quantity * unitPrice,
    val status: DeliveryStatus = DeliveryStatus.DELIVERED,
    @SerialName("skip_reason") val skipReason: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null
) {
    val extraQuantity: Double = 0.0
}

@Serializable
data class BillingRecord(
    val id: String? = null,
    @SerialName("invoice_number") val invoiceNumber: String = "",
    @SerialName("customer_id") val customerId: String,
    @SerialName("billing_month") val month: Int = 1,
    @SerialName("billing_year") val year: Int = 1970,
    @SerialName("total_quantity") val totalQuantity: Double = 0.0,
    val rate: Double = 0.0,
    @SerialName("total_bill_amount") val totalAmount: Double = 0.0,
    @SerialName("paid_amount") val paidAmount: Double = 0.0,
    @SerialName("pending_amount") val dueAmount: Double = 0.0,
    @SerialName("invoice_status") val billStatus: BillStatus = BillStatus.UNPAID,
    @SerialName("generated_date") val generatedAt: String? = null
)

@Serializable
data class Payment(
    val id: String? = null,
    @SerialName("customer_id") val customerId: String = "",
    @SerialName("invoice_id") val billingRecordId: String = "",
    val amount: Double = 0.0,
    @SerialName("payment_method") val method: PaymentMethod = PaymentMethod.CASH,
    @SerialName("transaction_id") val transactionId: String? = null,
    val notes: String? = null,
    @SerialName("payment_date") val paidAt: String? = null
)

@Serializable
data class DeliveryBoy(
    val id: String? = null,
    val name: String,
    val phone: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("is_active") val isActive: Boolean = true
)

@Serializable
data class Route(
    val id: String? = null,
    val name: String,
    val description: String? = null,
    @SerialName("is_active") val isActive: Boolean = true
)

@Serializable
data class Expense(
    val id: String? = null,
    val title: String,
    val amount: Double,
    val category: String? = null,
    @SerialName("expense_date") val expenseDate: String,
    val notes: String? = null
)

@Serializable
data class AppNotification(
    val id: String? = null,
    val title: String,
    val message: String,
    val type: String = "info",
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
enum class DeliveryShift {
    @SerialName("morning") MORNING,
    @SerialName("evening") EVENING
}

@Serializable
enum class DeliveryStatus {
    @SerialName("pending") PENDING,
    @SerialName("delivered") DELIVERED,
    @SerialName("skipped") SKIPPED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
enum class BillStatus {
    @SerialName("paid") PAID,
    @SerialName("unpaid") UNPAID,
    @SerialName("partial") PARTIAL
}

@Serializable
enum class PaymentMethod {
    @SerialName("cash") CASH,
    @SerialName("upi") UPI,
    @SerialName("online") ONLINE
}

data class DashboardStats(
    val totalCustomers: Int = 0,
    val totalProducts: Int = 0,
    val totalDeliveryBoys: Int = 0,
    val todayDelivery: Double = 0.0,
    val deliveredToday: Int = 0,
    val pendingToday: Int = 0,
    val skippedToday: Int = 0,
    val pendingBills: Int = 0,
    val totalCollection: Double = 0.0,
    val monthlyRevenue: Double = 0.0,
    val previousPending: Double = 0.0
)

data class UiState<out T>(
    val isLoading: Boolean = false,
    val data: T? = null,
    val error: String? = null
)

data class MonthlyBillDraft(
    val customer: Customer,
    val month: Int,
    val year: Int,
    val totalQuantity: Double,
    val rate: Double,
    val paidAmount: Double = 0.0
) {
    val totalAmount: Double = totalQuantity * rate
    val dueAmount: Double = (totalAmount - paidAmount).coerceAtLeast(0.0)
    val status: BillStatus = when {
        dueAmount == 0.0 -> BillStatus.PAID
        paidAmount == 0.0 -> BillStatus.UNPAID
        else -> BillStatus.PARTIAL
    }
}
