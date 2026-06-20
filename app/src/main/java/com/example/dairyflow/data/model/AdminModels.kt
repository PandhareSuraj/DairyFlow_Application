package com.example.dairyflow.data.model

data class Product(
    val id: String? = null,
    val productName: String = "",
    val category: String = "",
    val productType: ProductType = ProductType.MILK,
    val unit: ProductUnit = ProductUnit.LITER,
    val pricePerUnit: Double = 0.0,
    val stockQuantity: Double = 0.0,
    val isActive: Boolean = true,
    val createdAt: String? = null
)

data class AdminCustomer(
    val id: String? = null,
    val profileId: String? = null,
    val fullName: String = "",
    val mobileNumber: String? = null,
    val address: String? = null,
    val area: String? = null,
    val routeId: String? = null,
    val defaultProductId: String? = null,
    val productCategory: String? = null,
    val milkType: String = "Cow",
    val dailyQuantity: Double = 0.0,
    val morningQuantity: Double = 0.0,
    val eveningQuantity: Double = 0.0,
    val rate: Double = 0.0,
    val isActive: Boolean = true,
    val openingPendingBalance: Double = 0.0,
    val createdAt: String? = null
)

data class AdminCustomerHold(
    val id: String? = null,
    val customerId: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val reason: String? = null,
    val status: String = "active",
    val createdAt: String? = null
)

data class AdminDeliveryBoy(
    val id: String? = null,
    val profileId: String? = null,
    val name: String = "",
    val mobileNumber: String? = null,
    val email: String? = null,
    val assignedRouteId: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null
)

data class AdminRoute(
    val id: String? = null,
    val routeName: String = "",
    val area: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null
)

