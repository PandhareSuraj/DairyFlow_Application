package com.example.dairyflow.ui.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.EmptyState
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.common.PaddedList
import com.example.dairyflow.ui.common.ScreenColumn
import com.example.dairyflow.ui.common.SectionTitle
import com.example.dairyflow.ui.viewmodel.ReportsViewModel

@Composable
fun ReportsScreen(viewModel: ReportsViewModel) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    ScreenColumn("Reports") {
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(state.error ?: "Error", viewModel::load)
            state.data == null -> EmptyState("No report data available.")
            else -> PaddedList {
                item {
                    SectionTitle("Daily delivery")
                }
                if (state.data?.deliveries.isNullOrEmpty()) {
                    item { EmptyState("No deliveries today.") }
                } else {
                    items(state.data?.deliveries.orEmpty()) { item ->
                        ReportCard("Customer ${item.customerId}", "${item.shift.name.lowercase()} ${item.quantity + item.extraQuantity} L")
                    }
                }
                item {
                    SectionTitle("Monthly billing")
                }
                if (state.data?.monthlyBills.isNullOrEmpty()) {
                    item { EmptyState("No monthly bills.") }
                } else {
                    items(state.data?.monthlyBills.orEmpty()) { bill ->
                        ReportCard("Bill ${bill.customerId}", "Rs ${bill.totalAmount}, due Rs ${bill.dueAmount}")
                    }
                }
                item {
                    SectionTitle("Pending payments")
                }
                if (state.data?.pendingBills.isNullOrEmpty()) {
                    item { EmptyState("No pending payments.") }
                } else {
                    items(state.data?.pendingBills.orEmpty()) { bill ->
                        ReportCard("Customer ${bill.customerId}", "Due Rs ${bill.dueAmount}")
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportCard(title: String, subtitle: String) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title)
            Text(subtitle)
        }
    }
}
