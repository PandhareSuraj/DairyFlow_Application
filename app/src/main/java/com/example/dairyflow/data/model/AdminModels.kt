package com.example.dairyflow.data.model

data class Product(
    val id: String? = null,
    val productName: String = "",
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
    val dailyQuantity: Double = 0.0,
    val morningQuantity: Double = 0.0,
    val eveningQuantity: Double = 0.0,
    val rate: Double = 0.0,
    val isActive: Boolean = true,
    val openingPendingBalance: Double = 0.0,
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
    val amount: Double,
    val paymentMethod: AdminPaymentMethod,
    val transactionId: String? = null,
    val paymentDate: String = "",
    val notes: String? = null,
    val createdAt: String? = null
)

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
    val profiles: List<AdminProfile> = emptyList()
)

data class InvoiceGenerationResult(
    val created: Int,
    val skippedDuplicates: Int,
    val failed: Int,
    val messages: List<String>
)
