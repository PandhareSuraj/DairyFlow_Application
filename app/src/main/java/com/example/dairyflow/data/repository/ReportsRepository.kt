package com.example.dairyflow.data.repository

import com.example.dairyflow.data.model.BillStatus
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.DeliveryRecord
import com.example.dairyflow.data.model.Payment

class ReportsRepository(
    private val deliveryRepository: DeliveryRepository,
    private val billingRepository: BillingRepository,
    private val paymentRepository: PaymentRepository
) {
    suspend fun dailyDeliveryReport(date: String): List<DeliveryRecord> =
        deliveryRepository.getDeliveriesForDate(date)

    suspend fun monthlyBillingReport(month: Int, year: Int): List<BillingRecord> =
        billingRepository.getBills().filter { it.month == month && it.year == year }

    suspend fun pendingPaymentReport(): List<BillingRecord> =
        billingRepository.getBills().filter { it.billStatus != BillStatus.PAID }

    suspend fun paymentHistory(): List<Payment> =
        paymentRepository.getPayments()
}
