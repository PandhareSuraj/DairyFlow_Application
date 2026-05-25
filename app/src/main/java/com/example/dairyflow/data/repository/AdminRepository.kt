package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.AdminCustomer
import com.example.dairyflow.data.model.AdminDashboardStats
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
import com.example.dairyflow.data.model.AdminDeliveryBoy
import com.example.dairyflow.data.model.AdminDeliveryStatus
import com.example.dairyflow.data.model.AdminPayment
import com.example.dairyflow.data.model.AdminPaymentMethod
import com.example.dairyflow.data.model.AdminProfile
import com.example.dairyflow.data.model.AdminRoute
import com.example.dairyflow.data.model.Invoice
import com.example.dairyflow.data.model.InvoiceGenerationResult
import com.example.dairyflow.data.model.InvoiceStatus
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.core.SupabaseTables
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class AdminRepository(private val supabase: SupabaseClient) {
    suspend fun dashboardStats(today: String, month: Int, year: Int): AdminDashboardStats {
        val data = loadAdminData(today)
        val monthInvoices = data.invoices.filter { it.billingMonth == month && it.billingYear == year }
        return AdminDashboardStats(
            totalProducts = data.products.size,
            totalCustomers = data.customers.size,
            totalDeliveryBoys = data.deliveryBoys.size,
            todayDeliveries = data.deliveries.count { it.deliveryDate == today },
            pendingBills = data.invoices.count { it.invoiceStatus != InvoiceStatus.PAID },
            monthlyRevenue = monthInvoices.sumOf { it.monthlyDeliveryAmount },
            previousPendingAmount = monthInvoices.sumOf { it.previousPendingAmount },
            totalCollectedAmount = data.payments.sumOf { it.amount },
            totalUnpaidCustomers = data.invoices.filter { it.pendingAmount > 0.0 }.map { it.customerId }.distinct().size
        )
    }

    suspend fun loadAdminData(deliveryDate: String? = null): AdminDataBundle {
        val deliveries = if (deliveryDate == null) {
            safeList { supabase.from(SupabaseTables.DELIVERIES).select().decodeList<AdminDelivery>() }
        } else {
            safeList {
                supabase.from(SupabaseTables.DELIVERIES).select {
                    filter { eq("delivery_date", deliveryDate) }
                }.decodeList<AdminDelivery>()
            }
        }
        return AdminDataBundle(
            products = safeList { supabase.from(SupabaseTables.PRODUCTS).select().decodeList<Product>() },
            customers = safeList { supabase.from(SupabaseTables.CUSTOMERS).select().decodeList<AdminCustomer>() },
            deliveryBoys = safeList { supabase.from(SupabaseTables.DELIVERY_BOYS).select().decodeList<AdminDeliveryBoy>() },
            routes = safeList { supabase.from(SupabaseTables.ROUTES).select().decodeList<AdminRoute>() },
            deliveries = deliveries,
            invoices = safeList { supabase.from(SupabaseTables.INVOICES).select().decodeList<Invoice>() },
            payments = safeList { supabase.from(SupabaseTables.PAYMENTS).select().decodeList<AdminPayment>() },
            profiles = safeList { supabase.from(SupabaseTables.PROFILES).select().decodeList<AdminProfile>() }
        )
    }

    private suspend fun <T> safeList(block: suspend () -> List<T>): List<T> =
        runCatching { block() }.getOrDefault(emptyList())

    suspend fun loadAdminDataStrict(deliveryDate: String? = null): AdminDataBundle {
        val deliveries = if (deliveryDate == null) {
            supabase.from(SupabaseTables.DELIVERIES).select().decodeList<AdminDelivery>()
        } else {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter { eq("delivery_date", deliveryDate) }
            }.decodeList<AdminDelivery>()
        }
        return AdminDataBundle(
            products = supabase.from(SupabaseTables.PRODUCTS).select().decodeList<Product>(),
            customers = supabase.from(SupabaseTables.CUSTOMERS).select().decodeList<AdminCustomer>(),
            deliveryBoys = supabase.from(SupabaseTables.DELIVERY_BOYS).select().decodeList<AdminDeliveryBoy>(),
            routes = supabase.from(SupabaseTables.ROUTES).select().decodeList<AdminRoute>(),
            deliveries = deliveries,
            invoices = supabase.from(SupabaseTables.INVOICES).select().decodeList<Invoice>(),
            payments = supabase.from(SupabaseTables.PAYMENTS).select().decodeList<AdminPayment>(),
            profiles = supabase.from(SupabaseTables.PROFILES).select().decodeList<AdminProfile>()
        )
    }

    suspend fun upsertProduct(product: Product) {
        if (product.id == null) {
            supabase.from(SupabaseTables.PRODUCTS).insert(product)
        } else {
            supabase.from(SupabaseTables.PRODUCTS).update(product) { filter { eq("id", product.id) } }
        }
    }

    suspend fun deleteProduct(id: String) {
        supabase.from(SupabaseTables.PRODUCTS).delete { filter { eq("id", id) } }
    }

    suspend fun upsertCustomer(customer: AdminCustomer) {
        if (customer.id == null) {
            supabase.from(SupabaseTables.CUSTOMERS).insert(customer)
        } else {
            supabase.from(SupabaseTables.CUSTOMERS).update(customer) { filter { eq("id", customer.id) } }
        }
    }

    suspend fun deleteCustomer(id: String) {
        supabase.from(SupabaseTables.CUSTOMERS).delete { filter { eq("id", id) } }
    }

    suspend fun upsertDeliveryBoy(deliveryBoy: AdminDeliveryBoy) {
        if (deliveryBoy.id == null) {
            supabase.from(SupabaseTables.DELIVERY_BOYS).insert(deliveryBoy)
        } else {
            supabase.from(SupabaseTables.DELIVERY_BOYS).update(deliveryBoy) { filter { eq("id", deliveryBoy.id) } }
        }
    }

    suspend fun deleteDeliveryBoy(id: String) {
        supabase.from(SupabaseTables.DELIVERY_BOYS).delete { filter { eq("id", id) } }
    }

    suspend fun upsertProfile(profile: AdminProfile) {
        supabase.from(SupabaseTables.PROFILES).update(profile) { filter { eq("id", profile.id) } }
    }

    suspend fun saveDelivery(delivery: AdminDelivery) {
        val calculated = delivery.copy(totalAmount = delivery.quantity * delivery.unitPrice)
        if (calculated.id == null) {
            supabase.from(SupabaseTables.DELIVERIES).insert(calculated)
        } else {
            supabase.from(SupabaseTables.DELIVERIES).update(calculated) { filter { eq("id", calculated.id) } }
        }
    }

    suspend fun skipDelivery(delivery: AdminDelivery, reason: String?) {
        val id = requireNotNull(delivery.id) { "Delivery id is required to skip a delivery." }
        supabase.from(SupabaseTables.DELIVERIES).update(
            {
                set("status", AdminDeliveryStatus.SKIPPED)
                set("skip_reason", reason)
                set("notes", reason)
                set("quantity", 0.0)
                set("total_amount", 0.0)
            }
        ) {
            filter { eq("id", id) }
        }
    }

    suspend fun createDailyDeliveries(date: String, routeId: String? = null): Int {
        val customers = supabase.from(SupabaseTables.CUSTOMERS).select {
            filter {
                eq("is_active", true)
                if (routeId != null) eq("route_id", routeId)
            }
        }.decodeList<AdminCustomer>()
        val products = supabase.from(SupabaseTables.PRODUCTS).select().decodeList<Product>().associateBy { it.id }
        customers.forEach { customer ->
            val productId = customer.defaultProductId ?: return@forEach
            val product = products[productId]
            val unitPrice = customer.rate.takeIf { it > 0.0 } ?: product?.pricePerUnit ?: 0.0
            if (customer.morningQuantity > 0.0) {
                saveDelivery(
                    AdminDelivery(
                        customerId = requireNotNull(customer.id),
                        productId = productId,
                        routeId = customer.routeId,
                        deliveryDate = date,
                        deliveryShift = com.example.dairyflow.data.model.AdminDeliveryShift.MORNING,
                        quantity = customer.morningQuantity,
                        unitPrice = unitPrice
                    )
                )
            }
            if (customer.eveningQuantity > 0.0) {
                saveDelivery(
                    AdminDelivery(
                        customerId = requireNotNull(customer.id),
                        productId = productId,
                        routeId = customer.routeId,
                        deliveryDate = date,
                        deliveryShift = com.example.dairyflow.data.model.AdminDeliveryShift.EVENING,
                        quantity = customer.eveningQuantity,
                        unitPrice = unitPrice
                    )
                )
            }
        }
        return customers.size
    }

    suspend fun generateMonthlyInvoices(month: Int, year: Int, customerId: String? = null, routeId: String? = null): InvoiceGenerationResult {
        val customers = fetchActiveCustomers(customerId, routeId)
        var created = 0
        var skipped = 0
        var failed = 0
        val messages = mutableListOf<String>()

        customers.forEach { customer ->
            val id = customer.id
            if (id == null) {
                failed++
                messages += "${customer.fullName}: missing customer id"
                return@forEach
            }
            runCatching {
                val duplicate = supabase.from(SupabaseTables.INVOICES).select {
                    filter {
                        eq("customer_id", id)
                        eq("billing_month", month)
                        eq("billing_year", year)
                    }
                }.decodeList<Invoice>().isNotEmpty()
                if (duplicate) {
                    skipped++
                    messages += "${customer.fullName}: invoice already exists"
                    return@runCatching
                }

                val deliveryAmount = fetchDeliveredAmount(id, month, year)
                val previousPending = fetchPreviousPending(id, month, year) + customer.openingPendingBalance
                val total = deliveryAmount + previousPending
                val paid = 0.0
                val pending = total - paid
                val invoice = Invoice(
                    invoiceNumber = invoiceNumber(id, month, year),
                    customerId = id,
                    billingMonth = month,
                    billingYear = year,
                    monthlyDeliveryAmount = deliveryAmount,
                    previousPendingAmount = previousPending,
                    totalBillAmount = total,
                    paidAmount = paid,
                    pendingAmount = pending,
                    invoiceStatus = invoiceStatus(paid, pending),
                    generatedDate = today(),
                    dueDate = dueDate(year, month)
                )
                supabase.from(SupabaseTables.INVOICES).insert(invoice)
                created++
                messages += "${customer.fullName}: generated"
            }.onFailure {
                failed++
                messages += "${customer.fullName}: ${it.message ?: "failed"}"
            }
        }

        return InvoiceGenerationResult(created, skipped, failed, messages)
    }

    suspend fun addPayment(payment: AdminPayment) {
        supabase.from(SupabaseTables.PAYMENTS).insert(payment)
        updateInvoiceTotals(payment.invoiceId)
    }

    suspend fun markInvoicePaid(invoice: Invoice) {
        val amount = invoice.pendingAmount.coerceAtLeast(0.0)
        if (amount <= 0.0 || invoice.id == null) return
        addPayment(
            AdminPayment(
                invoiceId = invoice.id,
                customerId = invoice.customerId,
                amount = amount,
                paymentMethod = AdminPaymentMethod.CASH,
                paymentDate = today(),
                notes = "Marked paid by admin"
            )
        )
    }

    private suspend fun updateInvoiceTotals(invoiceId: String) {
        val invoice = supabase.from(SupabaseTables.INVOICES).select {
            filter { eq("id", invoiceId) }
        }.decodeSingle<Invoice>()
        val paid = supabase.from(SupabaseTables.PAYMENTS).select {
            filter { eq("invoice_id", invoiceId) }
        }.decodeList<AdminPayment>().sumOf { it.amount }
        val pending = (invoice.totalBillAmount - paid).coerceAtLeast(0.0)
        supabase.from(SupabaseTables.INVOICES).update(
            {
                set("paid_amount", paid)
                set("pending_amount", pending)
                set("invoice_status", invoiceStatus(paid, pending))
            }
        ) {
            filter { eq("id", invoiceId) }
        }
    }

    private suspend fun fetchActiveCustomers(customerId: String?, routeId: String?): List<AdminCustomer> =
        supabase.from(SupabaseTables.CUSTOMERS).select {
            filter {
                eq("is_active", true)
                if (customerId != null) eq("id", customerId)
                if (routeId != null) eq("route_id", routeId)
            }
        }.decodeList<AdminCustomer>()

    private suspend fun fetchDeliveredAmount(customerId: String, month: Int, year: Int): Double {
        val deliveries = supabase.from(SupabaseTables.DELIVERIES).select {
            filter {
                eq("customer_id", customerId)
                eq("status", AdminDeliveryStatus.DELIVERED)
                gte("delivery_date", monthStart(month, year))
                lte("delivery_date", monthEnd(month, year))
            }
        }.decodeList<AdminDelivery>()
        return deliveries.sumOf { it.totalAmount }
    }

    private suspend fun fetchPreviousPending(customerId: String, month: Int, year: Int): Double =
        supabase.from(SupabaseTables.INVOICES).select {
            filter {
                eq("customer_id", customerId)
                neq("invoice_status", InvoiceStatus.PAID)
            }
        }.decodeList<Invoice>()
            .filter { it.billingYear < year || (it.billingYear == year && it.billingMonth < month) }
            .sumOf { it.pendingAmount }

    private fun invoiceStatus(paid: Double, pending: Double): InvoiceStatus = when {
        pending <= 0.0 -> InvoiceStatus.PAID
        paid > 0.0 -> InvoiceStatus.PARTIAL
        else -> InvoiceStatus.UNPAID
    }

    private fun invoiceNumber(customerId: String, month: Int, year: Int): String =
        "DF-$year-${month.toString().padStart(2, '0')}-${customerId.take(8).uppercase(Locale.US)}"

    private fun monthStart(month: Int, year: Int): String = "%04d-%02d-01".format(year, month)

    private fun monthEnd(month: Int, year: Int): String {
        val calendar = Calendar.getInstance()
        calendar.set(year, month - 1, 1)
        val lastDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
        return "%04d-%02d-%02d".format(year, month, lastDay)
    }

    private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

    private fun dueDate(year: Int, month: Int): String {
        val calendar = Calendar.getInstance()
        calendar.set(year, month - 1, 1)
        calendar.add(Calendar.MONTH, 1)
        calendar.set(Calendar.DAY_OF_MONTH, 10)
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.time)
    }
}
