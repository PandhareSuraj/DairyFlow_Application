package com.example.dairyflow.ui.localization

import android.content.Context
import android.content.res.Configuration
import androidx.annotation.StringRes
import androidx.compose.runtime.compositionLocalOf
import com.example.dairyflow.R
import com.example.dairyflow.data.repository.AppLanguage
import java.util.Locale

data class DairyStrings(
    val profile: String,
    val dashboard: String,
    val adminDashboard: String,
    val deliveryBoyDashboard: String,
    val overview: String,
    val today: String,
    val customers: String,
    val deliveries: String,
    val payments: String,
    val logout: String,
    val signOut: String,
    val refreshProfile: String,
    val refreshProfileSubtitle: String,
    val privacyPolicy: String,
    val privacyPolicySubtitle: String,
    val privacyPolicyBody: String,
    val changeTheme: String,
    val changeLanguage: String,
    val about: String,
    val lightTheme: String,
    val darkTheme: String,
    val systemDefault: String,
    val english: String,
    val marathi: String,
    val hindi: String,
    val manageDailyOperations: String,
    val dailyDeliverySchedule: String,
    val signedInUser: String,
    val noEmail: String,
    val role: String,
    val adminAccessCode: String,
    val linkedAdmin: String,
    val phone: String,
    val appNameLabel: String,
    val versionLabel: String,
    val purposeLabel: String,
    val appPurpose: String,
    val contactSupport: String,
    val ok: String,
    val cancel: String
) {
    companion object
}

val LocalDairyStrings = compositionLocalOf { DairyStrings.fallback }

fun dairyStrings(context: Context, language: AppLanguage): DairyStrings {
    val localizedContext = context.withLocale(language.locale)
    return DairyStrings(
        profile = localizedContext.text(R.string.profile),
        dashboard = localizedContext.text(R.string.dashboard),
        adminDashboard = localizedContext.text(R.string.admin_dashboard),
        deliveryBoyDashboard = localizedContext.text(R.string.delivery_boy_dashboard),
        overview = localizedContext.text(R.string.overview),
        today = localizedContext.text(R.string.today),
        customers = localizedContext.text(R.string.customers),
        deliveries = localizedContext.text(R.string.deliveries),
        payments = localizedContext.text(R.string.payments),
        logout = localizedContext.text(R.string.logout),
        signOut = localizedContext.text(R.string.sign_out),
        refreshProfile = localizedContext.text(R.string.refresh_profile),
        refreshProfileSubtitle = localizedContext.text(R.string.refresh_profile_subtitle),
        privacyPolicy = localizedContext.text(R.string.privacy_policy),
        privacyPolicySubtitle = localizedContext.text(R.string.privacy_policy_subtitle),
        privacyPolicyBody = localizedContext.text(R.string.privacy_policy_body),
        changeTheme = localizedContext.text(R.string.change_theme),
        changeLanguage = localizedContext.text(R.string.change_language),
        about = localizedContext.text(R.string.about),
        lightTheme = localizedContext.text(R.string.light_theme),
        darkTheme = localizedContext.text(R.string.dark_theme),
        systemDefault = localizedContext.text(R.string.system_default),
        english = localizedContext.text(R.string.english),
        marathi = localizedContext.text(R.string.marathi),
        hindi = localizedContext.text(R.string.hindi),
        manageDailyOperations = localizedContext.text(R.string.manage_daily_operations),
        dailyDeliverySchedule = localizedContext.text(R.string.daily_delivery_schedule),
        signedInUser = localizedContext.text(R.string.signed_in_user),
        noEmail = localizedContext.text(R.string.no_email),
        role = localizedContext.text(R.string.role),
        adminAccessCode = localizedContext.text(R.string.admin_access_code),
        linkedAdmin = localizedContext.text(R.string.linked_admin),
        phone = localizedContext.text(R.string.phone),
        appNameLabel = localizedContext.text(R.string.app_name_label),
        versionLabel = localizedContext.text(R.string.version_label),
        purposeLabel = localizedContext.text(R.string.purpose_label),
        appPurpose = localizedContext.text(R.string.app_purpose),
        contactSupport = localizedContext.text(R.string.contact_support),
        ok = localizedContext.text(R.string.ok),
        cancel = localizedContext.text(R.string.cancel)
    )
}

private val AppLanguage.locale: Locale
    get() = Locale.forLanguageTag(storageValue)

private fun Context.withLocale(locale: Locale): Context {
    val configuration = Configuration(resources.configuration)
    configuration.setLocale(locale)
    return createConfigurationContext(configuration)
}

private fun Context.text(@StringRes id: Int): String = getString(id)

private val DairyStrings.Companion.fallback: DairyStrings
    get() = DairyStrings(
        profile = "Profile",
        dashboard = "Dashboard",
        adminDashboard = "Admin Dashboard",
        deliveryBoyDashboard = "Delivery Boy Dashboard",
        overview = "Overview",
        today = "Today",
        customers = "Customers",
        deliveries = "Deliveries",
        payments = "Payments",
        logout = "Logout",
        signOut = "Sign out",
        refreshProfile = "Refresh Profile",
        refreshProfileSubtitle = "Reload your latest account details",
        privacyPolicy = "Privacy Policy",
        privacyPolicySubtitle = "How DairyFlow handles app data",
        privacyPolicyBody = "",
        changeTheme = "Change Theme",
        changeLanguage = "Change Language",
        about = "About",
        lightTheme = "Light Theme",
        darkTheme = "Dark Theme",
        systemDefault = "System Default",
        english = "English",
        marathi = "Marathi",
        hindi = "Hindi",
        manageDailyOperations = "Manage daily operations",
        dailyDeliverySchedule = "Daily customer delivery schedule",
        signedInUser = "Signed in user",
        noEmail = "No email",
        role = "Role",
        adminAccessCode = "Admin access code",
        linkedAdmin = "Linked admin",
        phone = "Phone",
        appNameLabel = "App name",
        versionLabel = "Version",
        purposeLabel = "Purpose",
        appPurpose = "Dairy delivery and billing management app",
        contactSupport = "Support: support@example.com",
        ok = "OK",
        cancel = "Cancel"
    )
