package com.example.dairyflow.data.repository

import android.util.Log
import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DashboardStats
import com.example.dairyflow.data.model.DeliveryBoyRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.PaymentRow
import com.example.dairyflow.data.model.ProductRow
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import java.util.Calendar

class DashboardRepository(private val supabase: SupabaseClient) {
    suspend fun loadStats(today: String): DashboardStats {
        supabase.logFinalSchemaCheck()
        val adminId = supabase.requireAdminId(SupabaseTables.PROFILES, "load dashboard")
        val customers = safeList {
            supabase.from(SupabaseTables.CUSTOMERS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<CustomerRow>()
        }
        val products = safeList {
            supabase.from(SupabaseTables.PRODUCTS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<ProductRow>()
        }
        val deliveryBoys = safeList {
            supabase.from(SupabaseTables.DELIVERY_BOYS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<DeliveryBoyRow>()
        }
        val deliveries = safeList {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<DeliveryRow>()
        }
        val invoices = safeList {
            supabase.from(SupabaseTables.INVOICES).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<InvoiceRow>()
        }
        val payments = safeList {
            supabase.from(SupabaseTables.PAYMENTS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<PaymentRow>()
        }
        val todayDeliveries = deliveries.filter { it.deliveryDate == today }
        val monthPrefix = "%04d-%02d".format(currentYear(), currentMonth())
        val monthInvoices = invoices.filter { it.billingMonth == monthPrefix }
        val monthPayments = payments.filter { it.paymentDate.startsWith(monthPrefix) }

        return DashboardStats(
            totalCustomers = customers.size,
            totalProducts = products.size,
            totalDeliveryBoys = deliveryBoys.size,
            todayDelivery = todayDeliveries.filter { it.deliveryStatus == "Delivered" }.sumOf { it.quantity },
            deliveredToday = todayDeliveries.count { it.deliveryStatus == "Delivered" },
            pendingToday = todayDeliveries.count { it.deliveryStatus == "Pending" },
            skippedToday = todayDeliveries.count { it.deliveryStatus == "Skipped" },
            pendingBills = invoices.count { it.status != "Paid" },
            totalCollection = payments.sumOf { it.amount },
            monthlyRevenue = monthPayments.sumOf { it.amount }.takeIf { it > 0.0 }
                ?: monthInvoices.sumOf { it.paidAmount },
            previousPending = invoices.sumOf { it.balanceAmount }
        )
    }

    private suspend fun <T> safeList(block: suspend () -> List<T>): List<T> =
        runCatching { block() }
            .onFailure { Log.e("DashboardError", "Failed to load dashboard data from new schema", it) }
            .getOrDefault(emptyList())

    private fun currentMonth(): Int = Calendar.getInstance().get(Calendar.MONTH) + 1
    private fun currentYear(): Int = Calendar.getInstance().get(Calendar.YEAR)
}
