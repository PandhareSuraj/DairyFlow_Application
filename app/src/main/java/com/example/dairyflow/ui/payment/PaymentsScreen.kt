package com.example.dairyflow.ui.payment

import android.content.ActivityNotFoundException
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.dairyflow.data.model.BillingRecord
import com.example.dairyflow.data.model.PaymentMethod
import com.example.dairyflow.ui.common.ActionRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.PaymentsViewModel

@Composable
fun PaymentsScreen(viewModel: PaymentsViewModel) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    LaunchedEffect(Unit) { viewModel.load() }

    ScreenColumn("Payments") {
        PaymentEntry(state.data?.bills.orEmpty(), onCash = { bill, amount, txn ->
            viewModel.recordPayment(bill, amount, PaymentMethod.CASH, txn, "Manual cash entry")
        }, onUpi = { bill, amount, upi ->
            try {
                context.startActivity(viewModel.upiIntent(upi, "DairyFlow", amount, "Bill ${bill.id.orEmpty()}"))
            } catch (_: ActivityNotFoundException) {
            }
            viewModel.recordPayment(bill, amount, PaymentMethod.UPI, null, "UPI payment initiated")
        }, onOnline = { bill, amount ->
            viewModel.startOnlinePayment(context, bill, amount)
        })

        SectionTitle("Payment history")
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(state.error ?: "Error", viewModel::load)
            state.data?.payments.isNullOrEmpty() -> EmptyState("No payments recorded yet.")
            else -> PaddedList {
                items(state.data?.payments.orEmpty(), key = { it.id ?: "${it.billingRecordId}-${it.amount}" }) { payment ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Rs ${payment.amount} via ${payment.method.name.lowercase()}")
                            Text("Bill ${payment.billingRecordId}")
                            Text("Transaction: ${payment.transactionId ?: "manual"}")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentEntry(
    bills: List<BillingRecord>,
    onCash: (BillingRecord, Double, String?) -> Unit,
    onUpi: (BillingRecord, Double, String) -> Unit,
    onOnline: (BillingRecord, Double) -> Unit
) {
    var billId by remember(bills) { mutableStateOf(bills.firstOrNull { it.dueAmount > 0.0 }?.id.orEmpty()) }
    var amount by remember { mutableStateOf("") }
    var transactionId by remember { mutableStateOf("") }
    var upi by remember { mutableStateOf("") }
    val bill = bills.firstOrNull { it.id == billId }
    val payable = amount.toDoubleOrNull() ?: 0.0

    Card {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Collect payment")
            OutlinedTextField(billId, { billId = it }, label = { Text("Bill ID") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                bills.filter { it.dueAmount > 0.0 }.take(3).forEach { item ->
                    FilterChip(item.id == billId, { billId = item.id.orEmpty() }, label = { Text("Rs ${item.dueAmount}") })
                }
            }
            OutlinedTextField(amount, { amount = it }, label = { Text("Amount") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(transactionId, { transactionId = it }, label = { Text("Transaction ID") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(upi, { upi = it }, label = { Text("UPI ID") }, modifier = Modifier.fillMaxWidth())
            if (bill != null) {
                ActionRow("Cash", { onCash(bill, payable, transactionId.ifBlank { null }) }, "UPI", { onUpi(bill, payable, upi) })
                ActionRow("Online placeholder", { onOnline(bill, payable) })
            }
        }
    }
}
