package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.CustomerUpsert
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class CustomerRepository(private val supabase: SupabaseClient) {
    private val customerPayloadKeys = setOf(
        "admin_id",
        "route_id",
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
        "notes"
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
            supabase.from(SupabaseTables.CUSTOMERS).insert(customer.toUpsert(requireTenantAdminId("insert customer", customerPayloadKeys))) {
                select()
            }.decodeSingle<CustomerRow>().toCustomer()
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

    suspend fun getCustomerRows(): List<CustomerRow> =
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "select customers") {
            val adminId = requireTenantAdminId("select customers")
            supabase.from(SupabaseTables.CUSTOMERS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<CustomerRow>()
        }

    suspend fun addCustomer(customer: CustomerUpsert): CustomerRow =
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "insert customer", customerPayloadKeys) {
            supabase.from(SupabaseTables.CUSTOMERS).insert(customer.copy(adminId = requireTenantAdminId("insert customer", customerPayloadKeys))) {
                select()
            }.decodeSingle<CustomerRow>()
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
        dailyQuantity: Double,
        milkType: String,
        pricePerLiter: Double,
        deliveryTime: String,
        status: String,
        openingBalance: Double,
        notes: String?,
        routeId: String? = null,
        morningQuantity: Double = dailyQuantity.takeIf { deliveryTime.equals("Morning", ignoreCase = true) || deliveryTime.equals("Both", ignoreCase = true) } ?: 0.0,
        eveningQuantity: Double = dailyQuantity.takeIf { deliveryTime.equals("Evening", ignoreCase = true) || deliveryTime.equals("Both", ignoreCase = true) } ?: 0.0
    ): CustomerUpsert = CustomerUpsert(
        adminId = "",
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

    private suspend fun requireTenantAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireAdminId(SupabaseTables.CUSTOMERS, operation, payloadKeys)

    private fun Customer.toUpsert(adminId: String): CustomerUpsert =
        CustomerUpsert(
            adminId = adminId,
            routeId = routeId,
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
            notes = notes
        )

    private fun CustomerRow.toCustomer(): Customer =
        Customer(
            id = id,
            adminId = adminId,
            routeId = routeId,
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
            notes = notes,
            isActive = status.equals("active", ignoreCase = true),
            createdAt = createdAt
        )
}
