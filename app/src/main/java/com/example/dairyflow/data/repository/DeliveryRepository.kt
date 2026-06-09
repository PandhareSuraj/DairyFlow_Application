package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.DeliveryShift
import com.example.dairyflow.data.model.DeliveryStatus
import com.example.dairyflow.data.model.DeliveryUpsert
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryBoyRow
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class DeliveryRepository(private val supabase: SupabaseClient) {
    private val deliveryPayloadKeys = setOf(
        "admin_id",
        "customer_id",
        "product_id",
        "route_id",
        "delivery_boy_id",
        "delivery_date",
        "delivery_time",
        "quantity",
        "unit_price",
        "total_amount",
        "delivery_status",
        "payment_status",
        "skip_reason",
        "notes"
    )

    suspend fun getDeliveries(): List<DeliveryRecord> =
        getDeliveryRows().map { it.toDeliveryRecord() }

    suspend fun getProducts(): List<Product> =
        getProductRows().map { it.toProduct() }

    suspend fun getProductRows(): List<ProductRow> =
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.PRODUCTS, "select products for delivery") {
            val adminId = requireTenantAdminId("select products for delivery")
            supabase.from(SupabaseTables.PRODUCTS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<ProductRow>()
        }

    suspend fun getDeliveriesForDate(date: String): List<DeliveryRecord> =
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select deliveries for date") {
            val adminId = requireTenantAdminId("select deliveries for date")
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("delivery_date", date)
                }
            }.decodeList<DeliveryRow>().map { it.toDeliveryRecord() }
        }

    suspend fun ensureDailyDeliveries(date: String): Int {
        requireValidDeliveryDate(date)
        val adminId = requireTenantAdminId("generate daily deliveries", deliveryPayloadKeys)
        val customers: List<CustomerRow> = loggedSupabaseCall("DeliverySaveError", SupabaseTables.CUSTOMERS, "select customers for daily deliveries") {
            supabase.from(SupabaseTables.CUSTOMERS).select {
                filter {
                    eq("admin_id", adminId)
                    eq("status", "active")
                }
            }.decodeList<CustomerRow>()
        }
        val products: List<ProductRow> = getProductRows().filter { it.status.equals("active", ignoreCase = true) }
        if (products.isEmpty()) return 0
        val deliveryBoys: List<DeliveryBoyRow> = loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERY_BOYS, "select delivery boys for daily deliveries") {
            supabase.from(SupabaseTables.DELIVERY_BOYS).select {
                filter {
                    eq("admin_id", adminId)
                    eq("status", "active")
                }
            }.decodeList<DeliveryBoyRow>()
        }
        val existingKeys: MutableSet<String> = getDeliveryRows(date)
            .map { "${it.customerId}|${it.deliveryTime.lowercase(Locale.US)}" }
            .toMutableSet()
        var created = 0

        customers.forEach customerLoop@{ customer ->
            val customerId = customer.id ?: return@customerLoop
            val product = products.bestMatchFor(customer.milkType)
            customer.deliveryQuantities().forEach deliveryLoop@{ (deliveryTime, quantity) ->
                val key = "$customerId|${deliveryTime.lowercase(Locale.US)}"
                if (quantity <= 0.0 || key in existingKeys) return@deliveryLoop
                val unitPrice = customer.pricePerLiter.takeIf { it > 0.0 } ?: product.price
                if (unitPrice <= 0.0) return@deliveryLoop
                addDelivery(
                    DeliveryUpsert(
                        adminId = adminId,
                        customerId = customerId,
                        productId = requireNotNull(product.id) { "Product is required." },
                        routeId = customer.routeId,
                        deliveryBoyId = deliveryBoys.firstOrNull { it.routeId == customer.routeId }?.id,
                        deliveryDate = date,
                        deliveryTime = deliveryTime,
                        quantity = quantity,
                        unitPrice = unitPrice,
                        totalAmount = quantity * unitPrice,
                        deliveryStatus = "Pending",
                        paymentStatus = "Unpaid",
                        notes = "Auto-created from customer daily schedule"
                    )
                )
                existingKeys += key
                created++
            }
        }

        return created
    }

    suspend fun getCustomerDeliveriesForMonth(customerId: String, month: Int, year: Int): List<DeliveryRecord> {
        val start = "%04d-%02d-01".format(year, month)
        val end = monthEnd(year, month)
        return loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select customer deliveries for month") {
            val adminId = requireTenantAdminId("select customer deliveries for month")
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("customer_id", customerId)
                    eq("delivery_status", "Delivered")
                    gte("delivery_date", start)
                    lte("delivery_date", end)
                }
            }.decodeList<DeliveryRow>().map { it.toDeliveryRecord() }
        }
    }

    suspend fun saveDelivery(record: DeliveryRecord): DeliveryRecord {
        requireValidDeliveryDate(record.deliveryDate)
        require(record.customerId.isNotBlank()) { "Customer is required." }
        require(record.productId?.isNotBlank() == true) { "Product is required." }
        require(record.quantity > 0.0) { "Quantity must be positive." }
        require(record.unitPrice > 0.0) { "Unit price must be positive." }
        val adminId = requireTenantAdminId("save delivery", deliveryPayloadKeys)
        val payload = DeliveryUpsert(
            adminId = adminId,
            customerId = record.customerId,
            productId = requireNotNull(record.productId) { "Product is required." },
            routeId = record.routeId,
            deliveryBoyId = record.deliveryBoyId,
            deliveryDate = record.deliveryDate,
            deliveryTime = record.shift.toDeliveryTime(),
            quantity = record.quantity,
            unitPrice = record.unitPrice,
            totalAmount = record.quantity * record.unitPrice,
            deliveryStatus = record.status.toDeliveryStatusText(),
            paymentStatus = "Unpaid",
            skipReason = record.skipReason,
            notes = record.notes
        )
        return if (record.id == null) {
            loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "insert delivery", deliveryPayloadKeys) {
                supabase.from(SupabaseTables.DELIVERIES).insert(payload) {
                    select()
                }.decodeSingle<DeliveryRow>().toDeliveryRecord()
            }
        } else {
            loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "update delivery", deliveryPayloadKeys) {
                supabase.from(SupabaseTables.DELIVERIES).update(payload) {
                    filter {
                        eq("id", record.id)
                        eq("admin_id", adminId)
                    }
                    select()
                }
                    .decodeSingle<DeliveryRow>().toDeliveryRecord()
            }
        }
    }

    suspend fun getDeliveryRows(
        date: String? = null,
        routeId: String? = null,
        deliveryBoyId: String? = null
    ): List<DeliveryRow> =
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select deliveries") {
            val adminId = requireTenantAdminId("select deliveries")
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    if (!date.isNullOrBlank()) eq("delivery_date", date)
                    if (!routeId.isNullOrBlank()) eq("route_id", routeId)
                    if (!deliveryBoyId.isNullOrBlank()) eq("delivery_boy_id", deliveryBoyId)
                }
            }.decodeList<DeliveryRow>()
        }

    suspend fun getDeliveryRowsByStatus(status: String): List<DeliveryRow> =
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select deliveries by status") {
            val adminId = requireTenantAdminId("select deliveries by status")
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("delivery_status", status)
                }
            }.decodeList<DeliveryRow>()
        }

    suspend fun addDelivery(delivery: DeliveryUpsert): DeliveryRow {
        requireValidDeliveryDate(delivery.deliveryDate)
        require(delivery.customerId.isNotBlank()) { "Customer is required." }
        require(delivery.productId.isNotBlank()) { "Product is required." }
        require(delivery.quantity > 0.0) { "Quantity must be positive." }
        require(delivery.unitPrice > 0.0) { "Unit price must be positive." }
        return loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "insert delivery", deliveryPayloadKeys) {
            supabase.from(SupabaseTables.DELIVERIES).insert(delivery.copy(adminId = requireTenantAdminId("insert delivery", deliveryPayloadKeys))) {
                select()
            }.decodeSingle<DeliveryRow>()
        }
    }

    suspend fun updateDeliveryStatus(id: String, status: String): DeliveryRow {
        val adminId = requireTenantAdminId("update delivery status")
        val existing = loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select delivery before status update") {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }.decodeSingle<DeliveryRow>()
        }
        return loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "update delivery status") {
            supabase.from(SupabaseTables.DELIVERIES).update(
                {
                    set("delivery_status", status)
                    if (status.equals("Skipped", ignoreCase = true)) {
                        set("total_amount", 0.0)
                    } else if (status.equals("Delivered", ignoreCase = true)) {
                        set("total_amount", existing.quantity * existing.unitPrice)
                        set("skip_reason", null as String?)
                    }
                }
            ) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
                select()
            }
                .decodeSingle<DeliveryRow>()
        }
    }

    suspend fun deleteDelivery(id: String) {
        val adminId = requireTenantAdminId("delete delivery")
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "delete delivery") {
            supabase.from(SupabaseTables.DELIVERIES).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun getPendingDeliveries(customerId: String, billingMonth: String): List<DeliveryRow> {
        requireValidBillingMonth(billingMonth)
        val start = "$billingMonth-01"
        val parts = billingMonth.split("-")
        val end = monthEnd(parts[0].toInt(), parts[1].toInt())
        return loggedSupabaseCall("BillingError", SupabaseTables.DELIVERIES, "select pending deliveries") {
            val adminId = requireTenantAdminId("select pending deliveries")
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("customer_id", customerId)
                    eq("delivery_status", "Delivered")
                    eq("payment_status", "Unpaid")
                    gte("delivery_date", start)
                    lte("delivery_date", end)
                }
            }.decodeList<DeliveryRow>()
        }
    }

    suspend fun updateDeliveryPaymentStatus(deliveryIds: List<String>, paymentStatus: String) {
        if (deliveryIds.isEmpty()) return
        val adminId = requireTenantAdminId("update delivery payment status", setOf("payment_status"))
        loggedSupabaseCall("BillingError", SupabaseTables.DELIVERIES, "update delivery payment status", setOf("payment_status")) {
            deliveryIds.forEach { id ->
                supabase.from(SupabaseTables.DELIVERIES).update(
                    {
                        set("payment_status", paymentStatus)
                    }
                ) {
                    filter {
                        eq("id", id)
                        eq("admin_id", adminId)
                    }
                }
            }
        }
    }

    fun deliveryPayload(
        customerId: String,
        productId: String?,
        deliveryDate: String,
        deliveryTime: String,
        quantity: Double,
        unitPrice: Double,
        deliveryStatus: String,
        paymentStatus: String,
        notes: String?,
        routeId: String? = null,
        deliveryBoyId: String? = null,
        skipReason: String? = null
    ): DeliveryUpsert {
        requireValidDeliveryDate(deliveryDate)
        require(customerId.isNotBlank()) { "Customer is required." }
        val requiredProductId = requireNotNull(productId?.takeIf { it.isNotBlank() }) { "Product is required." }
        require(quantity > 0.0) { "Quantity must be positive." }
        require(unitPrice > 0.0) { "Unit price must be positive." }
        return DeliveryUpsert(
            adminId = "",
            customerId = customerId,
            productId = requiredProductId,
            routeId = routeId,
            deliveryBoyId = deliveryBoyId,
            deliveryDate = deliveryDate,
            deliveryTime = deliveryTime,
            quantity = quantity,
            unitPrice = unitPrice,
            totalAmount = quantity * unitPrice,
            deliveryStatus = deliveryStatus,
            paymentStatus = paymentStatus,
            skipReason = skipReason,
            notes = notes
        )
    }

    private suspend fun requireTenantAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireAdminId(SupabaseTables.DELIVERIES, operation, payloadKeys)

    private fun DeliveryRow.toDeliveryRecord(): DeliveryRecord =
        DeliveryRecord(
            id = id,
            customerId = customerId,
            productId = productId,
            deliveryBoyId = deliveryBoyId,
            routeId = routeId,
            deliveryDate = deliveryDate,
            shift = if (deliveryTime.equals("Evening", ignoreCase = true)) DeliveryShift.EVENING else DeliveryShift.MORNING,
            quantity = quantity,
            unitPrice = unitPrice,
            totalAmount = totalAmount,
            status = when (deliveryStatus.lowercase(Locale.US)) {
                "pending" -> DeliveryStatus.PENDING
                "skipped" -> DeliveryStatus.SKIPPED
                "cancelled" -> DeliveryStatus.CANCELLED
                else -> DeliveryStatus.DELIVERED
            },
            skipReason = skipReason,
            notes = notes,
            createdAt = createdAt
        )

    private fun ProductRow.toProduct(): Product =
        Product(
            id = id,
            productName = name,
            pricePerUnit = price,
            stockQuantity = stockQuantity,
            isActive = status.equals("active", ignoreCase = true),
            createdAt = createdAt
        )

    private fun List<ProductRow>.bestMatchFor(milkType: String): ProductRow =
        firstOrNull { product ->
            product.name.equals(milkType, ignoreCase = true) ||
                product.name.contains(milkType, ignoreCase = true) ||
                product.category.equals(milkType, ignoreCase = true)
        } ?: first()

    private fun CustomerRow.deliveryQuantities(): List<Pair<String, Double>> {
        val normalizedTime = deliveryTime.lowercase(Locale.US)
        val morning = morningQuantity.takeIf { it > 0.0 }
            ?: dailyQuantity.takeIf { normalizedTime == "morning" || normalizedTime == "both" }
            ?: 0.0
        val evening = eveningQuantity.takeIf { it > 0.0 }
            ?: dailyQuantity.takeIf { normalizedTime == "evening" || normalizedTime == "both" }
            ?: 0.0
        return listOf("Morning" to morning, "Evening" to evening)
    }

    private fun DeliveryShift.toDeliveryTime(): String =
        when (this) {
            DeliveryShift.EVENING -> "Evening"
            DeliveryShift.MORNING -> "Morning"
        }

    private fun DeliveryStatus.toDeliveryStatusText(): String =
        when (this) {
            DeliveryStatus.PENDING -> "Pending"
            DeliveryStatus.DELIVERED -> "Delivered"
            DeliveryStatus.SKIPPED -> "Skipped"
            DeliveryStatus.CANCELLED -> "Cancelled"
        }

    private fun requireValidDeliveryDate(value: String) {
        require(isValidDate(value, "yyyy-MM-dd")) { "Delivery date must be yyyy-MM-dd." }
    }

    private fun requireValidBillingMonth(value: String) {
        require(Regex("""\d{4}-\d{2}""").matches(value) && isValidDate("$value-01", "yyyy-MM-dd")) {
            "Billing month must be yyyy-MM."
        }
    }

    private fun isValidDate(value: String, pattern: String): Boolean {
        val formatter = SimpleDateFormat(pattern, Locale.US).apply { isLenient = false }
        return runCatching { formatter.format(formatter.parse(value)!!) == value }.getOrDefault(false)
    }

    private fun monthEnd(year: Int, month: Int): String {
        val calendar = Calendar.getInstance(Locale.US)
        calendar.set(Calendar.YEAR, year)
        calendar.set(Calendar.MONTH, month - 1)
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        val lastDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
        return "%04d-%02d-%02d".format(year, month, lastDay)
    }
}
