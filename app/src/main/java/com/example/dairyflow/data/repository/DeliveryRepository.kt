package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class DeliveryRepository(private val supabase: SupabaseClient) {
    suspend fun getDeliveries(): List<DeliveryRecord> =
        supabase.from(SupabaseTables.DELIVERIES).select().decodeList<DeliveryRecord>()

    suspend fun getProducts(): List<Product> =
        supabase.from(SupabaseTables.PRODUCTS).select().decodeList<Product>()

    suspend fun getDeliveriesForDate(date: String): List<DeliveryRecord> =
        supabase.from(SupabaseTables.DELIVERIES).select {
            filter { eq("delivery_date", date) }
        }.decodeList<DeliveryRecord>()

    suspend fun getCustomerDeliveriesForMonth(customerId: String, month: Int, year: Int): List<DeliveryRecord> {
        val start = "%04d-%02d-01".format(year, month)
        val end = "%04d-%02d-31".format(year, month)
        return supabase.from(SupabaseTables.DELIVERIES).select {
            filter {
                eq("customer_id", customerId)
                eq("status", "delivered")
                gte("delivery_date", start)
                lte("delivery_date", end)
            }
        }.decodeList<DeliveryRecord>()
    }

    suspend fun saveDelivery(record: DeliveryRecord): DeliveryRecord {
        val calculated = record.copy(totalAmount = record.quantity * record.unitPrice)
        return if (calculated.id == null) {
            supabase.from(SupabaseTables.DELIVERIES).insert(calculated) {
                select()
            }.decodeSingle<DeliveryRecord>()
        } else {
            supabase.from(SupabaseTables.DELIVERIES).update(calculated) {
                filter { eq("id", calculated.id) }
                select()
            }.decodeSingle<DeliveryRecord>()
        }
    }
}
