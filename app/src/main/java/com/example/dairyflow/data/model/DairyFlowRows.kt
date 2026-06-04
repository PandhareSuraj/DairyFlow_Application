package com.example.dairyflow.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RouteRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("route_name") val routeName: String = "",
    val area: String? = null,
    val description: String? = null,
    val status: String = "active",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val displayName: String get() = routeName.ifBlank { area ?: "Route" }
}

@Serializable
data class RouteUpsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("route_name") val routeName: String,
    val area: String? = null,
    val description: String? = null,
    val status: String = "active"
)

@Serializable
data class DeliveryBoyRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("full_name") val fullName: String = "",
    val phone: String? = null,
    val email: String? = null,
    @SerialName("assigned_route_id") val routeId: String? = null,
    val status: String = "active",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val displayName: String get() = fullName.ifBlank { email ?: phone ?: "Delivery boy" }
}

@Serializable
data class DeliveryBoyUpsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("full_name") val fullName: String,
    val phone: String? = null,
    val email: String? = null,
    @SerialName("assigned_route_id") val routeId: String? = null,
    val status: String = "active"
)

@Serializable
data class CustomerRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("full_name") val fullName: String = "",
    val phone: String = "",
    val email: String? = null,
    val address: String? = null,
    val area: String? = null,
    @SerialName("daily_quantity") val dailyQuantity: Double = 0.0,
    @SerialName("morning_quantity") val morningQuantity: Double = 0.0,
    @SerialName("evening_quantity") val eveningQuantity: Double = 0.0,
    @SerialName("milk_type") val milkType: String = "Cow",
    @SerialName("price_per_liter") val pricePerLiter: Double = 0.0,
    @SerialName("delivery_time") val deliveryTime: String = "Morning",
    val status: String = "active",
    @SerialName("opening_balance") val openingBalance: Double = 0.0,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val displayName: String get() = fullName.ifBlank { phone }
}

@Serializable
data class CustomerUpsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("full_name") val fullName: String,
    val phone: String,
    val email: String? = null,
    val address: String? = null,
    val area: String? = null,
    @SerialName("daily_quantity") val dailyQuantity: Double,
    @SerialName("morning_quantity") val morningQuantity: Double = 0.0,
    @SerialName("evening_quantity") val eveningQuantity: Double = 0.0,
    @SerialName("milk_type") val milkType: String,
    @SerialName("price_per_liter") val pricePerLiter: Double,
    @SerialName("delivery_time") val deliveryTime: String,
    val status: String,
    @SerialName("opening_balance") val openingBalance: Double = 0.0,
    val notes: String? = null
)

@Serializable
data class ProductRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    val name: String = "",
    val category: String = "Milk",
    val unit: String = "Liter",
    val price: Double = 0.0,
    @SerialName("stock_quantity") val stockQuantity: Double = 0.0,
    val description: String? = null,
    val status: String = "active",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class ProductUpsert(
    @SerialName("admin_id") val adminId: String,
    val name: String,
    val category: String,
    val unit: String,
    val price: Double,
    @SerialName("stock_quantity") val stockQuantity: Double = 0.0,
    val description: String? = null,
    val status: String = "active"
)

@Serializable
data class DeliveryRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("customer_id") val customerId: String = "",
    @SerialName("product_id") val productId: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("delivery_date") val deliveryDate: String = "",
    @SerialName("delivery_time") val deliveryTime: String = "Morning",
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("delivery_status") val deliveryStatus: String = "Pending",
    @SerialName("payment_status") val paymentStatus: String = "Unpaid",
    @SerialName("skip_reason") val skipReason: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class DeliveryUpsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("product_id") val productId: String,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("delivery_date") val deliveryDate: String,
    @SerialName("delivery_time") val deliveryTime: String,
    val quantity: Double,
    @SerialName("unit_price") val unitPrice: Double,
    @SerialName("total_amount") val totalAmount: Double,
    @SerialName("delivery_status") val deliveryStatus: String,
    @SerialName("payment_status") val paymentStatus: String,
    @SerialName("skip_reason") val skipReason: String? = null,
    val notes: String? = null
)

@Serializable
data class DeliveryUpdate(
    @SerialName("delivery_status") val deliveryStatus: String? = null,
    @SerialName("payment_status") val paymentStatus: String? = null,
    @SerialName("skip_reason") val skipReason: String? = null,
    val notes: String? = null
)

@Serializable
data class InvoiceRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("customer_id") val customerId: String = "",
    @SerialName("invoice_number") val invoiceNumber: String = "",
    @SerialName("billing_month") val billingMonth: String = "",
    val subtotal: Double = 0.0,
    @SerialName("previous_balance") val previousBalance: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("paid_amount") val paidAmount: Double = 0.0,
    @SerialName("balance_amount") val balanceAmount: Double = 0.0,
    val status: String = "Unpaid",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class InvoiceUpsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("invoice_number") val invoiceNumber: String,
    @SerialName("billing_month") val billingMonth: String,
    val subtotal: Double,
    @SerialName("previous_balance") val previousBalance: Double,
    @SerialName("total_amount") val totalAmount: Double,
    @SerialName("paid_amount") val paidAmount: Double,
    @SerialName("balance_amount") val balanceAmount: Double,
    val status: String
)

