package com.example.dairyflow.data.repository

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.data.model.PaymentInsert
import com.example.dairyflow.data.model.PaymentMethod
import com.example.dairyflow.data.model.PaymentRow
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class PaymentRepository(
    private val supabase: SupabaseClient,
    private val billingRepository: BillingRepository,
    private val razorpayGateway: RazorpayGateway
) {
    private val paymentPayloadKeys = setOf(
        "admin_id",
        "customer_id",
        "invoice_id",
        "delivery_id",
        "collected_by",
        "amount",
        "payment_date",
        "payment_method",
        "notes"
    )

    suspend fun getPayments(): List<Payment> =
        loggedSupabaseCall("PaymentSaveError", SupabaseTables.PAYMENTS, "select payments") {
            val adminId = supabase.requireAdminId(SupabaseTables.PAYMENTS, "select payments")
            supabase.from(SupabaseTables.PAYMENTS).select {
                filter { eq("admin_id", adminId) }
            }.decodeList<PaymentRow>().map { it.toPayment() }
        }

    suspend fun recordPayment(bill: BillingRecord, amount: Double, method: PaymentMethod, transactionId: String?, notes: String?) {
        val billId = requireNotNull(bill.id) { "Bill id is required for payment." }
        val adminId = supabase.requireAdminId(SupabaseTables.PAYMENTS, "record payment", paymentPayloadKeys)
        require(amount > 0.0) { "Payment amount must be positive." }
        val paymentNotes = listOfNotNull(
            notes?.takeIf { it.isNotBlank() },
            transactionId?.takeIf { it.isNotBlank() }?.let { "Transaction ID: $it" }
        ).joinToString(" | ").takeIf { it.isNotBlank() }
        val payment = PaymentInsert(
            adminId = adminId,
            customerId = bill.customerId,
            invoiceId = billId,
            deliveryId = null,
            collectedBy = null,
            amount = amount,
            paymentDate = today(),
            paymentMethod = method.toColumnValue(),
            notes = paymentNotes
        )
        loggedSupabaseCall("PaymentSaveError", SupabaseTables.PAYMENTS, "insert payment", paymentPayloadKeys) {
            supabase.from(SupabaseTables.PAYMENTS).insert(payment)
        }
        billingRepository.updatePaymentTotals(bill, amount)
    }

    fun createUpiIntent(payeeVpa: String, payeeName: String, amount: Double, transactionNote: String): Intent {
        val uri = Uri.Builder()
            .scheme("upi")
            .authority("pay")
            .appendQueryParameter("pa", payeeVpa)
            .appendQueryParameter("pn", payeeName)
            .appendQueryParameter("am", "%.2f".format(amount))
            .appendQueryParameter("cu", "INR")
            .appendQueryParameter("tn", transactionNote)
            .build()
        return Intent(Intent.ACTION_VIEW, uri)
    }

    suspend fun startOnlinePayment(context: Context, bill: BillingRecord, amount: Double): RazorpayResult =
        razorpayGateway.startPayment(context, bill, amount)

    private fun PaymentRow.toPayment(): Payment =
        Payment(
            id = id,
            adminId = adminId,
            customerId = customerId,
            invoiceId = invoiceId,
            deliveryId = deliveryId,
            collectedBy = collectedBy,
            amount = amount,
            paymentDate = paymentDate,
            paymentMethod = paymentMethod,
            notes = notes,
            createdAt = createdAt,
            updatedAt = updatedAt
        )

    private fun PaymentMethod.toColumnValue(): String =
        when (this) {
            PaymentMethod.CASH -> "Cash"
            PaymentMethod.UPI -> "UPI"
            PaymentMethod.ONLINE -> "Other"
        }

    private fun today(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
}

class RazorpayGateway {
    suspend fun startPayment(context: Context, bill: BillingRecord, amount: Double): RazorpayResult {
        return RazorpayResult.Pending(
            "Razorpay SDK placeholder. Add SDK credentials server-side and return a verified transaction id before recording payment."
        )
    }
}

sealed class RazorpayResult {
    data class Success(val transactionId: String) : RazorpayResult()
    data class Pending(val message: String) : RazorpayResult()
    data class Failed(val message: String) : RazorpayResult()
}
