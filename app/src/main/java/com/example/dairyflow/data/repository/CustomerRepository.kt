package com.example.dairyflow.data.repository

import android.util.Log
import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerHold
import com.example.dairyflow.data.model.CustomerHoldRow
import com.example.dairyflow.data.model.CustomerHoldUpsert
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.CustomerUpsert
import com.example.dairyflow.data.model.DeliveryBoyRow
import com.example.dairyflow.data.model.PaymentInsert
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.Calendar
import java.text.SimpleDateFormat
import java.util.Locale

class CustomerRepository(private val supabase: SupabaseClient) {
    private val customerPayloadKeys = setOf(
        "admin_id",
        "route_id",
        "product_id",
        "product_name",
        "product_category",
        "full_name",
        "phone",
        "email",
        "address",
        "area",
        "daily_quantity",
        "morning_quantity",
        "evening_quantity",
        "milk_type",
        "price_per_liter",
        "delivery_time",
        "status",
        "opening_balance",
        "advance_payment",
        "notes"
    )

    private val customerHoldPayloadKeys = setOf(
        "customer_id",
        "hold_date",
        "reason",
        "status"
    )

    suspend fun getCustomers(): List<Customer> =
        getCustomerRows().map { it.toCustomer() }

    suspend fun getCustomer(id: String): Customer =
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "select customer") {
            val adminId = requireTenantAdminId("select customer")
            supabase.from(SupabaseTables.CUSTOMERS).select {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }.decodeSingle<CustomerRow>().toCustomer()
        }

    suspend fun addCustomer(customer: Customer): Customer =
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "insert customer", customerPayloadKeys) {
            val adminId = requireTenantAdminId("insert customer", customerPayloadKeys)
            val saved = insertCustomerWithFallback(customer, adminId)
            runCatching {
                saveAdvancePaymentIfNeeded(
                    adminId = adminId,
                    customerId = saved.id,
                    advancePayment = customer.advancePayment
                )
            }.onFailure {
                Log.w("CustomerSaveError", "Customer saved but advance payment could not be recorded.", it)
            }
            saved.toCustomer()
        }

    suspend fun updateCustomer(customer: Customer) {
        val id = requireNotNull(customer.id) { "Customer id is required for update." }
        val adminId = requireTenantAdminId("update customer", customerPayloadKeys)
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "update customer", customerPayloadKeys) {
            supabase.from(SupabaseTables.CUSTOMERS).update(customer.toUpsert(adminId)) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun deleteCustomer(id: String) {
        val adminId = requireTenantAdminId("delete customer")
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "delete customer") {
            supabase.from(SupabaseTables.CUSTOMERS).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun getActiveHolds(): List<CustomerHold> =
        getActiveHoldRows().map { it.toCustomerHold() }

    suspend fun getActiveHoldRows(): List<CustomerHoldRow> =
        optionalHoldRows("select active customer holds") {
            requireTenantAdminId("select active customer holds")
            supabase.from(SupabaseTables.CUSTOMER_HOLDS).select {
                filter {
                    eq("status", "active")
                }
            }.decodeList<CustomerHoldRow>()
        }

    suspend fun getCustomerHolds(customerId: String): List<CustomerHold> =
        optionalHoldRows("select customer holds") {
            requireTenantAdminId("select customer holds")
            supabase.from(SupabaseTables.CUSTOMER_HOLDS).select {
                filter {
                    eq("customer_id", customerId)
                    eq("status", "active")
                }
            }.decodeList<CustomerHoldRow>()
        }.map { it.toCustomerHold() }

    suspend fun getCustomerHoldRowsForMonth(customerId: String, month: Int, year: Int): List<CustomerHoldRow> =
        optionalHoldRows("select customer holds for month") {
            requireTenantAdminId("select customer holds for month")
            val start = "%04d-%02d-01".format(year, month)
            val end = monthEnd(year, month)
            supabase.from(SupabaseTables.CUSTOMER_HOLDS).select {
                filter {
                    eq("customer_id", customerId)
                    eq("status", "active")
                    gte("hold_date", start)
                    lte("hold_date", end)
                }
            }.decodeList<CustomerHoldRow>()
        }

    suspend fun addCustomerHold(customerId: String, startDate: String, endDate: String, reason: String?) {
        requireValidDate(startDate)
        requireValidDate(endDate)
        require(startDate <= endDate) { "End date cannot be before start date." }
        addCustomerHolds(customerId, datesBetween(startDate, endDate), reason)
    }

    suspend fun addCustomerHolds(customerId: String, dates: List<String>, reason: String?) {
        require(customerId.isNotBlank()) { "Customer id is required." }
        val uniqueDates = dates.distinct().sorted()
        require(uniqueDates.isNotEmpty()) { "Select at least one hold date." }
        uniqueDates.forEach(::requireValidDate)
        requireTenantAdminId("upsert customer hold dates", customerHoldPayloadKeys)
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMER_HOLDS, "upsert customer hold dates", customerHoldPayloadKeys) {
            supabase.from(SupabaseTables.CUSTOMER_HOLDS).upsert(
                uniqueDates.map { holdDate ->
                    CustomerHoldUpsert(
                        customerId = customerId,
                        holdDate = holdDate,
                        reason = reason?.takeIf { it.isNotBlank() },
                        status = "active"
                    )
                }
            ) {
                onConflict = "customer_id,hold_date"
            }
        }
    }

    suspend fun removeCustomerHold(holdId: String) {
        requireTenantAdminId("remove customer hold", setOf("status"))
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMER_HOLDS, "delete customer hold") {
            supabase.from(SupabaseTables.CUSTOMER_HOLDS).delete {
                filter {
                    eq("id", holdId)
                }
            }
        }
    }

    suspend fun removeCustomerHold(customerId: String, holdDate: String) {
        require(customerId.isNotBlank()) { "Customer id is required." }
        requireValidDate(holdDate)
        requireTenantAdminId("remove customer hold date")
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMER_HOLDS, "delete customer hold date") {
            supabase.from(SupabaseTables.CUSTOMER_HOLDS).delete {
                filter {
                    eq("customer_id", customerId)
                    eq("hold_date", holdDate)
                }
            }
        }
    }

    suspend fun getCustomerRows(): List<CustomerRow> =
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "select customers") {
            val adminId = requireTenantAdminId("select customers")
            supabase.from(SupabaseTables.CUSTOMERS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<CustomerRow>()
        }

    suspend fun addCustomer(customer: CustomerUpsert): CustomerRow =
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "insert customer", customerPayloadKeys) {
            val adminId = requireTenantAdminId("insert customer", customerPayloadKeys)
            insertCustomerUpsertWithFallback(customer.copy(adminId = adminId).withDeliveryBoyRouteIfNeeded())
        }

    suspend fun updateCustomer(id: String, customer: CustomerUpsert): CustomerRow {
        val adminId = requireTenantAdminId("update customer", customerPayloadKeys)
        return loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "update customer", customerPayloadKeys) {
            supabase.from(SupabaseTables.CUSTOMERS).update(customer.copy(adminId = adminId)) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
                select()
            }
                .decodeSingle<CustomerRow>()
        }
    }

    fun customerPayload(
        fullName: String,
        phone: String,
        email: String?,
        address: String?,
        area: String?,
        productId: String?,
        productName: String?,
        productCategory: String?,
        dailyQuantity: Double,
        milkType: String,
        pricePerLiter: Double,
        deliveryTime: String,
        status: String,
        openingBalance: Double,
        advancePayment: Double,
        notes: String?,
        routeId: String? = null,
        morningQuantity: Double = dailyQuantity.takeIf { deliveryTime.equals("Morning", ignoreCase = true) || deliveryTime.equals("Both", ignoreCase = true) } ?: 0.0,
        eveningQuantity: Double = dailyQuantity.takeIf { deliveryTime.equals("Evening", ignoreCase = true) || deliveryTime.equals("Both", ignoreCase = true) } ?: 0.0
    ): CustomerUpsert = CustomerUpsert(
        adminId = "",
        routeId = routeId,
        productId = productId,
        productName = productName,
        productCategory = productCategory,
        fullName = fullName,
        phone = phone,
        email = email,
        address = address,
        area = area,
        dailyQuantity = dailyQuantity,
        morningQuantity = morningQuantity,
        eveningQuantity = eveningQuantity,
        milkType = milkType,
        pricePerLiter = pricePerLiter,
        deliveryTime = deliveryTime,
        status = status,
        openingBalance = openingBalance,
        advancePayment = advancePayment,
        notes = notes
    )

    private suspend fun requireTenantAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireTenantAdminId(SupabaseTables.CUSTOMERS, operation, payloadKeys)

    private suspend fun insertCustomerWithFallback(customer: Customer, adminId: String): CustomerRow =
        insertCustomerUpsertWithFallback(customer.toUpsert(adminId).withDeliveryBoyRouteIfNeeded())

    private suspend fun insertCustomerUpsertWithFallback(customer: CustomerUpsert): CustomerRow =
        try {
            supabase.from(SupabaseTables.CUSTOMERS).insert(customer) {
                select()
            }.decodeSingle<CustomerRow>()
        } catch (e: Exception) {
            if (!e.isMissingOptionalCustomerColumn()) throw e
            Log.w("CustomerSaveError", "Retrying customer insert without optional customer columns.", e)
            supabase.from(SupabaseTables.CUSTOMERS).insert(customer.toCoreUpsert()) {
                select()
            }.decodeSingle<CustomerRow>()
        }

    private fun CustomerUpsert.toCoreUpsert(): CustomerCoreUpsert =
        CustomerCoreUpsert(
            adminId = adminId,
            routeId = routeId,
            fullName = fullName,
            phone = phone,
            email = email,
            address = address,
            area = area,
            dailyQuantity = dailyQuantity,
            morningQuantity = morningQuantity,
            eveningQuantity = eveningQuantity,
            milkType = milkType,
            pricePerLiter = pricePerLiter,
            deliveryTime = deliveryTime,
            status = status,
            openingBalance = openingBalance,
            notes = notes
        )

    private fun Throwable.isMissingOptionalCustomerColumn(): Boolean {
        val text = listOfNotNull(message, (this as? PostgrestRestException)?.details, (this as? PostgrestRestException)?.hint)
            .joinToString(" ")
        return (this as? PostgrestRestException)?.code in setOf("42703", "PGRST204") ||
            text.contains("advance_payment", ignoreCase = true) ||
            text.contains("product_id", ignoreCase = true) ||
            text.contains("product_name", ignoreCase = true) ||
            text.contains("product_category", ignoreCase = true) ||
            text.contains("payment_type", ignoreCase = true) ||
            text.contains("payment_mode", ignoreCase = true) ||
            text.contains("received_at", ignoreCase = true)
    }

    private suspend fun CustomerUpsert.withDeliveryBoyRouteIfNeeded(): CustomerUpsert {
        val profile = supabase.requireCurrentProfile(SupabaseTables.CUSTOMERS, "resolve customer route", customerPayloadKeys)
        if (!profile.isDeliveryBoy || !routeId.isNullOrBlank()) return this
        val deliveryBoyId = profile.deliveryBoyId?.takeIf { it.isNotBlank() } ?: return this
        val routeId = supabase.from(SupabaseTables.DELIVERY_BOYS).select {
            filter {
                eq("id", deliveryBoyId)
                eq("admin_id", adminId)
                eq("status", "active")
            }
        }.decodeSingle<DeliveryBoyRow>().routeId
        return copy(routeId = routeId)
    }

    private fun Customer.toUpsert(adminId: String): CustomerUpsert =
        CustomerUpsert(
            adminId = adminId,
            routeId = routeId,
            productId = productId,
            productName = productName,
            productCategory = productCategory,
            fullName = fullName?.takeIf { it.isNotBlank() } ?: name,
            phone = phone.orEmpty(),
            email = email,
            address = address,
            area = area,
            dailyQuantity = dailyQuantity,
            morningQuantity = morningQuantity.takeIf { it > 0.0 }
                ?: dailyQuantity.takeIf { deliveryTime.equals("Morning", ignoreCase = true) || deliveryTime.equals("Both", ignoreCase = true) }
                ?: 0.0,
            eveningQuantity = eveningQuantity.takeIf { it > 0.0 }
                ?: dailyQuantity.takeIf { deliveryTime.equals("Evening", ignoreCase = true) || deliveryTime.equals("Both", ignoreCase = true) }
                ?: 0.0,
            milkType = milkType,
            pricePerLiter = milkRate,
            deliveryTime = deliveryTime,
            status = if (isActive) "active" else "inactive",
            openingBalance = openingBalance,
            advancePayment = advancePayment,
            notes = notes
        )

    private fun CustomerRow.toCustomer(): Customer =
        Customer(
            id = id,
            adminId = adminId,
            routeId = routeId,
            productId = productId,
            productName = productName,
            productCategory = productCategory ?: milkType,
            fullName = fullName,
            name = displayName,
            phone = phone,
            email = email,
            address = address,
            area = area,
            rate = pricePerLiter,
            milkRate = pricePerLiter,
            dailyQuantity = dailyQuantity,
            morningQuantity = morningQuantity,
            eveningQuantity = eveningQuantity,
            milkType = milkType,
            deliveryTime = deliveryTime,
            openingBalance = openingBalance,
            advancePayment = advancePayment,
            notes = notes,
            isActive = status.equals("active", ignoreCase = true),
            createdAt = createdAt
        )

    private fun CustomerHoldRow.toCustomerHold(): CustomerHold =
        CustomerHold(
            id = id,
            customerId = customerId,
            startDate = holdDate,
            endDate = holdDate,
            reason = reason,
            status = status,
            createdAt = createdAt
        )

    private suspend fun optionalHoldRows(operation: String, block: suspend () -> List<CustomerHoldRow>): List<CustomerHoldRow> =
        try {
            block()
        } catch (e: Exception) {
            if (e.isMissingCustomerHoldsSchema()) {
                Log.w("CustomerSaveError", "Customer holds migration is not applied yet; continuing without hold status for $operation.")
                emptyList()
            } else {
                logSupabaseFailure("CustomerSaveError", SupabaseTables.CUSTOMER_HOLDS, operation, error = e)
                throw e
            }
        }

    private fun Throwable.isMissingCustomerHoldsSchema(): Boolean {
        val text = listOfNotNull(message, (this as? PostgrestRestException)?.details, (this as? PostgrestRestException)?.hint)
            .joinToString(" ")
        return text.contains("customer_holds", ignoreCase = true) ||
            text.contains("relation", ignoreCase = true) ||
            text.contains("schema", ignoreCase = true) ||
            (this as? PostgrestRestException)?.code in setOf("42P01", "PGRST204")
    }

    private fun requireValidDate(value: String) {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
        require(runCatching { formatter.format(formatter.parse(value)!!) == value }.getOrDefault(false)) {
            "Date must be yyyy-MM-dd."
        }
    }

    private suspend fun saveAdvancePaymentIfNeeded(
        adminId: String,
        customerId: String?,
        advancePayment: Double
    ) {
        val savedCustomerId = customerId?.takeIf { it.isNotBlank() } ?: return
        if (advancePayment <= 0.0) return
        supabase.from(SupabaseTables.PAYMENTS).insert(
            PaymentInsert(
                adminId = adminId,
                customerId = savedCustomerId,
                invoiceId = null,
                deliveryId = null,
                collectedBy = null,
                amount = advancePayment,
                paymentDate = today(),
                paymentType = "advance",
                paymentMode = null,
                paymentMethod = "Cash",
                transactionId = null,
                receivedAt = nowIso(),
                notes = "Advance payment before starting service"
            )
        )
    }

    private fun today(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

    private fun nowIso(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(Calendar.getInstance().time)

    private fun datesBetween(startDate: String, endDate: String): List<String> {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
        val calendar = Calendar.getInstance(Locale.US).apply {
            time = formatter.parse(startDate)!!
        }
        val end = formatter.parse(endDate)!!
        val dates = mutableListOf<String>()
        while (!calendar.time.after(end)) {
            dates += formatter.format(calendar.time)
            calendar.add(Calendar.DAY_OF_MONTH, 1)
        }
        return dates
    }

    private fun monthEnd(year: Int, month: Int): String {
        val calendar = Calendar.getInstance(Locale.US).apply {
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }
        return "%04d-%02d-%02d".format(year, month, calendar.getActualMaximum(Calendar.DAY_OF_MONTH))
    }
}

@Serializable
private data class CustomerCoreUpsert(
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
