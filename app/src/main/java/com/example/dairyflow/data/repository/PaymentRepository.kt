package com.example.dairyflow.data.repository

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.example.dairyflow.core.SupabaseTables
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.Payment
import com.example.dairyflow.data.model.PaymentMethod
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

class PaymentRepository(
    private val supabase: SupabaseClient,
    private val billingRepository: BillingRepository,
    private val razorpayGateway: RazorpayGateway
) {
    suspend fun getPayments(): List<Payment> =
        supabase.from(SupabaseTables.PAYMENTS).select().decodeList<Payment>()

    suspend fun recordPayment(bill: BillingRecord, amount: Double, method: PaymentMethod, transactionId: String?, notes: String?) {
        val billId = requireNotNull(bill.id) { "Bill id is required for payment." }
        val payment = Payment(
            customerId = bill.customerId,
            billingRecordId = billId,
            amount = amount,
            method = method,
            transactionId = transactionId,
            notes = notes
        )
        supabase.from(SupabaseTables.PAYMENTS).insert(payment)
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
