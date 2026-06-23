package com.example.dairyflow.data.repository

import android.util.Log
import com.example.dairyflow.core.SupabaseModule
import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.AdminCustomer
import com.example.dairyflow.data.model.AdminCustomerHold
import com.example.dairyflow.data.model.AdminDashboardStats
import com.example.dairyflow.data.model.AdminDataBundle
import com.example.dairyflow.data.model.AdminDelivery
import com.example.dairyflow.data.model.AdminDeliveryBoy
import com.example.dairyflow.data.model.AdminDeliveryShift
import com.example.dairyflow.data.model.AdminDeliveryStatus
import com.example.dairyflow.data.model.AdminPayment
import com.example.dairyflow.data.model.AdminPaymentMethod
import com.example.dairyflow.data.model.AdminProfile
import com.example.dairyflow.data.model.AdminRole
import com.example.dairyflow.data.model.AdminRoute
import com.example.dairyflow.data.model.CustomerHoldRow
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.CustomerUpsert
import com.example.dairyflow.data.model.DeliveryBoyRow
import com.example.dairyflow.data.model.DeliveryBoyDailyMilkRow
import com.example.dairyflow.data.model.DeliveryBoyCalendarDay
import com.example.dairyflow.data.model.DeliveryBoyDailyPerformanceDetails
import com.example.dairyflow.data.model.DeliveryBoyDailyStock
import com.example.dairyflow.data.model.DeliveryBoyDailyStockRow
import com.example.dairyflow.data.model.DeliveryBoyDailyStockUpsert
import com.example.dairyflow.data.model.DeliveryBoyMilkBreakdown
import com.example.dairyflow.data.model.DeliveryBoyPaymentCollection
import com.example.dairyflow.data.model.DeliveryBoyPaymentEntry
import com.example.dairyflow.data.model.DeliveryBoyPaymentSummary
import com.example.dairyflow.data.model.DeliveryBoyPerformance
import com.example.dairyflow.data.model.DeliveryBoyPerformanceSummary
import com.example.dairyflow.data.model.DeliveryBoyUpsert
import com.example.dairyflow.data.model.DeliveryDayCompletionRow
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.DeliveryUpsert
import com.example.dairyflow.data.model.Invoice
import com.example.dairyflow.data.model.InvoiceGenerationResult
import com.example.dairyflow.data.model.InvoiceItemInsert
import com.example.dairyflow.data.model.InvoiceRow
import com.example.dairyflow.data.model.InvoiceStatus
import com.example.dairyflow.data.model.InvoiceUpsert
import com.example.dairyflow.data.model.PaymentInsert
import com.example.dairyflow.data.model.PaymentCollectionFilter
import com.example.dairyflow.data.model.PaymentRow
import com.example.dairyflow.data.model.Product
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.data.model.ProductType
import com.example.dairyflow.data.model.ProductUnit
import com.example.dairyflow.data.model.ProductUpsert
import com.example.dairyflow.data.model.ProfileRow
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.RouteUpsert
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class AdminRepository(private val supabase: SupabaseClient) {
    private val client = HttpClient(Android) {
        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 30_000
        }
    }
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    suspend fun dashboardStats(today: String, month: Int, year: Int): AdminDashboardStats {
        val data = loadAdminData(today)
        val monthKey = "%04d-%02d".format(year, month)
        val monthInvoices = data.invoices.filter { it.billingKey == monthKey }
        return AdminDashboardStats(
            totalProducts = data.products.size,
            totalCustomers = data.customers.size,
            totalDeliveryBoys = data.deliveryBoys.size,
            todayDeliveries = data.deliveries.count { it.deliveryDate == today },
            pendingBills = data.invoices.count { it.invoiceStatus != InvoiceStatus.PAID },
            monthlyRevenue = monthInvoices.sumOf { it.paidAmount },
            previousPendingAmount = monthInvoices.sumOf { it.previousPendingAmount },
            totalCollectedAmount = data.payments.filterNot { it.isAdvancePayment }.sumOf { it.amount },
            totalUnpaidCustomers = data.invoices.filter { it.pendingAmount > 0.0 }.map { it.customerId }.distinct().size
        )
    }

    suspend fun loadAdminData(deliveryDate: String? = null): AdminDataBundle {
        val adminId = requireUserId()
        val deliveries = safeList {
            if (deliveryDate == null) {
                supabase.from(SupabaseTables.DELIVERIES).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<DeliveryRow>()
            } else {
                supabase.from(SupabaseTables.DELIVERIES).select {
                    filter {
                        eq("admin_id", adminId)
                        eq("delivery_date", deliveryDate)
                    }
                }.decodeList<DeliveryRow>()
            }
        }

        return AdminDataBundle(
            products = safeList {
                supabase.from(SupabaseTables.PRODUCTS).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<ProductRow>()
            }.map { it.toAdminProduct() },
            customers = safeList {
                supabase.from(SupabaseTables.CUSTOMERS).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<CustomerRow>()
            }.map { it.toAdminCustomer() },
            deliveryBoys = safeList {
                supabase.from(SupabaseTables.DELIVERY_BOYS).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<DeliveryBoyRow>()
            }.map { it.toAdminDeliveryBoy() },
            routes = safeList {
                supabase.from(SupabaseTables.ROUTES).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<RouteRow>()
            }.map { it.toAdminRoute() },
            deliveries = deliveries.map { it.toAdminDelivery() },
            invoices = safeList {
                supabase.from(SupabaseTables.INVOICES).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<InvoiceRow>()
            }.map { it.toAdminInvoice() },
            payments = safeList {
                supabase.from(SupabaseTables.PAYMENTS).select {
                    filter { eq("admin_id", adminId) }
                }.decodeList<PaymentRow>()
            }.map { it.toAdminPayment() },
            profiles = safeList {
                supabase.from(SupabaseTables.PROFILES).select {
                    filter {
                        eq("admin_id", adminId)
                    }
                }.decodeList<ProfileRow>()
            }.map { it.toAdminProfile() },
            customerHolds = safeList {
                supabase.from(SupabaseTables.CUSTOMER_HOLDS).select {
                    filter {
                        eq("status", "active")
                    }
                }.decodeList<CustomerHoldRow>()
            }.map { it.toAdminCustomerHold() }
        )
    }

    suspend fun loadAdminDataStrict(deliveryDate: String? = null): AdminDataBundle {
        val adminId = requireUserId()
        val deliveries = if (deliveryDate == null) {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<DeliveryRow>()
        } else {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("delivery_date", deliveryDate)
                }
            }.decodeList<DeliveryRow>()
        }
        return AdminDataBundle(
            products = supabase.from(SupabaseTables.PRODUCTS).select { filter { eq("admin_id", adminId) } }.decodeList<ProductRow>().map { it.toAdminProduct() },
            customers = supabase.from(SupabaseTables.CUSTOMERS).select { filter { eq("admin_id", adminId) } }.decodeList<CustomerRow>().map { it.toAdminCustomer() },
            deliveryBoys = supabase.from(SupabaseTables.DELIVERY_BOYS).select { filter { eq("admin_id", adminId) } }.decodeList<DeliveryBoyRow>().map { it.toAdminDeliveryBoy() },
            routes = supabase.from(SupabaseTables.ROUTES).select { filter { eq("admin_id", adminId) } }.decodeList<RouteRow>().map { it.toAdminRoute() },
            deliveries = deliveries.map { it.toAdminDelivery() },
            invoices = supabase.from(SupabaseTables.INVOICES).select { filter { eq("admin_id", adminId) } }.decodeList<InvoiceRow>().map { it.toAdminInvoice() },
            payments = supabase.from(SupabaseTables.PAYMENTS).select { filter { eq("admin_id", adminId) } }.decodeList<PaymentRow>().map { it.toAdminPayment() },
            profiles = supabase.from(SupabaseTables.PROFILES).select { filter { eq("admin_id", adminId) } }.decodeList<ProfileRow>().map { it.toAdminProfile() },
            customerHolds = supabase.from(SupabaseTables.CUSTOMER_HOLDS).select {
                filter {
                    eq("status", "active")
                }
            }.decodeList<CustomerHoldRow>().map { it.toAdminCustomerHold() }
        )
    }

    suspend fun loadDeliveriesBetween(start: String, end: String): List<AdminDelivery> {
        val adminId = requireUserId()
        return loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select delivery date range") {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    gte("delivery_date", start)
                    lte("delivery_date", end)
                }
            }.decodeList<DeliveryRow>().map { it.toAdminPerformanceDelivery() }
        }
    }

    suspend fun loadDeliveryBoyPerformance(
        deliveryBoyId: String,
        month: String,
        routeId: String?
    ): DeliveryBoyPerformance {
        val adminId = requireUserId()
        val start = "$month-01"
        val end = monthEnd(month)
        val bundle = loadAdminData(null)
        val productsById = bundle.products.mapNotNull { product -> product.id?.let { it to product } }.toMap()
        val customersById = bundle.customers.mapNotNull { customer -> customer.id?.let { it to customer } }.toMap()
        val rows = loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select delivery boy monthly performance") {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("delivery_boy_id", deliveryBoyId)
                    gte("delivery_date", start)
                    lte("delivery_date", end)
                    if (!routeId.isNullOrBlank()) eq("route_id", routeId)
                }
            }.decodeList<DeliveryRow>().map { it.toAdminPerformanceDelivery() }
        }
        val deliveredRows = rows.filter { it.status == AdminDeliveryStatus.DELIVERED }
        val summary = DeliveryBoyPerformanceSummary(
            totalDeliveries = rows.size,
            deliveredDeliveries = rows.count { it.status == AdminDeliveryStatus.DELIVERED },
            skippedDeliveries = rows.count { it.status == AdminDeliveryStatus.SKIPPED },
            pendingDeliveries = rows.count { it.status == AdminDeliveryStatus.PENDING },
            cowMilkLiters = deliveredRows.filter { it.isCowMilk(productsById, customersById) }.sumOf { it.quantity },
            buffaloMilkLiters = deliveredRows.filter { it.isBuffaloMilk(productsById, customersById) }.sumOf { it.quantity }
        )
        val chartRows = deliveredRows
            .groupBy { it.deliveryDate }
            .map { (date, deliveries) ->
                DeliveryBoyDailyMilkRow(
                    date = date,
                    cowMilkLiters = deliveries.filter { it.isCowMilk(productsById, customersById) }.sumOf { it.quantity },
                    buffaloMilkLiters = deliveries.filter { it.isBuffaloMilk(productsById, customersById) }.sumOf { it.quantity }
                )
            }
            .sortedBy { it.date }
        val completionRows = loadCompletionRows(deliveryBoyId, start, end)
        return DeliveryBoyPerformance(
            deliveryBoy = bundle.deliveryBoys.firstOrNull { it.id == deliveryBoyId },
            routes = bundle.routes,
            selectedMonth = month,
            selectedRouteId = routeId,
            summary = summary,
            chartRows = chartRows,
            calendarDays = buildCalendarDays(month, rows, completionRows)
        )
    }

    suspend fun loadDeliveryBoyDailyPerformanceDetails(
        deliveryBoyId: String,
        date: String
    ): DeliveryBoyDailyPerformanceDetails {
        val adminId = requireUserId()
        val bundle = loadAdminData(null)
        val productsById = bundle.products.mapNotNull { product -> product.id?.let { it to product } }.toMap()
        val customersById = bundle.customers.mapNotNull { customer -> customer.id?.let { it to customer } }.toMap()
        val rows = loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "select delivery boy daily performance") {
            supabase.from(SupabaseTables.DELIVERIES).select {
                filter {
                    eq("admin_id", adminId)
                    eq("delivery_boy_id", deliveryBoyId)
                    eq("delivery_date", date)
                }
            }.decodeList<DeliveryRow>().map { it.toAdminPerformanceDelivery() }
        }
        val stockRow = loadStockRows(deliveryBoyId, date, date).firstOrNull()
        val deliveredRows = rows.filter { it.status == AdminDeliveryStatus.DELIVERED }
        val delivered = DeliveryBoyMilkBreakdown(
            cowMilkLiters = deliveredRows.filter { it.isCowMilk(productsById, customersById) }.sumOf { it.quantity },
            buffaloMilkLiters = deliveredRows.filter { it.isBuffaloMilk(productsById, customersById) }.sumOf { it.quantity }
        )
        return DeliveryBoyDailyPerformanceDetails(
            deliveryBoy = bundle.deliveryBoys.firstOrNull { it.id == deliveryBoyId },
            date = date,
            stock = stockRow?.toDailyStock() ?: DeliveryBoyDailyStock(date = date),
            delivered = delivered,
            hasTakenMilk = stockRow != null
        )
    }

    suspend fun saveDeliveryBoyTakenMilk(
        deliveryBoyId: String,
        date: String,
        cowMilkTakenLiters: Double,
        buffaloMilkTakenLiters: Double,
        notes: String?
    ) {
        require(cowMilkTakenLiters >= 0.0) { "Cow milk taken cannot be negative." }
        require(buffaloMilkTakenLiters >= 0.0) { "Buffalo milk taken cannot be negative." }
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERY_BOY_DAILY_STOCK, "upsert delivery boy daily stock") {
            supabase.from(SupabaseTables.DELIVERY_BOY_DAILY_STOCK).upsert(
                DeliveryBoyDailyStockUpsert(
                    deliveryBoyId = deliveryBoyId,
                    stockDate = date,
                    cowMilkTakenLiters = cowMilkTakenLiters,
                    buffaloMilkTakenLiters = buffaloMilkTakenLiters,
                    notes = notes?.takeIf { it.isNotBlank() }
                )
            ) {
                onConflict = "delivery_boy_id,stock_date"
            }
        }
    }

    suspend fun loadDeliveryBoyPaymentCollection(
        deliveryBoyId: String,
        filter: PaymentCollectionFilter,
        startDate: String,
        endDate: String
    ): DeliveryBoyPaymentCollection {
        val adminId = requireUserId()
        val bundle = loadAdminData(null)
        val effectiveStart = when (filter) {
            PaymentCollectionFilter.TODAY -> today()
            PaymentCollectionFilter.THIS_MONTH -> today().take(7) + "-01"
            PaymentCollectionFilter.CUSTOM -> startDate.ifBlank { today() }
        }
        val effectiveEnd = when (filter) {
            PaymentCollectionFilter.TODAY -> today()
            PaymentCollectionFilter.THIS_MONTH -> monthEnd(today().take(7))
            PaymentCollectionFilter.CUSTOM -> endDate.ifBlank { effectiveStart }
        }
        val rows = loggedSupabaseCall("PaymentSaveError", SupabaseTables.PAYMENTS, "select delivery boy payment collection") {
            supabase.from(SupabaseTables.PAYMENTS).select {
                filter {
                    eq("admin_id", adminId)
                    eq("collected_by", deliveryBoyId)
                    gte("payment_date", effectiveStart)
                    lte("payment_date", effectiveEnd)
                }
            }.decodeList<PaymentRow>().map { it.toAdminPayment() }
        }.filterNot { it.isAdvancePayment }
        val customersById = bundle.customers.mapNotNull { customer -> customer.id?.let { it to customer } }.toMap()
        val invoicesById = bundle.invoices.mapNotNull { invoice -> invoice.id?.let { it to invoice } }.toMap()
        val deliveryBoyName = bundle.deliveryBoys.firstOrNull { it.id == deliveryBoyId }?.name ?: "Delivery boy"
        fun List<AdminPayment>.sumByMethod(method: AdminPaymentMethod): Double =
            filter { it.paymentMethod == method }.sumOf { it.amount }
        val summary = DeliveryBoyPaymentSummary(
            totalCollectedAmount = rows.sumOf { it.amount },
            cashCollected = rows.sumByMethod(AdminPaymentMethod.CASH),
            upiCollected = rows.sumByMethod(AdminPaymentMethod.UPI),
            bankTransferCollected = rows.sumByMethod(AdminPaymentMethod.BANK_TRANSFER),
            entryCount = rows.size
        )
        return DeliveryBoyPaymentCollection(
            deliveryBoy = bundle.deliveryBoys.firstOrNull { it.id == deliveryBoyId },
            filter = filter,
            startDate = effectiveStart,
            endDate = effectiveEnd,
            summary = summary,
            entries = rows.sortedByDescending { it.createdAt ?: it.paymentDate }.map { payment ->
                DeliveryBoyPaymentEntry(
                    customerName = customersById[payment.customerId]?.fullName ?: "Customer",
                    invoiceNumber = invoicesById[payment.invoiceId]?.invoiceNumber,
                    amount = payment.amount,
                    paymentMode = payment.paymentMethod,
                    collectedAt = payment.createdAt ?: payment.paymentDate,
                    collectedByName = deliveryBoyName
                )
            }
        )
    }

    private suspend fun <T> safeList(block: suspend () -> List<T>): List<T> =
        runCatching { block() }
            .onFailure { Log.e("BillingError", "Failed to load admin data from new schema", it) }
            .getOrDefault(emptyList())

    suspend fun upsertProduct(product: Product) {
        val adminId = requireUserId()
        val payload = ProductUpsert(
            adminId = adminId,
            name = product.productName,
            category = product.productType.toCategory(),
            unit = product.unit.toUnitText(),
            price = product.pricePerUnit,
            stockQuantity = product.stockQuantity,
            description = null,
            status = if (product.isActive) "active" else "inactive"
        )
        if (product.id == null) {
            loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "insert admin product") {
                supabase.from(SupabaseTables.PRODUCTS).insert(payload)
            }
        } else {
            loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "update admin product") {
                supabase.from(SupabaseTables.PRODUCTS).update(payload) {
                    filter {
                        eq("id", product.id)
                        eq("admin_id", adminId)
                    }
                }
            }
        }
    }

    suspend fun deleteProduct(id: String) {
        val adminId = requireUserId()
        loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "delete admin product") {
            supabase.from(SupabaseTables.PRODUCTS).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun upsertCustomer(customer: AdminCustomer) {
        val adminId = requireUserId()
        val quantity = customer.dailyQuantity.takeIf { it > 0.0 } ?: (customer.morningQuantity + customer.eveningQuantity)
        val payload = CustomerUpsert(
            adminId = adminId,
            routeId = customer.routeId,
            fullName = customer.fullName,
            phone = customer.mobileNumber.orEmpty(),
            email = null,
            address = customer.address,
            area = customer.area,
            dailyQuantity = quantity,
            morningQuantity = customer.morningQuantity,
            eveningQuantity = customer.eveningQuantity,
            milkType = "Cow",
            pricePerLiter = customer.rate,
            deliveryTime = deliveryTime(customer.morningQuantity, customer.eveningQuantity),
            status = if (customer.isActive) "active" else "inactive",
            openingBalance = customer.openingPendingBalance,
            notes = null
        )
        if (customer.id == null) {
            loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "insert admin customer") {
                supabase.from(SupabaseTables.CUSTOMERS).insert(payload)
            }
        } else {
            loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "update admin customer") {
                supabase.from(SupabaseTables.CUSTOMERS).update(payload) {
                    filter {
                        eq("id", customer.id)
                        eq("admin_id", adminId)
                    }
                }
            }
        }
    }

    suspend fun deleteCustomer(id: String) {
        val adminId = requireUserId()
        loggedSupabaseCall("CustomerSaveError", SupabaseTables.CUSTOMERS, "delete admin customer") {
            supabase.from(SupabaseTables.CUSTOMERS).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun upsertRoute(route: AdminRoute) {
        val adminId = requireUserId()
        val payload = RouteUpsert(
            adminId = adminId,
            routeName = route.routeName,
            area = route.area,
            description = route.area,
            status = if (route.isActive) "active" else "inactive"
        )
        if (route.id == null) {
            loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "insert admin route") {
                supabase.from(SupabaseTables.ROUTES).insert(payload)
            }
        } else {
            loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "update admin route") {
                supabase.from(SupabaseTables.ROUTES).update(payload) {
                    filter {
                        eq("id", route.id)
                        eq("admin_id", adminId)
                    }
                }
            }
        }
    }

    suspend fun deleteRoute(id: String) {
        val adminId = requireUserId()
        loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "delete admin route") {
            supabase.from(SupabaseTables.ROUTES).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun upsertDeliveryBoy(deliveryBoy: AdminDeliveryBoy) {
        createDeliveryBoyAccount(deliveryBoy)
    }

    private suspend fun createDeliveryBoyAccount(deliveryBoy: AdminDeliveryBoy) {
        val fullName = deliveryBoy.name.trim()
        val email = deliveryBoy.email?.trim().orEmpty()
        if (fullName.isBlank()) {
            throw IllegalStateException("Delivery boy name is required.")
        }
        if (email.isBlank()) {
            throw IllegalStateException("Delivery boy email / login ID is required for QR login.")
        }
        val session = supabase.auth.currentSessionOrNull()
            ?: throw IllegalStateException("Admin login is required. Please sign in again.")
        val response = client.post("${SupabaseModule.functionsUrl}/create-delivery-boy-account") {
            contentType(ContentType.Application.Json)
            header("apikey", SupabaseModule.anonKey)
            header(HttpHeaders.Authorization, "Bearer ${session.accessToken}")
            setBody(
                json.encodeToString(
                    CreateDeliveryBoyAccountRequest.serializer(),
                    CreateDeliveryBoyAccountRequest(
                        deliveryBoyId = deliveryBoy.id,
                        fullName = fullName,
                        email = email,
                        phone = deliveryBoy.mobileNumber,
                        assignedRouteId = deliveryBoy.assignedRouteId,
                        active = deliveryBoy.isActive
                    )
                )
            )
        }
        val body = response.bodyAsText()
        val result = runCatching {
            json.decodeFromString(CreateDeliveryBoyAccountResponse.serializer(), body)
        }.getOrNull()
        if (!response.status.isSuccess() || result?.success == false) {
            val message = result?.message ?: body
            if (response.status.value == 404 || message.contains("Requested function was not found", ignoreCase = true)) {
                supabase.postgrest.rpc(
                    "admin_upsert_delivery_boy_account",
                    UpsertDeliveryBoyAccountParams(
                        deliveryBoyId = deliveryBoy.id,
                        fullName = fullName,
                        email = email,
                        phone = deliveryBoy.mobileNumber,
                        assignedRouteId = deliveryBoy.assignedRouteId,
                        active = deliveryBoy.isActive
                    )
                ).decodeSingle<UpsertDeliveryBoyAccountResponse>()
                return
            }
            throw IllegalStateException(
                message.ifBlank { "Unable to create delivery boy account." }
            )
        }
        if (result?.success != true) {
            throw IllegalStateException("Unable to create delivery boy account.")
        }
    }

    suspend fun deleteDeliveryBoy(id: String) {
        val adminId = requireUserId()
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERY_BOYS, "delete admin delivery boy") {
            supabase.from(SupabaseTables.DELIVERY_BOYS).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun upsertProfile(profile: AdminProfile) {
        loggedSupabaseCall("BillingError", SupabaseTables.PROFILES, "update profile") {
            supabase.from(SupabaseTables.PROFILES).update(
                {
                    set("role", profile.role.toColumnValue())
                    set("status", if (profile.isActive) "active" else "inactive")
                }
            ) {
                filter { eq("id", profile.id) }
            }
        }
    }

    suspend fun saveDelivery(delivery: AdminDelivery) {
        val adminId = requireUserId()
        val quantity = delivery.quantity.coerceAtLeast(0.0)
        val payload = DeliveryUpsert(
            adminId = adminId,
            customerId = delivery.customerId,
            productId = delivery.productId,
            routeId = delivery.routeId,
            deliveryBoyId = delivery.deliveryBoyId,
            deliveryDate = delivery.deliveryDate,
            deliveryTime = delivery.deliveryShift.toDeliveryTime(),
            quantity = quantity,
            unitPrice = delivery.unitPrice,
            totalAmount = quantity * delivery.unitPrice,
            deliveryStatus = delivery.status.toStatusText(),
            paymentStatus = "Unpaid",
            skipReason = delivery.skipReason,
            notes = delivery.notes
        )
        if (delivery.id == null) {
            loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "insert admin delivery") {
                supabase.from(SupabaseTables.DELIVERIES).insert(payload)
            }
        } else {
            loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "update admin delivery") {
                supabase.from(SupabaseTables.DELIVERIES).update(payload) {
                    filter {
                        eq("id", delivery.id)
                        eq("admin_id", adminId)
                    }
                }
            }
        }
    }

    suspend fun skipDelivery(delivery: AdminDelivery, reason: String?) {
        val id = requireNotNull(delivery.id) { "Delivery id is required to skip a delivery." }
        val adminId = requireUserId()
        loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "skip delivery") {
            supabase.from(SupabaseTables.DELIVERIES).update(
                {
                    set("delivery_status", "Skipped")
                    set("skip_reason", reason)
                    set("notes", reason)
                    set("quantity", 0.0)
                    set("total_amount", 0.0)
                }
            ) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    suspend fun createDailyDeliveries(date: String, routeId: String? = null): Int {
        requireUserId()
        return loggedSupabaseCall("DeliverySaveError", SupabaseTables.DELIVERIES, "generate today deliveries") {
            supabase.postgrest.rpc(
                "generate_today_deliveries",
                GenerateTodayDeliveriesParams(
                    deliveryDate = date,
                    routeId = routeId?.takeIf { it.isNotBlank() }
                )
            ).decodeSingle<Int>()
        }
    }

    suspend fun generateMonthlyInvoices(month: Int, year: Int, customerId: String? = null, routeId: String? = null): InvoiceGenerationResult {
        val customers = fetchActiveCustomers(customerId, routeId)
        val billingMonth = "%04d-%02d".format(year, month)
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
                        eq("billing_month", billingMonth)
                    }
                }.decodeList<InvoiceRow>().isNotEmpty()
                if (duplicate) {
                    skipped++
                    messages += "${customer.fullName}: invoice already exists"
                    return@runCatching
                }

                val deliveries = fetchDeliveredUnpaidDeliveries(id, billingMonth)
                val subtotal = deliveries.sumOf { it.totalAmount }
                val previousBalance = fetchPreviousPending(id, billingMonth) + customer.openingBalance
                val total = subtotal + previousBalance
                val invoice = insertInvoice(id, billingMonth, subtotal, previousBalance, total)
                val invoiceId = requireNotNull(invoice.id) { "Invoice was saved without an id." }
                insertInvoiceItems(invoiceId, deliveries)
                updateDeliveryPaymentStatus(deliveries.mapNotNull { it.id }, "Billed")
                created++
                messages += "${customer.fullName}: generated"
            }.onFailure {
                Log.e("InvoiceSaveError", "Failed to generate admin invoice for customer $id", it)
                failed++
                messages += "${customer.fullName}: ${it.message ?: "failed"}"
            }
        }

        return InvoiceGenerationResult(created, skipped, failed, messages)
    }

    suspend fun addPayment(payment: AdminPayment) {
        val adminId = requireUserId()
        require(payment.amount > 0.0) { "Payment amount must be positive." }
        loggedSupabaseCall("PaymentSaveError", SupabaseTables.PAYMENTS, "insert admin payment") {
            supabase.from(SupabaseTables.PAYMENTS).insert(
                PaymentInsert(
                    adminId = adminId,
                    invoiceId = payment.invoiceId.ifBlank { null },
                    customerId = payment.customerId,
                    amount = payment.amount,
                    paymentDate = payment.paymentDate.ifBlank { today() },
                    paymentType = payment.paymentType,
                    paymentMethod = payment.paymentMethod.toColumnValue(),
                    notes = listOfNotNull(
                        payment.notes?.takeIf { it.isNotBlank() },
                        payment.transactionId?.takeIf { it.isNotBlank() }?.let { "Transaction ID: $it" }
                    ).joinToString(" | ").takeIf { it.isNotBlank() }
                )
            )
        }
        updateInvoiceTotals(payment.invoiceId)
    }

    suspend fun markInvoicePaid(invoice: Invoice) {
        val amount = invoice.pendingAmount.coerceAtLeast(0.0)
        val invoiceId = invoice.id ?: return
        if (amount <= 0.0) return
        addPayment(
            AdminPayment(
                invoiceId = invoiceId,
                customerId = invoice.customerId,
                amount = amount,
                paymentMethod = AdminPaymentMethod.CASH,
                paymentDate = today(),
                notes = "Marked paid by admin"
            )
        )
    }

    private suspend fun updateInvoiceTotals(invoiceId: String) {
        if (invoiceId.isBlank()) return
        val adminId = requireUserId()
        val invoice = supabase.from(SupabaseTables.INVOICES).select {
            filter {
                eq("id", invoiceId)
                eq("admin_id", adminId)
            }
        }.decodeSingle<InvoiceRow>()
        val paid = supabase.from(SupabaseTables.PAYMENTS).select {
            filter {
                eq("admin_id", adminId)
                eq("invoice_id", invoiceId)
            }
        }.decodeList<PaymentRow>()
            .filterNot { it.paymentType.equals("advance", ignoreCase = true) }
            .sumOf { it.amount }
        val balance = (invoice.totalAmount - paid).coerceAtLeast(0.0)
        val status = when {
            balance <= 0.0 -> "Paid"
            paid > 0.0 -> "Partial"
            else -> "Unpaid"
        }
        loggedSupabaseCall("PaymentSaveError", SupabaseTables.INVOICES, "update invoice totals after admin payment") {
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
            }
        }
        if (status == "Paid") {
            val deliveryIds = supabase.from(SupabaseTables.INVOICE_ITEMS).select {
                filter { eq("invoice_id", invoiceId) }
            }.decodeList<com.example.dairyflow.data.model.InvoiceItem>().mapNotNull { it.deliveryId }
            updateDeliveryPaymentStatus(deliveryIds, "Paid")
        }
    }

    private suspend fun fetchActiveCustomers(customerId: String?, routeId: String?): List<CustomerRow> {
        val adminId = requireUserId()
        return supabase.from(SupabaseTables.CUSTOMERS).select {
            filter {
                eq("admin_id", adminId)
                eq("status", "active")
                if (customerId != null) eq("id", customerId)
                if (routeId != null) eq("route_id", routeId)
            }
        }.decodeList<CustomerRow>()
    }

    private suspend fun fetchDeliveredUnpaidDeliveries(customerId: String, billingMonth: String): List<DeliveryRow> {
        val adminId = requireUserId()
        val start = "$billingMonth-01"
        val end = monthEnd(billingMonth)
        val holds = fetchActiveHoldRows(adminId, start, end)
        return supabase.from(SupabaseTables.DELIVERIES).select {
            filter {
                eq("admin_id", adminId)
                eq("customer_id", customerId)
                eq("delivery_status", "Delivered")
                eq("payment_status", "Unpaid")
                gte("delivery_date", start)
                lte("delivery_date", end)
            }
        }.decodeList<DeliveryRow>()
            .filterNot { delivery -> holds.any { it.customerId == delivery.customerId && it.includes(delivery.deliveryDate) } }
    }

    private suspend fun fetchActiveHoldRows(adminId: String, start: String, end: String): List<CustomerHoldRow> =
        supabase.from(SupabaseTables.CUSTOMER_HOLDS).select {
            filter {
                eq("status", "active")
                gte("hold_date", start)
                lte("hold_date", end)
            }
        }.decodeList<CustomerHoldRow>()

    private suspend fun fetchPreviousPending(customerId: String, billingMonth: String): Double {
        val adminId = requireUserId()
        return supabase.from(SupabaseTables.INVOICES).select {
            filter {
                eq("admin_id", adminId)
                eq("customer_id", customerId)
                neq("status", "Paid")
            }
        }.decodeList<InvoiceRow>()
            .filter { it.billingMonth < billingMonth }
            .sumOf { it.balanceAmount }
    }

    private suspend fun insertInvoice(
        customerId: String,
        billingMonth: String,
        subtotal: Double,
        previousBalance: Double,
        total: Double
    ): InvoiceRow {
        val adminId = requireUserId()
        return loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICES, "insert admin invoice") {
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
    }

    private suspend fun insertInvoiceItems(invoiceId: String, deliveries: List<DeliveryRow>) {
        if (deliveries.isEmpty()) return
        val adminId = requireUserId()
        val products = supabase.from(SupabaseTables.PRODUCTS).select {
            filter { eq("admin_id", adminId) }
        }.decodeList<ProductRow>().associateBy { it.id }
        val items = deliveries.map {
            InvoiceItemInsert(
                invoiceId = invoiceId,
                deliveryId = it.id,
                productName = products[it.productId]?.name,
                deliveryDate = it.deliveryDate,
                quantity = it.quantity,
                unitPrice = it.unitPrice,
                totalAmount = it.totalAmount
            )
        }
        loggedSupabaseCall("InvoiceSaveError", SupabaseTables.INVOICE_ITEMS, "insert admin invoice items") {
            supabase.from(SupabaseTables.INVOICE_ITEMS).insert(items)
        }
    }

    private suspend fun updateDeliveryPaymentStatus(deliveryIds: List<String>, paymentStatus: String) {
        if (deliveryIds.isEmpty()) return
        val adminId = requireUserId()
        deliveryIds.forEach { id ->
            loggedSupabaseCall("BillingError", SupabaseTables.DELIVERIES, "update admin delivery payment status") {
                supabase.from(SupabaseTables.DELIVERIES).update(
                    {
                        set("payment_status", paymentStatus)
                    }
                ) {
                    filter {
                        eq("id", id)
                        eq("admin_id", adminId)
                    }
                }
            }
        }
    }

    private suspend fun loadStockRows(deliveryBoyId: String, start: String, end: String): List<DeliveryBoyDailyStockRow> =
        runCatching {
            supabase.from(SupabaseTables.DELIVERY_BOY_DAILY_STOCK).select {
                filter {
                    eq("delivery_boy_id", deliveryBoyId)
                    gte("stock_date", start)
                    lte("stock_date", end)
                }
            }.decodeList<DeliveryBoyDailyStockRow>()
        }.getOrElse {
            Log.w("DeliverySaveError", "Daily stock table is not available yet.", it)
            emptyList()
        }

    private suspend fun loadCompletionRows(deliveryBoyId: String, start: String, end: String): List<DeliveryDayCompletionRow> =
        runCatching {
            supabase.from(SupabaseTables.DELIVERY_DAY_COMPLETION).select {
                filter {
                    eq("delivery_boy_id", deliveryBoyId)
                    gte("completion_date", start)
                    lte("completion_date", end)
                }
            }.decodeList<DeliveryDayCompletionRow>()
        }.getOrElse {
            Log.w("DeliverySaveError", "Delivery completion table is not available yet.", it)
            emptyList()
        }

    private fun buildCalendarDays(
        month: String,
        deliveries: List<AdminDelivery>,
        completions: List<DeliveryDayCompletionRow>
    ): List<DeliveryBoyCalendarDay> {
        val parts = month.split("-")
        val year = parts.getOrNull(0)?.toIntOrNull() ?: return emptyList()
        val monthNumber = parts.getOrNull(1)?.toIntOrNull() ?: return emptyList()
        val calendar = Calendar.getInstance(Locale.US).apply {
            clear()
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, monthNumber - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }
        val maxDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
        val today = today()
        val deliveriesByDate = deliveries.groupBy { it.deliveryDate }
        val completedDates = completions
            .filter {
                it.status.equals("completed", ignoreCase = true) ||
                    it.status.equals("partial", ignoreCase = true)
            }
            .map { it.completionDate }
            .toSet()
        return (1..maxDay).map { day ->
            val date = "%04d-%02d-%02d".format(year, monthNumber, day)
            val rows = deliveriesByDate[date].orEmpty()
            val completedByTimestamp = rows.any { it.deliveryCompletedAt != null }
            val completedByFinalStatus = rows.isNotEmpty() &&
                rows.none { it.status == AdminDeliveryStatus.PENDING } &&
                rows.any { it.status == AdminDeliveryStatus.DELIVERED || it.status == AdminDeliveryStatus.SKIPPED }
            DeliveryBoyCalendarDay(
                date = date,
                dayOfMonth = day,
                hasDelivery = rows.isNotEmpty(),
                isCompleted = date in completedDates || completedByTimestamp || completedByFinalStatus,
                skippedCount = rows.count { it.status == AdminDeliveryStatus.SKIPPED },
                deliveredCount = rows.count { it.status == AdminDeliveryStatus.DELIVERED },
                pendingCount = rows.count { it.status == AdminDeliveryStatus.PENDING },
                isFuture = date > today
            )
        }
    }

    private suspend fun requireUserId(): String =
        supabase.requireAdminId()

    private val Invoice.billingKey: String
        get() = "%04d-%02d".format(billingYear, billingMonth)

    private fun ProductRow.toAdminProduct(): Product =
        Product(
            id = id,
            productName = name,
            category = category,
            productType = category.toProductType(),
            unit = unit.toProductUnit(),
            pricePerUnit = price,
            stockQuantity = stockQuantity,
            isActive = status.equals("active", ignoreCase = true),
            createdAt = createdAt
        )

    private fun CustomerRow.toAdminCustomer(): AdminCustomer =
        AdminCustomer(
            id = id,
            fullName = fullName,
            mobileNumber = phone,
            address = address,
            area = area,
            routeId = routeId,
            defaultProductId = productId,
            productCategory = productCategory,
            milkType = milkType,
            dailyQuantity = dailyQuantity,
            morningQuantity = morningQuantity.takeIf { it > 0.0 }
                ?: if (deliveryTime.equals("Evening", ignoreCase = true)) 0.0 else dailyQuantity,
            eveningQuantity = eveningQuantity.takeIf { it > 0.0 }
                ?: if (deliveryTime.equals("Evening", ignoreCase = true)) dailyQuantity else 0.0,
            rate = pricePerLiter,
            isActive = status.equals("active", ignoreCase = true),
            openingPendingBalance = openingBalance,
            createdAt = createdAt
        )

    private fun CustomerHoldRow.toAdminCustomerHold(): AdminCustomerHold =
        AdminCustomerHold(
            id = id,
            customerId = customerId,
            startDate = holdDate,
            endDate = holdDate,
            reason = reason,
            status = status,
            createdAt = createdAt
        )

    private fun DeliveryRow.toAdminDelivery(): AdminDelivery =
        AdminDelivery(
            id = id,
            customerId = customerId,
            productId = productId.orEmpty(),
            deliveryBoyId = deliveryBoyId,
            routeId = routeId,
            deliveryDate = deliveryDate,
            deliveryShift = if (deliveryTime.equals("Evening", ignoreCase = true)) AdminDeliveryShift.EVENING else AdminDeliveryShift.MORNING,
            quantity = quantity,
            unitPrice = unitPrice,
            totalAmount = totalAmount,
            status = (deliveryBoyStatus ?: deliveryStatus).toAdminDeliveryStatus(),
            skipReason = skipReason,
            notes = notes,
            deliveryCompletedAt = deliveryCompletedAt,
            createdAt = createdAt,
            updatedAt = updatedAt
        )

    private fun DeliveryRow.toAdminPerformanceDelivery(): AdminDelivery =
        AdminDelivery(
            id = id,
            customerId = customerId,
            productId = productId.orEmpty(),
            deliveryBoyId = deliveryBoyId,
            routeId = routeId,
            deliveryDate = deliveryDate,
            deliveryShift = if (deliveryTime.equals("Evening", ignoreCase = true)) AdminDeliveryShift.EVENING else AdminDeliveryShift.MORNING,
            quantity = quantity,
            unitPrice = unitPrice,
            totalAmount = totalAmount,
            status = deliveryStatus.toAdminDeliveryStatus(),
            skipReason = skipReason,
            notes = notes,
            deliveryCompletedAt = deliveryCompletedAt,
            createdAt = createdAt,
            updatedAt = updatedAt
        )

    private fun InvoiceRow.toAdminInvoice(): Invoice {
        val parts = billingMonth.split("-")
        return Invoice(
            id = id,
            invoiceNumber = invoiceNumber,
            customerId = customerId,
            billingYear = parts.getOrNull(0)?.toIntOrNull() ?: 1970,
            billingMonth = parts.getOrNull(1)?.toIntOrNull() ?: 1,
            monthlyDeliveryAmount = subtotal,
            previousPendingAmount = previousBalance,
            totalBillAmount = totalAmount,
            paidAmount = paidAmount,
            pendingAmount = balanceAmount,
            invoiceStatus = status.toInvoiceStatus(),
            generatedDate = createdAt,
            dueDate = null,
            notes = null
        )
    }

    private fun PaymentRow.toAdminPayment(): AdminPayment =
        AdminPayment(
            id = id,
            invoiceId = invoiceId.orEmpty(),
            customerId = customerId,
            collectedBy = collectedBy,
            amount = amount,
            paymentType = paymentType ?: "regular",
            paymentMethod = paymentMethod.toAdminPaymentMethod(),
            transactionId = transactionId,
            paymentDate = paymentDate,
            notes = notes,
            createdAt = createdAt
        )

    private fun DeliveryBoyDailyStockRow.toDailyStock(): DeliveryBoyDailyStock =
        DeliveryBoyDailyStock(
            date = stockDate,
            cowMilkTakenLiters = cowMilkTakenLiters,
            buffaloMilkTakenLiters = buffaloMilkTakenLiters,
            notes = notes
        )

    private fun ProfileRow.toAdminProfile(): AdminProfile =
        AdminProfile(
            id = id,
            adminId = adminId,
            adminAccessCode = adminAccessCode,
            fullName = fullName,
            email = email,
            phone = phone,
            role = role.toAdminRole(),
            isActive = status.equals("active", ignoreCase = true),
            permissions = emptyList(),
            deliveryBoyId = deliveryBoyId,
            createdAt = createdAt
        )

    private fun DeliveryBoyRow.toAdminDeliveryBoy(): AdminDeliveryBoy =
        AdminDeliveryBoy(
            id = id,
            profileId = profileId,
            name = displayName,
            mobileNumber = phone,
            email = email,
            assignedRouteId = routeId,
            isActive = status.equals("active", ignoreCase = true),
            createdAt = createdAt
        )

    private fun RouteRow.toAdminRoute(): AdminRoute =
        AdminRoute(
            id = id,
            routeName = displayName,
            area = area ?: description,
            isActive = status.equals("active", ignoreCase = true),
            createdAt = createdAt
        )

    private fun ProductType.toCategory(): String =
        name.lowercase(Locale.US).replaceFirstChar { it.titlecase(Locale.US) }

    private fun ProductUnit.toUnitText(): String =
        when (this) {
            ProductUnit.KG -> "Kg"
            ProductUnit.PACKET -> "Packet"
            ProductUnit.LITER -> "Liter"
        }

    private fun String.toProductType(): ProductType =
        ProductType.entries.firstOrNull { it.name.equals(this, ignoreCase = true) } ?: ProductType.OTHER

    private fun String.toProductUnit(): ProductUnit =
        when {
            equals("kg", ignoreCase = true) -> ProductUnit.KG
            equals("packet", ignoreCase = true) -> ProductUnit.PACKET
            else -> ProductUnit.LITER
        }

    private fun AdminDeliveryShift.toDeliveryTime(): String =
        if (this == AdminDeliveryShift.EVENING) "Evening" else "Morning"

    private fun AdminDeliveryStatus.toStatusText(): String =
        name.lowercase(Locale.US).replaceFirstChar { it.titlecase(Locale.US) }

    private fun String.toAdminDeliveryStatus(): AdminDeliveryStatus =
        AdminDeliveryStatus.entries.firstOrNull { it.name.equals(this, ignoreCase = true) } ?: AdminDeliveryStatus.PENDING

    private fun String.toInvoiceStatus(): InvoiceStatus =
        InvoiceStatus.entries.firstOrNull { it.name.equals(this, ignoreCase = true) } ?: InvoiceStatus.UNPAID

    private fun AdminPaymentMethod.toColumnValue(): String =
        name.lowercase(Locale.US).replaceFirstChar { it.titlecase(Locale.US) }

    private fun String.toAdminPaymentMethod(): AdminPaymentMethod =
        AdminPaymentMethod.entries.firstOrNull { it.name.equals(this, ignoreCase = true) } ?: AdminPaymentMethod.CASH

    private fun AdminRole.toColumnValue(): String =
        name.lowercase(Locale.US)

    private fun String.toAdminRole(): AdminRole =
        AdminRole.entries.firstOrNull { it.name.equals(replace('-', '_'), ignoreCase = true) } ?: AdminRole.CUSTOMER

    private fun AdminDelivery.isCowMilk(
        productsById: Map<String, Product>,
        customersById: Map<String, AdminCustomer>
    ): Boolean {
        val product = productsById[productId]
        val customer = customersById[customerId]
        val text = milkSignal(product, customer)
        return text.contains("cow", ignoreCase = true) || !text.contains("buffalo", ignoreCase = true)
    }

    private fun AdminDelivery.isBuffaloMilk(
        productsById: Map<String, Product>,
        customersById: Map<String, AdminCustomer>
    ): Boolean {
        val product = productsById[productId]
        val customer = customersById[customerId]
        val text = milkSignal(product, customer)
        return text.contains("buffalo", ignoreCase = true)
    }

    private fun milkSignal(product: Product?, customer: AdminCustomer?): String =
        listOfNotNull(
            product?.category,
            product?.productName,
            product?.productType?.name,
            customer?.productCategory,
            customer?.milkType
        ).joinToString(" ")

    private fun deliveryTime(morning: Double, evening: Double): String =
        when {
            morning > 0.0 && evening > 0.0 -> "Both"
            evening > 0.0 -> "Evening"
            else -> "Morning"
        }

    private fun invoiceNumber(customerId: String, billingMonth: String): String {
        val stamp = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).format(Calendar.getInstance().time)
        return "DF-${billingMonth.replace("-", "")}-${customerId.take(6).uppercase(Locale.US)}-$stamp"
    }

    private fun monthEnd(billingMonth: String): String {
        val parts = billingMonth.split("-")
        val year = parts[0].toInt()
        val month = parts[1].toInt()
        val calendar = Calendar.getInstance(Locale.US)
        calendar.set(year, month - 1, 1)
        val day = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
        return "%04d-%02d-%02d".format(year, month, day)
    }

    private fun today(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

    private fun CustomerHoldRow.includes(date: String): Boolean =
        status.equals("active", ignoreCase = true) && date == holdDate
}

@Serializable
private data class GenerateTodayDeliveriesParams(
    @SerialName("p_delivery_date") val deliveryDate: String,
    @SerialName("p_route_id") val routeId: String? = null
)

@Serializable
private data class CreateDeliveryBoyAccountRequest(
    @SerialName("delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("full_name") val fullName: String,
    val email: String,
    val phone: String? = null,
    @SerialName("assigned_route_id") val assignedRouteId: String? = null,
    val active: Boolean = true
)

@Serializable
private data class CreateDeliveryBoyAccountResponse(
    val success: Boolean = false,
    val message: String? = null
)

@Serializable
private data class UpsertDeliveryBoyAccountParams(
    @SerialName("p_delivery_boy_id") val deliveryBoyId: String? = null,
    @SerialName("p_full_name") val fullName: String,
    @SerialName("p_email") val email: String,
    @SerialName("p_phone") val phone: String? = null,
    @SerialName("p_assigned_route_id") val assignedRouteId: String? = null,
    @SerialName("p_active") val active: Boolean = true
)

@Serializable
private data class UpsertDeliveryBoyAccountResponse(
    @SerialName("delivery_boy_id") val deliveryBoyId: String,
    @SerialName("profile_id") val profileId: String
)
