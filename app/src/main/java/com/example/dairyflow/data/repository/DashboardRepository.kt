package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.DashboardStats

class DashboardRepository(
    private val adminRepository: AdminRepository
) {
    suspend fun loadStats(today: String): DashboardStats {
        val data = adminRepository.loadAdminData(today)
        val adminStats = adminRepository.dashboardStats(today, currentMonth(), currentYear())
        return DashboardStats(
            totalCustomers = adminStats.totalCustomers,
            totalProducts = adminStats.totalProducts,
            totalDeliveryBoys = adminStats.totalDeliveryBoys,
            todayDelivery = data.deliveries.filter { it.status.name == "DELIVERED" }.sumOf { it.quantity },
            deliveredToday = data.deliveries.count { it.status.name == "DELIVERED" },
            pendingToday = data.deliveries.count { it.status.name == "PENDING" },
            skippedToday = data.deliveries.count { it.status.name == "SKIPPED" },
            pendingBills = adminStats.pendingBills,
            totalCollection = adminStats.totalCollectedAmount,
            monthlyRevenue = adminStats.monthlyRevenue,
            previousPending = adminStats.previousPendingAmount
        )
    }

    private fun currentMonth(): Int = java.util.Calendar.getInstance().get(java.util.Calendar.MONTH) + 1
    private fun currentYear(): Int = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
}
