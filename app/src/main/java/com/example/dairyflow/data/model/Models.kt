package com.example.dairyflow.data.model

data class Profile(
    val id: String,
    val adminId: String? = null,
    val deliveryBoyId: String? = null,
    val adminAccessCode: String? = null,
    val fullName: String? = null,
    val email: String? = null,
    val authEmail: String? = null,
    val phone: String? = null,
    val normalizedPhone: String? = null,
    val role: String = "customer",
    val status: String = "active",
    val loginEnabled: Boolean = true,
    val qrLoginEnabled: Boolean = true,
    val seededByDeveloper: Boolean = false,
    val lastLoginMethod: String? = null,
    val lastLoginAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class Customer(
    val id: String? = null,
    val adminId: String? = null,
    val profileId: String? = null,
    val routeId: String? = null,
    val productId: String? = null,
    val productName: String? = null,
    val productCategory: String = "Cow",
    val fullName: String? = null,
    val name: String = fullName.orEmpty(),
    val mobileNumber: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val area: String? = null,
    val rate: Double = 0.0,
    val milkRate: Double = rate,
    val dailyQuantity: Double = 0.0,
    val morningQuantity: Double = 0.0,
    val eveningQuantity: Double = 0.0,
    val milkType: String = "Cow",
    val deliveryTime: String = "Morning",
    val openingBalance: Double = 0.0,
    val advancePayment: Double = 0.0,
    val notes: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null
)

data class CustomerHold(
    val id: String? = null,
    val customerId: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val reason: String? = null,
    val status: String = "active",
    val createdAt: String? = null
) {
    fun includes(date: String): Boolean =
        status.equals("active", ignoreCase = true) && date >= startDate && date <= endDate
}

data class MilkProduct(
    val id: String? = null,
    val name: String,
    val defaultRate: Double = 0.0,
    val unit: String = "liter",
    val isActive: Boolean = true
)

data class DeliveryRecord(
    val id: String? = null,
    val customerId: String,
    val productId: String? = null,
    val deliveryBoyId: String? = null,
    val routeId: String? = null,
    val deliveryDate: String,
    val shift: DeliveryShift = DeliveryShift.MORNING,
    val quantity: Double = 0.0,
    val unitPrice: Double = 0.0,
    val totalAmount: Double = quantity * unitPrice,
    val status: DeliveryStatus = DeliveryStatus.DELIVERED,
    val skipReason: String? = null,
    val notes: String? = null,
    val createdAt: String? = null
) {
    val extraQuantity: Double = 0.0
}

data class BillingRecord(
    val id: String? = null,
    val invoiceNumber: String = "",
    val customerId: String,
    val month: Int = 1,
    val year: Int = 1970,
    val totalQuantity: Double = 0.0,
    val rate: Double = 0.0,
    val totalAmount: Double = 0.0,
    val paidAmount: Double = 0.0,
    val dueAmount: Double = 0.0,
    val billStatus: BillStatus = BillStatus.UNPAID,
    val generatedAt: String? = null
)

data class Payment(
    val id: String? = null,
    val adminId: String? = null,
    val customerId: String = "",
    val invoiceId: String? = null,
    val deliveryId: String? = null,
    val collectedBy: String? = null,
    val amount: Double = 0.0,
    val paymentDate: String = "",
    val paymentType: String = "regular",
    val paymentMethod: String = "Cash",
    val transactionId: String? = null,
    val notes: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val billingRecordId: String get() = invoiceId.orEmpty()
    val method: PaymentMethod get() = PaymentMethod.fromText(paymentMethod)
    val paidAt: String get() = paymentDate
    val isAdvancePayment: Boolean get() = paymentType.equals("advance", ignoreCase = true)
}

data class DeliveryBoy(
    val id: String? = null,
    val adminId: String? = null,
    val profileId: String? = null,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val routeId: String? = null,
    val isActive: Boolean = true
)

data class Route(
    val id: String? = null,
    val adminId: String? = null,
    val name: String,
    val area: String? = null,
    val description: String? = null,
    val isActive: Boolean = true
)

data class Expense(
    val id: String? = null,
    val title: String,
    val amount: Double,
    val category: String? = null,
    val expenseDate: String,
    val notes: String? = null
)

data class AppNotification(
    val id: String? = null,
    val title: String,
    val message: String,
    val type: String = "info",
    val isRead: Boolean = false,
    val createdAt: String? = null
)

enum class DeliveryShift {
    MORNING,
    EVENING
}

enum class DeliveryStatus {
    PENDING,
    DELIVERED,
    SKIPPED,
    CANCELLED
}

enum class BillStatus {
    PAID,
    UNPAID,
    PARTIAL
}

enum class PaymentMethod {
    CASH,
    UPI,
    ONLINE;

    companion object {
        fun fromText(value: String): PaymentMethod =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: CASH
    }
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
