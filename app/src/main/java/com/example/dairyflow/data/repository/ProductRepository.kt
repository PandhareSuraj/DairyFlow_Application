package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.data.model.ProductUpsert
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class ProductRepository(private val supabase: SupabaseClient) {
    private val productPayloadKeys = setOf(
        "admin_id",
        "name",
        "category",
        "unit",
        "price",
        "stock_quantity",
        "description",
        "status"
    )

    suspend fun getProducts(): List<ProductRow> =
        loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "select products") {
            val adminId = requireTenantAdminId("select products")
            supabase.from(SupabaseTables.PRODUCTS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<ProductRow>()
        }

    suspend fun addProduct(product: ProductUpsert): ProductRow =
        loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "insert product", productPayloadKeys) {
            supabase.from(SupabaseTables.PRODUCTS).insert(product.copy(adminId = requireTenantAdminId("insert product", productPayloadKeys))) {
                select()
            }.decodeSingle<ProductRow>()
        }

    suspend fun updateProduct(id: String, product: ProductUpsert): ProductRow {
        val adminId = requireTenantAdminId("update product", productPayloadKeys)
        return loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "update product", productPayloadKeys) {
            supabase.from(SupabaseTables.PRODUCTS).update(product.copy(adminId = adminId)) {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
                select()
            }
                .decodeSingle<ProductRow>()
        }
    }

    suspend fun deleteProduct(id: String) {
        val adminId = requireTenantAdminId("delete product")
        loggedSupabaseCall("ProductSaveError", SupabaseTables.PRODUCTS, "delete product") {
            supabase.from(SupabaseTables.PRODUCTS).delete {
                filter {
                    eq("id", id)
                    eq("admin_id", adminId)
                }
            }
        }
    }

    fun productPayload(
        name: String,
        category: String,
        unit: String,
        price: Double,
        stockQuantity: Double,
        description: String?,
        status: String
    ): ProductUpsert = ProductUpsert(
        adminId = "",
        name = name,
        category = category,
        unit = unit,
        price = price,
        stockQuantity = stockQuantity,
        description = description,
        status = status
    )

    private suspend fun requireTenantAdminId(operation: String, payloadKeys: Set<String> = emptySet()): String =
        supabase.requireAdminId(SupabaseTables.PRODUCTS, operation, payloadKeys)
}
