package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.BillStatus
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.DeliveryStatus
import com.example.dairyflow.data.model.Invoice
import com.example.dairyflow.data.model.InvoiceStatus
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class BillingRepository(
    private val supabase: SupabaseClient,
    private val customerRepository: CustomerRepository,
    private val deliveryRepository: DeliveryRepository
) {
    suspend fun getBills(): List<BillingRecord> =
        supabase.from(SupabaseTables.INVOICES).select().decodeList<Invoice>().map { it.toBillingRecord() }

    suspend fun getBillsForCustomer(customerId: String): List<BillingRecord> =
        supabase.from(SupabaseTables.INVOICES).select {
            filter { eq("customer_id", customerId) }
        }.decodeList<Invoice>().map { it.toBillingRecord() }

    suspend fun generateMonthlyBill(customerId: String, month: Int, year: Int): BillingRecord {
        val customer = customerRepository.getCustomer(customerId)
        val deliveries = deliveryRepository.getCustomerDeliveriesForMonth(customerId, month, year)
        val totalQuantity = deliveries
            .filter { it.status == DeliveryStatus.DELIVERED }
            .sumOf { it.quantity + it.extraQuantity }
        val totalAmount = totalQuantity * customer.milkRate
        val invoice = Invoice(
            invoiceNumber = "DF-$year-${month.toString().padStart(2, '0')}-${customerId.take(8)}",
            customerId = customerId,
            billingMonth = month,
            billingYear = year,
            monthlyDeliveryAmount = totalAmount,
            previousPendingAmount = 0.0,
            totalBillAmount = totalAmount,
            paidAmount = 0.0,
            pendingAmount = totalAmount,
            invoiceStatus = if (totalAmount == 0.0) InvoiceStatus.PAID else InvoiceStatus.UNPAID
        )
        return supabase.from(SupabaseTables.INVOICES).insert(invoice) {
            select()
        }.decodeSingle<Invoice>().toBillingRecord(totalQuantity = totalQuantity, rate = customer.milkRate)
    }

    suspend fun updatePaymentTotals(bill: BillingRecord, addedAmount: Double) {
        val id = requireNotNull(bill.id) { "Bill id is required for payment update." }
        val paid = (bill.paidAmount + addedAmount).coerceAtMost(bill.totalAmount)
        val due = (bill.totalAmount - paid).coerceAtLeast(0.0)
        val status = when {
            due == 0.0 -> BillStatus.PAID
            paid == 0.0 -> BillStatus.UNPAID
            else -> BillStatus.PARTIAL
        }
        supabase.from(SupabaseTables.INVOICES).update(
            {
                set("paid_amount", paid)
                set("pending_amount", due)
                set("invoice_status", status)
            }
        ) {
            filter { eq("id", id) }
        }
    }

    private fun Invoice.toBillingRecord(totalQuantity: Double = 0.0, rate: Double = 0.0): BillingRecord =
        BillingRecord(
            id = id,
            invoiceNumber = invoiceNumber,
            customerId = customerId,
            month = billingMonth,
            year = billingYear,
            totalQuantity = totalQuantity,
            rate = rate,
            totalAmount = totalBillAmount,
            paidAmount = paidAmount,
            dueAmount = pendingAmount,
            billStatus = when (invoiceStatus) {
                InvoiceStatus.PAID -> BillStatus.PAID
                InvoiceStatus.PARTIAL -> BillStatus.PARTIAL
                InvoiceStatus.UNPAID -> BillStatus.UNPAID
            },
            generatedAt = generatedDate
        )
}
