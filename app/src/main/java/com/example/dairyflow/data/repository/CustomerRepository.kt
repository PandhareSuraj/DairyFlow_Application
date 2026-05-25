package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.Customer
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class CustomerRepository(private val supabase: SupabaseClient) {
    suspend fun getCustomers(): List<Customer> =
        supabase.from(SupabaseTables.CUSTOMERS).select().decodeList<Customer>()

    suspend fun getCustomer(id: String): Customer =
        supabase.from(SupabaseTables.CUSTOMERS).select {
            filter { eq("id", id) }
        }.decodeSingle<Customer>()

    suspend fun addCustomer(customer: Customer): Customer =
        supabase.from(SupabaseTables.CUSTOMERS).insert(customer) {
            select()
        }.decodeSingle<Customer>()

    suspend fun updateCustomer(customer: Customer) {
        val id = requireNotNull(customer.id) { "Customer id is required for update." }
        supabase.from(SupabaseTables.CUSTOMERS).update(customer) {
            filter { eq("id", id) }
        }
    }

    suspend fun deleteCustomer(id: String) {
        supabase.from(SupabaseTables.CUSTOMERS).delete {
            filter { eq("id", id) }
        }
    }
}
