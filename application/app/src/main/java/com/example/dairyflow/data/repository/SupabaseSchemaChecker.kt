package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.json.JsonObject

suspend fun SupabaseClient.logFinalSchemaCheck() {
    listOf(
        SupabaseTables.CUSTOMERS,
        SupabaseTables.PRODUCTS,
        SupabaseTables.DELIVERIES,
        SupabaseTables.INVOICES,
        SupabaseTables.INVOICE_ITEMS,
        SupabaseTables.PAYMENTS
    ).forEach { table ->
        runCatching {
            from(table).select {
                limit(1)
            }.decodeList<JsonObject>()
        }.onFailure {
            logSupabaseFailure(
                tag = "SupabaseSchemaError",
                table = table,
                operation = "schema self-check select limit 1",
                error = it
            )
        }
    }
}
