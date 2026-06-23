package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.InvoiceItemRow
import com.example.dairyflow.data.model.InvoiceRow
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class InvoiceRepository(private val supabase: SupabaseClient) {
    suspend fun getInvoices(customerId: String? = null): List<InvoiceRow> {
        val adminId = supabase.requireAdminId(SupabaseTables.INVOICES, "select invoices")
        return loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "select invoices") {
            supabase.from(SupabaseTables.INVOICES).select {
                filter {
                    eq("admin_id", adminId)
                    if (!customerId.isNullOrBlank()) eq("customer_id", customerId)
                }
            }.decodeList<InvoiceRow>()
        }
    }

    suspend fun getInvoiceItems(invoiceId: String): List<InvoiceItemRow> =
        loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICE_ITEMS, "select invoice items") {
            supabase.from(SupabaseTables.INVOICE_ITEMS).select {
                filter { eq("invoice_id", invoiceId) }
            }.decodeList<InvoiceItemRow>()
        }

    suspend fun generateMonthlyInvoices(month: Int, year: Int, customerId: String? = null, routeId: String? = null): Int {
        supabase.requireAdminId(SupabaseTables.INVOICES, "generate monthly invoices")
        return loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "generate monthly invoices") {
            supabase.postgrest.rpc(
                "generate_monthly_invoices",
                GenerateMonthlyInvoicesParams(
                    billingMonth = "%04d-%02d".format(year, month),
                    customerId = customerId?.takeIf { it.isNotBlank() },
                    routeId = routeId?.takeIf { it.isNotBlank() }
                )
            ).decodeSingle<Int>()
        }
    }
}

@Serializable
private data class GenerateMonthlyInvoicesParams(
    @SerialName("p_billing_month") val billingMonth: String,
    @SerialName("p_customer_id") val customerId: String? = null,
    @SerialName("p_route_id") val routeId: String? = null
)
