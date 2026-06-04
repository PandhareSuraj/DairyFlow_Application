package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.BillStatus
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.InvoiceItem
import com.example.dairyflow.data.model.InvoiceItemInsert
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.InvoiceUpsert
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class BillingRepository(
    private val supabase: SupabaseClient,
    private val customerRepository: CustomerRepository,
    private val deliveryRepository: DeliveryRepository
) {
    private val invoicePayloadKeys = setOf(
        "admin_id",
        "customer_id",
        "invoice_number",
        "billing_month",
        "subtotal",
        "previous_balance",
        "total_amount",
        "paid_amount",
        "balance_amount",
        "status"
    )

    private val invoiceItemPayloadKeys = setOf(
        "invoice_id",
        "delivery_id",
        "product_name",
        "delivery_date",
        "quantity",
        "unit_price",
        "total_amount"
    )

    suspend fun getBills(): List<BillingRecord> =
        getInvoices().map { it.toBillingRecord() }

    suspend fun getInvoiceCustomers(): List<CustomerRow> =
        customerRepository.getCustomerRows()

    suspend fun generateBill(customerId: String, billingMonth: String): BillingRecord =
        generateInvoice(customerId, billingMonth).toBillingRecord()

    suspend fun getBillsForCustomer(customerId: String): List<BillingRecord> =
        loggedSupabaseCall("BillingError", SupabaseTables.INVOICES, "select customer invoices") {
            val adminId = requireAdminId("select customer invoices")
            supabase.from(SupabaseTables.INVOICES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("customer_id", customerId)
                }
            }.decodeList<InvoiceRow>().map { it.toBillingRecord() }
        }

    suspend fun generateMonthlyBill(customerId: String, month: Int, year: Int): BillingRecord {
        val billingMonth = "%04d-%02d".format(year, month)
        val totalQuantity = deliveryRepository.getPendingDeliveries(customerId, billingMonth).sumOf { it.quantity }
        return generateInvoice(customerId, billingMonth).toBillingRecord(totalQuantity = totalQuantity)
    }

    suspend fun updatePaymentTotals(bill: BillingRecord, addedAmount: Double) {
        val id = requireNotNull(bill.id) { "Bill id is required for payment update." }
        val adminId = requireAdminId("update invoice payment totals")
        val invoice = loggedSupabaseCall("PaymentSaveError", SupabaseTables.INVOICES, "select invoice before payment update") {
            supabase.from(SupabaseTables.INVOICES).select {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }.decodeSingle<InvoiceRow>()
        }
        val paid = (invoice.paidAmount + addedAmount).coerceAtMost(invoice.totalAmount)
        val due = (invoice.totalAmount - paid).coerceAtLeast(0.0)
        val status = when {
            due == 0.0 -> "Paid"
            paid == 0.0 -> "Unpaid"
            else -> "Partial"
        }
        loggedSupabaseCall("PaymentSaveError", SupabaseTables.INVOICES, "update invoice payment totals", setOf("paid_amount", "balance_amount", "status")) {
            supabase.from(SupabaseTables.INVOICES).update(
                {
                    set("paid_amount", paid)
                    set("balance_amount", due)
                    set("status", status)
                }
            ) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
        if (status == "Paid") {
            markInvoiceDeliveriesPaid(id)
        }
    }

    suspend fun getInvoices(): List<InvoiceRow> =
        loggedSupabaseCall("BillingError", SupabaseTables.INVOICES, "select invoices") {
            val adminId = requireAdminId("select invoices")
            supabase.from(SupabaseTables.INVOICES).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<InvoiceRow>()
        }

    suspend fun getPendingDeliveries(customerId: String, billingMonth: String) =
        deliveryRepository.getPendingDeliveries(customerId, billingMonth)

    suspend fun generateInvoice(customerId: String, billingMonth: String): InvoiceRow {
        requireValidBillingMonth(billingMonth)
        val adminId = requireAdminId("generate invoice", invoicePayloadKeys)
        val deliveries = getPendingDeliveries(customerId, billingMonth)
        val duplicate = loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "check duplicate invoice") {
            supabase.from(SupabaseTables.INVOICES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("customer_id", customerId)
                    eq("billing_month", billingMonth)
                }
            }.decodeList<InvoiceRow>()
        }.firstOrNull()
        require(duplicate == null) { "Invoice already exists for this customer and month." }
        val customer = customerRepository.getCustomerRows().firstOrNull { it.id == customerId }
        require(customer != null) { "Customer not found for invoice." }
        val productsById = deliveryRepository.getProductRows().associateBy { it.id }
        val subtotal = deliveries.sumOf { it.totalAmount }
        val previousBalance = previousBalanceForCustomer(customerId, billingMonth, customer.openingBalance)
        val total = subtotal + previousBalance
        require(total > 0.0) {
            "No unpaid delivered milk or pending balance found for this customer and month."
        }
        val invoice = loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "insert invoice", invoicePayloadKeys) {
            supabase.from(SupabaseTables.INVOICES).insert(
                InvoiceUpsert(
                    adminId = adminId,
                    customerId = customerId,
                    invoiceNumber = invoiceNumber(customerId, billingMonth),
                    billingMonth = billingMonth,
                    subtotal = subtotal,
                    previousBalance = previousBalance,
                    totalAmount = total,
                    paidAmount = 0.0,
                    balanceAmount = total,
                    status = if (total <= 0.0) "Paid" else "Unpaid"
                )
            ) {
                select()
            }.decodeSingle<InvoiceRow>()
        }

        val invoiceId = requireNotNull(invoice.id) { "Invoice was saved without an id." }
        val items = deliveries.map {
            InvoiceItemInsert(
                invoiceId = invoiceId,
                deliveryId = it.id,
                productName = productsById[it.productId]?.name,
                deliveryDate = it.deliveryDate,
                quantity = it.quantity,
                unitPrice = it.unitPrice,
                totalAmount = it.totalAmount
            )
        }
        if (items.isNotEmpty()) {
            loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICE_ITEMS, "insert invoice items", invoiceItemPayloadKeys) {
                supabase.from(SupabaseTables.INVOICE_ITEMS).insert(items)
            }
            deliveryRepository.updateDeliveryPaymentStatus(deliveries.mapNotNull { it.id }, "Billed")
        }
        return invoice
    }

    suspend fun markInvoicePaid(invoiceId: String, paidAmount: Double): InvoiceRow {
        val adminId = requireAdminId("mark invoice paid", setOf("paid_amount", "balance_amount", "status"))
        val invoice = loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "select invoice for payment") {
            supabase.from(SupabaseTables.INVOICES).select {
                filter {
                    eq("id", invoiceId)
                    eq("admin_id", adminId)
                }
            }.decodeSingle<InvoiceRow>()
        }
        val paid = paidAmount.coerceAtLeast(0.0).coerceAtMost(invoice.totalAmount)
        val balance = (invoice.totalAmount - paid).coerceAtLeast(0.0)
        val status = when {
            balance <= 0.0 -> "Paid"
            paid > 0.0 -> "Partial"
            else -> "Unpaid"
        }
        val updated = loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "update invoice payment status", setOf("paid_amount", "balance_amount", "status")) {
            supabase.from(SupabaseTables.INVOICES).update(
                {
                    set("paid_amount", paid)
                    set("balance_amount", balance)
                    set("status", status)
                }
            ) {
                filter {
                    eq("id", invoiceId)
                    eq("admin_id", adminId)
                }
                select()
            }
                .decodeSingle<InvoiceRow>()
        }
        if (status == "Paid") {
            markInvoiceDeliveriesPaid(invoiceId)
        }
        return updated
    }

    private suspend fun requireAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireAdminId(SupabaseTables.INVOICES, operation, payloadKeys)

    private fun invoiceNumber(customerId: String, billingMonth: String): String {
        val stamp = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).format(Date())
        return "DF-${billingMonth.replace("-", "")}-${customerId.take(6).uppercase(Locale.US)}-$stamp"
    }

    private suspend fun previousBalanceForCustomer(customerId: String, billingMonth: String, openingBalance: Double): Double {
        val previousInvoices = loggedSupabaseCall("BillingError", SupabaseTables.INVOICES, "select previous balances") {
            val adminId = requireAdminId("select previous balances")
            supabase.from(SupabaseTables.INVOICES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("customer_id", customerId)
                    neq("status", "Paid")
                }
            }.decodeList<InvoiceRow>()
        }
        return openingBalance + previousInvoices
            .filter { it.billingMonth < billingMonth }
            .sumOf { it.balanceAmount }
    }

    private suspend fun markInvoiceDeliveriesPaid(invoiceId: String) {
        val items = loggedSupabaseCall("PaymentSaveError", SupabaseTables.INVOICE_ITEMS, "select invoice items") {
            supabase.from(SupabaseTables.INVOICE_ITEMS).select {
                filter { eq("invoice_id", invoiceId) }
            }.decodeList<InvoiceItem>()
        }
        deliveryRepository.updateDeliveryPaymentStatus(items.mapNotNull { it.deliveryId }, "Paid")
    }

    private fun InvoiceRow.toBillingRecord(totalQuantity: Double = 0.0, rate: Double = 0.0): BillingRecord {
        val parts = billingMonth.split("-")
        val year = parts.getOrNull(0)?.toIntOrNull() ?: 1970
        val month = parts.getOrNull(1)?.toIntOrNull() ?: 1
        return BillingRecord(
            id = id,
            invoiceNumber = invoiceNumber,
            customerId = customerId,
            month = month,
            year = year,
            totalQuantity = totalQuantity,
            rate = rate,
            totalAmount = totalAmount,
            paidAmount = paidAmount,
            dueAmount = balanceAmount,
            billStatus = when (status.lowercase(Locale.US)) {
                "paid" -> BillStatus.PAID
                "partial" -> BillStatus.PARTIAL
                else -> BillStatus.UNPAID
            },
            generatedAt = createdAt
        )
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