@Serializable
data class InvoiceItem(
    val id: String? = null,
    @SerialName("invoice_id") val invoiceId: String,
    @SerialName("delivery_id") val deliveryId: String? = null,
    @SerialName("product_name") val productName: String? = null,
    @SerialName("delivery_date") val deliveryDate: String? = null,
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class InvoiceItemRow(
    val id: String? = null,
    @SerialName("invoice_id") val invoiceId: String,
    @SerialName("delivery_id") val deliveryId: String? = null,
    @SerialName("product_name") val productName: String? = null,
    @SerialName("delivery_date") val deliveryDate: String? = null,
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class InvoiceItemInsert(
    @SerialName("invoice_id") val invoiceId: String,
    @SerialName("delivery_id") val deliveryId: String? = null,
    @SerialName("product_name") val productName: String? = null,
    @SerialName("delivery_date") val deliveryDate: String? = null,
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0
)

@Serializable
data class PaymentRow(
    val id: String? = null,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("customer_id") val customerId: String = "",
    @SerialName("invoice_id") val invoiceId: String? = null,
    @SerialName("delivery_id") val deliveryId: String? = null,
    @SerialName("collected_by") val collectedBy: String? = null,
    val amount: Double = 0.0,
    @SerialName("payment_date") val paymentDate: String = "",
    @SerialName("payment_method") val paymentMethod: String = "Cash",
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class PaymentInsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("invoice_id") val invoiceId: String? = null,
    @SerialName("delivery_id") val deliveryId: String? = null,
    @SerialName("collected_by") val collectedBy: String? = null,
    val amount: Double,
    @SerialName("payment_date") val paymentDate: String,
    @SerialName("payment_method") val paymentMethod: String,
    val notes: String? = null
)

@Serializable
data class PaymentUpsert(
    @SerialName("admin_id") val adminId: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("delivery_id") val deliveryId: String? = null,
    @SerialName("collected_by") val collectedBy: String? = null,
    val amount: Double,
    @SerialName("payment_date") val paymentDate: String,
    @SerialName("payment_method") val paymentMethod: String,
    val notes: String? = null
)

@Serializable
data class ProfileRow(
    val id: String,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("admin_access_code") val adminAccessCode: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("dairy_name") val dairyName: String? = null,
    val email: String? = null,
    @SerialName("auth_email") val authEmail: String? = null,
    val phone: String? = null,
    @SerialName("normalized_phone") val normalizedPhone: String? = null,
    val role: String = "customer",
    @SerialName("phone_verified") val phoneVerified: Boolean = false,
    @SerialName("login_enabled") val loginEnabled: Boolean = true,
    @SerialName("qr_login_enabled") val qrLoginEnabled: Boolean = true,
    @SerialName("seeded_by_developer") val seededByDeveloper: Boolean = false,
    @SerialName("last_login_method") val lastLoginMethod: String? = null,
    @SerialName("last_login_at") val lastLoginAt: String? = null,
    val status: String = "active",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class ProfileDetails(
    val id: String,
    @SerialName("admin_id") val adminId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("admin_access_code") val adminAccessCode: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("dairy_name") val dairyName: String? = null,
    val email: String? = null,
    @SerialName("auth_email") val authEmail: String? = null,
    val phone: String? = null,
    @SerialName("normalized_phone") val normalizedPhone: String? = null,
    val role: String = "customer",
    @SerialName("phone_verified") val phoneVerified: Boolean = false,
    @SerialName("login_enabled") val loginEnabled: Boolean = true,
    @SerialName("qr_login_enabled") val qrLoginEnabled: Boolean = true,
    @SerialName("seeded_by_developer") val seededByDeveloper: Boolean = false,
    @SerialName("last_login_method") val lastLoginMethod: String? = null,
    @SerialName("last_login_at") val lastLoginAt: String? = null,
    val status: String = "active",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class TodayDeliveryViewRow(
    val id: String,
    @SerialName("admin_id") val adminId: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("product_id") val productId: String? = null,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("delivery_date") val deliveryDate: String,
    @SerialName("delivery_time") val deliveryTime: String = "Morning",
    val quantity: Double = 0.0,
    @SerialName("unit_price") val unitPrice: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("delivery_status") val deliveryStatus: String = "Pending",
    @SerialName("payment_status") val paymentStatus: String = "Unpaid",
    @SerialName("skip_reason") val skipReason: String? = null,
    @SerialName("customer_name") val customerName: String? = null,
    @SerialName("customer_phone") val customerPhone: String? = null,
    @SerialName("customer_address") val customerAddress: String? = null,
    @SerialName("route_name") val routeName: String? = null,
    @SerialName("delivery_boy_name") val deliveryBoyName: String? = null
)