data class AdminDelivery(
    val id: String? = null,
    val customerId: String = "",
    val productId: String = "",
    val deliveryBoyId: String? = null,
    val routeId: String? = null,
    val deliveryDate: String = "",
    val deliveryShift: AdminDeliveryShift = AdminDeliveryShift.MORNING,
    val quantity: Double = 0.0,
    val unitPrice: Double = 0.0,
    val totalAmount: Double = quantity * unitPrice,
    val status: AdminDeliveryStatus = AdminDeliveryStatus.PENDING,
    val skipReason: String? = null,
    val notes: String? = null,
    val deliveryCompletedAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class Invoice(
    val id: String? = null,
    val invoiceNumber: String = "",
    val customerId: String = "",
    val billingMonth: Int,
    val billingYear: Int,
    val monthlyDeliveryAmount: Double = 0.0,
    val previousPendingAmount: Double = 0.0,
    val totalBillAmount: Double = 0.0,
    val paidAmount: Double = 0.0,
    val pendingAmount: Double = 0.0,
    val invoiceStatus: InvoiceStatus = InvoiceStatus.UNPAID,
    val generatedDate: String? = null,
    val dueDate: String? = null,
    val notes: String? = null
)

data class AdminPayment(
    val id: String? = null,
    val invoiceId: String = "",
    val customerId: String = "",
    val collectedBy: String? = null,
    val amount: Double,
    val paymentType: String = "regular",
    val paymentMethod: AdminPaymentMethod,
    val transactionId: String? = null,
    val paymentDate: String = "",
    val notes: String? = null,
    val createdAt: String? = null
) {
    val isAdvancePayment: Boolean get() = paymentType.equals("advance", ignoreCase = true)
}

data class AdminProfile(
    val id: String,
    val adminId: String? = null,
    val adminAccessCode: String? = null,
    val fullName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: AdminRole = AdminRole.CUSTOMER,
    val isActive: Boolean = true,
    val permissions: List<String> = emptyList(),
    val customerId: String? = null,
    val deliveryBoyId: String? = null,
    val createdAt: String? = null
)

enum class ProductType {
    MILK,
    CURD,
    PANEER,
    GHEE,
    BUTTER,
    OTHER
}

enum class ProductUnit {
    LITER,
    KG,
    PACKET
}

enum class AdminDeliveryShift {
    MORNING,
    EVENING
}

enum class AdminDeliveryStatus {
    PENDING,
    DELIVERED,
    SKIPPED,
    CANCELLED
}

enum class InvoiceStatus {
    UNPAID,
    PARTIAL,
    PAID
}

enum class AdminPaymentMethod {
    CASH,
    UPI,
    ONLINE,
    BANK_TRANSFER
}

enum class AdminRole {
    ADMIN,
    DELIVERY_BOY,
    CUSTOMER
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
    val profiles: List<AdminProfile> = emptyList(),
    val customerHolds: List<AdminCustomerHold> = emptyList()
)

data class DeliveryBoyPerformance(
    val deliveryBoy: AdminDeliveryBoy? = null,
    val routes: List<AdminRoute> = emptyList(),
    val selectedMonth: String = "",
    val selectedRouteId: String? = null,
    val summary: DeliveryBoyPerformanceSummary = DeliveryBoyPerformanceSummary(),
    val chartRows: List<DeliveryBoyDailyMilkRow> = emptyList(),
    val calendarDays: List<DeliveryBoyCalendarDay> = emptyList()
)

data class DeliveryBoyPerformanceSummary(
    val totalDeliveries: Int = 0,
    val deliveredDeliveries: Int = 0,
    val skippedDeliveries: Int = 0,
    val pendingDeliveries: Int = 0,
    val cowMilkLiters: Double = 0.0,
    val buffaloMilkLiters: Double = 0.0
) {
    val totalLiters: Double get() = cowMilkLiters + buffaloMilkLiters
}

data class DeliveryBoyDailyMilkRow(
    val date: String,
    val cowMilkLiters: Double = 0.0,
    val buffaloMilkLiters: Double = 0.0
) {
    val totalLiters: Double get() = cowMilkLiters + buffaloMilkLiters
}

data class DeliveryBoyCalendarDay(
    val date: String,
    val dayOfMonth: Int,
    val hasDelivery: Boolean = false,
    val isCompleted: Boolean = false,
    val skippedCount: Int = 0,
    val deliveredCount: Int = 0,
    val pendingCount: Int = 0,
    val isFuture: Boolean = false
)

data class DeliveryBoyDailyPerformanceDetails(
    val deliveryBoy: AdminDeliveryBoy? = null,
    val date: String = "",
    val stock: DeliveryBoyDailyStock = DeliveryBoyDailyStock(),
    val delivered: DeliveryBoyMilkBreakdown = DeliveryBoyMilkBreakdown(),
    val hasTakenMilk: Boolean = false
) {
    val remainingCowLiters: Double get() = stock.cowMilkTakenLiters - delivered.cowMilkLiters
    val remainingBuffaloLiters: Double get() = stock.buffaloMilkTakenLiters - delivered.buffaloMilkLiters
    val totalRemainingLiters: Double get() = stock.totalTakenLiters - delivered.totalLiters
}

data class DeliveryBoyDailyStock(
    val date: String = "",
    val cowMilkTakenLiters: Double = 0.0,
    val buffaloMilkTakenLiters: Double = 0.0,
    val notes: String? = null
) {
    val totalTakenLiters: Double get() = cowMilkTakenLiters + buffaloMilkTakenLiters
}

data class DeliveryBoyMilkBreakdown(
    val cowMilkLiters: Double = 0.0,
    val buffaloMilkLiters: Double = 0.0
) {
    val totalLiters: Double get() = cowMilkLiters + buffaloMilkLiters
}

data class DeliveryBoyPaymentCollection(
    val deliveryBoy: AdminDeliveryBoy? = null,
    val filter: PaymentCollectionFilter = PaymentCollectionFilter.THIS_MONTH,
    val startDate: String = "",
    val endDate: String = "",
    val summary: DeliveryBoyPaymentSummary = DeliveryBoyPaymentSummary(),
    val entries: List<DeliveryBoyPaymentEntry> = emptyList()
)

data class DeliveryBoyPaymentSummary(
    val totalCollectedAmount: Double = 0.0,
    val cashCollected: Double = 0.0,
    val upiCollected: Double = 0.0,
    val bankTransferCollected: Double = 0.0,
    val entryCount: Int = 0
)

data class DeliveryBoyPaymentEntry(
    val customerName: String,
    val invoiceNumber: String?,
    val amount: Double,
    val paymentMode: AdminPaymentMethod,
    val collectedAt: String,
    val collectedByName: String
)

enum class PaymentCollectionFilter {
    TODAY,
    THIS_MONTH,
    CUSTOM
}

data class InvoiceGenerationResult(
    val created: Int,
    val skippedDuplicates: Int,
    val failed: Int,
    val messages: List<String>
)
