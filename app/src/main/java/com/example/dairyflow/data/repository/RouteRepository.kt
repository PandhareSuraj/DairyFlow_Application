package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.Route
import com.example.dairyflow.data.model.RouteRow
import com.example.dairyflow.data.model.RouteUpsert
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class RouteRepository(private val supabase: SupabaseClient) {
    private val routePayloadKeys = setOf(
        "admin_id",
        "route_name",
        "area",
        "description",
        "status"
    )

    suspend fun getRoutes(): List<Route> =
        getRouteRows().map { it.toRoute() }

    suspend fun getRouteRows(): List<RouteRow> =
        loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "select routes") {
            val adminId = requireAdminId("select routes")
            supabase.from(SupabaseTables.ROUTES).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<RouteRow>()
        }

    suspend fun addRoute(route: RouteUpsert): RouteRow =
        loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "insert route", routePayloadKeys) {
            supabase.from(SupabaseTables.ROUTES).insert(route.copy(adminId = requireAdminId("insert route", routePayloadKeys))) {
                select()
            }.decodeSingle<RouteRow>()
        }

    suspend fun updateRoute(id: String, route: RouteUpsert): RouteRow {
        val adminId = requireAdminId("update route", routePayloadKeys)
        return loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "update route", routePayloadKeys) {
            supabase.from(SupabaseTables.ROUTES).update(route.copy(adminId = adminId)) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
                select()
            }.decodeSingle<RouteRow>()
        }
    }

    suspend fun deleteRoute(id: String) {
        val adminId = requireAdminId("delete route")
        loggedSupabaseCall("RouteSaveError", SupabaseTables.ROUTES, "delete route") {
            supabase.from(SupabaseTables.ROUTES).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    fun routePayload(
        routeName: String,
        area: String?,
        description: String?,
        status: String
    ): RouteUpsert = RouteUpsert(
        adminId = "",
        routeName = routeName,
        area = area,
        description = description,
        status = status
    )

    private suspend fun requireAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireAdminId(SupabaseTables.ROUTES, operation, payloadKeys)

    private fun RouteRow.toRoute(): Route =
        Route(
            id = id,
            adminId = adminId,
            name = displayName,
            area = area,
            description = description,
            isActive = status.equals("active", ignoreCase = true)
        )
}
