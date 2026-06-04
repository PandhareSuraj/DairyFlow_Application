package com.example.dairyflow.data.repository

import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.ProfileDetails
import com.example.dairyflow.data.model.ProfileRow
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from

class ProfileRepository(
    private val supabase: SupabaseClient,
    private val secureSessionStore: SecureSessionStore
) {
    fun cachedProfile(): ProfileDetails? = secureSessionStore.loadProfile()

    suspend fun currentProfile(): ProfileDetails? {
        val user = supabase.auth.currentUserOrNull() ?: return secureSessionStore.loadProfile()
        return loggedSupabaseCall("ProfileLoadError", SupabaseTables.PROFILES, "select current profile") {
            supabase.from(SupabaseTables.PROFILES).select {
                filter { eq("id", user.id) }
            }.decodeSingle<ProfileDetails>().also { secureSessionStore.saveProfile(it) }
        }
    }

    suspend fun adminProfiles(): List<ProfileRow> {
        val adminId = supabase.requireAdminId(SupabaseTables.PROFILES, "select admin profiles")
        return loggedSupabaseCall("ProfileLoadError", SupabaseTables.PROFILES, "select admin profiles") {
            supabase.from(SupabaseTables.PROFILES).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<ProfileRow>()
        }
    }
}
