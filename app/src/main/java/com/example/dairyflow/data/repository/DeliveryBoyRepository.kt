package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.CustomerRow
import com.example.dairyflow.data.model.DeliveryBoy
import com.example.dairyflow.data.model.DeliveryBoyRow
import com.example.dairyflow.data.model.DeliveryBoyUpsert
import com.example.dairyflow.data.model.DeliveryRow
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.TodayDeliveryViewRow
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class DeliveryBoyRepository(private val supabase: SupabaseClient) {
    private val deliveryBoyPayloadKeys = setOf(
        "admin_id",
        "profile_id",
        "full_name",
        "phone",
        "email",
        "assigned_route_id",
        "status"
    )

    suspend fun getDeliveryBoys(): List<DeliveryBoy> =
        getDeliveryBoyRows().map { it.toDeliveryBoy() }

    suspend fun getDeliveryBoyRows(): List<DeliveryBoyRow> =
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERY_BOYS, "select delivery boys") {
            val adminId = requireAdminId("select delivery boys")
            supabase.from(SupabaseTables.DELIVERY_BOYS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<DeliveryBoyRow>()
        }

    suspend fun addDeliveryBoy(deliveryBoy: DeliveryBoyUpsert): DeliveryBoyRow =
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERY_BOYS, "insert delivery boy", deliveryBoyPayloadKeys) {
            supabase.from(SupabaseTables.DELIVERY_BOYS).insert(
                deliveryBoy.copy(adminId = requireAdminId("insert delivery boy", deliveryBoyPayloadKeys))
            ) {
                select()
            }.decodeSingle<DeliveryBoyRow>()
        }

    suspend fun updateDeliveryBoy(id: String, deliveryBoy: DeliveryBoyUpsert): DeliveryBoyRow {
        val adminId = requireAdminId("update delivery boy", deliveryBoyPayloadKeys)
        return loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERY_BOYS, "update delivery boy", deliveryBoyPayloadKeys) {
            supabase.from(SupabaseTables.DELIVERY_BOYS).update(deliveryBoy.copy(adminId = adminId)) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
                select()
            }.decodeSingle<DeliveryBoyRow>()
        }
    }

    suspend fun deleteDeliveryBoy(id: String) {
        val adminId = requireAdminId("delete delivery boy")
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERY_BOYS, "delete delivery boy") {
            supabase.from(SupabaseTables.DELIVERY_BOYS).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    fun deliveryBoyPayload(
        fullName: String,
        phone: String?,
        email: String?,
        routeId: String?,
        status: String,
        profileId: String? = null
    ): DeliveryBoyUpsert = DeliveryBoyUpsert(
        adminId = "",
        profileId = profileId,
        fullName = fullName,
        phone = phone,
        email = email,
        routeId = routeId,
        status = status
    )

    suspend fun getTodayDeliveriesForCurrentDeliveryBoy(): List<DeliveryRow> {
        val context = requireCurrentDeliveryBoyContext("select today's deliveries")
        return loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERIES, "select today's deliveries") {
            supabase.from(SupabaseTables.TODAY_DELIVERY_VIEW).select {
                filter {
                    eq("admin_id", context.adminId)
                    eq("delivery_boy_id", context.deliveryBoy.id.orEmpty())
                    eq("delivery_date", today())
                    context.deliveryBoy.routeId?.let { eq("route_id", it) }
                }
            }.decodeList<TodayDeliveryViewRow>().map { it.toDeliveryRow() }
        }
    }

    suspend fun getAssignedRouteForCurrentDeliveryBoy(): RouteRow? {
        val context = requireCurrentDeliveryBoyContext("select assigned route")
        val routeId = context.deliveryBoy.routeId ?: return null
        return loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.ROUTES, "select assigned route") {
            supabase.from(SupabaseTables.ROUTES).select {
                filter {
                    eq("admin_id", context.adminId)
                    eq("id", routeId)
                }
            }.decodeList<RouteRow>().firstOrNull()
        }
    }

    suspend fun getRouteCustomersForCurrentDeliveryBoy(): List<CustomerRow> {
        val context = requireCurrentDeliveryBoyContext("select assigned route customers")
        val routeId = context.deliveryBoy.routeId ?: return emptyList()
        return loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.CUSTOMERS, "select assigned route customers") {
            supabase.from(SupabaseTables.CUSTOMERS).select {
                filter {
                    eq("admin_id", context.adminId)
                    eq("route_id", routeId)
                    eq("status", "active")
                }
            }.decodeList<CustomerRow>()
        }
    }

    suspend fun markTodayDelivered(deliveryId: String): DeliveryRow =
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERIES, "mark today delivered") {
            requireCurrentDeliveryBoyContext("mark today delivered")
            supabase.postgrest.rpc(
                "delivery_boy_update_today_delivery",
                DeliveryBoyUpdateTodayDeliveryParams(
                    deliveryId = deliveryId,
                    deliveryStatus = "Delivered",
                    skipReason = null
                )
            ).decodeSingle<DeliveryRow>()
        }

    suspend fun skipTodayDelivery(deliveryId: String, reason: String): DeliveryRow =
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERIES, "skip today delivery") {
            requireCurrentDeliveryBoyContext("skip today delivery")
            supabase.postgrest.rpc(
                "delivery_boy_update_today_delivery",
                DeliveryBoyUpdateTodayDeliveryParams(
                    deliveryId = deliveryId,
                    deliveryStatus = "Skipped",
                    skipReason = reason.ifBlank { "Skipped by delivery boy" }
                )
            ).decodeSingle<DeliveryRow>()
        }

    suspend fun markTodayPaymentStatus(deliveryId: String, paid: Boolean): DeliveryRow =
        loggedSupabaseCall("DeliveryBoySaveError", SupabaseTables.DELIVERIES, "mark today payment status") {
            requireCurrentDeliveryBoyContext("mark today payment status")
            supabase.postgrest.rpc(
                "delivery_boy_update_today_delivery",
                DeliveryBoyUpdateTodayDeliveryParams(
                    deliveryId = deliveryId,
                    paymentStatus = if (paid) "Paid" else "Unpaid"
                )
            ).decodeSingle<DeliveryRow>()
        }

    private suspend fun requireCurrentDeliveryBoyContext(operation: String): DeliveryBoyContext {
        val profile = supabase.requireDeliveryBoyProfile(SupabaseTables.DELIVERY_BOYS, operation)
        val adminId = profile.adminId.orEmpty()
        val deliveryBoyId = profile.deliveryBoyId.orEmpty()
        val deliveryBoy = supabase.from(SupabaseTables.DELIVERY_BOYS).select {
            filter {
                eq("id", deliveryBoyId)
                eq("admin_id", adminId)
                eq("status", "active")
            }
        }.decodeSingle<DeliveryBoyRow>()
        return DeliveryBoyContext(adminId = adminId, deliveryBoy = deliveryBoy)
    }

    private suspend fun requireAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireAdminId(SupabaseTables.DELIVERY_BOYS, operation, payloadKeys)

    private fun DeliveryBoyRow.toDeliveryBoy(): DeliveryBoy =
        DeliveryBoy(
            id = id,
            adminId = adminId,
            profileId = profileId,
            name = displayName,
            phone = phone,
            email = email,
            routeId = routeId,
            isActive = status.equals("active", ignoreCase = true)
        )

    private fun today(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

    private fun TodayDeliveryViewRow.toDeliveryRow(): DeliveryRow =
        DeliveryRow(
            id = id,
            adminId = adminId,
            customerId = customerId,
            productId = productId,
            routeId = routeId,
            deliveryBoyId = deliveryBoyId,
            deliveryDate = deliveryDate,
            deliveryTime = deliveryTime,
            quantity = quantity,
            unitPrice = unitPrice,
            totalAmount = totalAmount,
            deliveryStatus = deliveryStatus,
            paymentStatus = paymentStatus,
            skipReason = skipReason
        )

    private data class DeliveryBoyContext(
        val adminId: String,
        val deliveryBoy: DeliveryBoyRow
    )
}

@Serializable
private data class DeliveryBoyUpdateTodayDeliveryParams(
    @SerialName("p_delivery_id") val deliveryId: String,
    @SerialName("p_delivery_status") val deliveryStatus: String? = null,
    @SerialName("p_payment_status") val paymentStatus: String? = null,
    @SerialName("p_skip_reason") val skipReason: String? = null
)
