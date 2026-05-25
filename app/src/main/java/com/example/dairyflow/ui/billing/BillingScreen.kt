package com.example.dairyflow.ui.billing

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
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ActionRow
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.BillingViewModel
import com.example.dairyflow.ui.viewmodel.currentMonth
import com.example.dairyflow.ui.viewmodel.currentYear

@Composable
fun BillingScreen(viewModel: BillingViewModel) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    ScreenColumn("Billing") {
        var customerId by remember(state.data?.customers) { mutableStateOf(state.data?.customers?.firstOrNull()?.id.orEmpty()) }
        var month by remember { mutableStateOf(currentMonth().toString()) }
        var year by remember { mutableStateOf(currentYear().toString()) }

        Card {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Generate monthly bill")
                OutlinedTextField(customerId, { customerId = it }, label = { Text("Customer ID") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.data?.customers.orEmpty().take(3).forEach { customer ->
                        FilterChip(customer.id == customerId, { customerId = customer.id.orEmpty() }, label = { Text(customer.name) })
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(month, { month = it }, label = { Text("Month") }, modifier = Modifier.weight(1f))
                    OutlinedTextField(year, { year = it }, label = { Text("Year") }, modifier = Modifier.weight(1f))
                }
                ActionRow("Calculate bill", {
                    if (customerId.isNotBlank()) viewModel.generate(customerId, month.toIntOrNull() ?: currentMonth(), year.toIntOrNull() ?: currentYear())
                })
            }
        }

        SectionTitle("Customer-wise bills")
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(state.error ?: "Error", viewModel::load)
            state.data?.bills.isNullOrEmpty() -> EmptyState("No bills generated yet.")
            else -> PaddedList {
                items(state.data?.bills.orEmpty(), key = { it.id ?: "${it.customerId}-${it.month}-${it.year}" }) { bill ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Customer ${bill.customerId} - ${bill.month}/${bill.year}")
                            Text("Quantity ${bill.totalQuantity} L x Rs ${bill.rate}")
                            Text("Total Rs ${bill.totalAmount}, Paid Rs ${bill.paidAmount}, Due Rs ${bill.dueAmount}")
                            Text("Status: ${bill.billStatus.name.lowercase()}")
                        }
                    }
                }
            }
        }
    }
}
