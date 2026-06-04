package com.example.dairyflow.ui.customer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.CustomersViewModel

@Composable
fun AddCustomerScreen(viewModel: CustomersViewModel, onSaved: () -> Unit, onBack: () -> Unit) {
    val saveState by viewModel.saveState.collectAsState()
    val routes by viewModel.routes.collectAsState()
    LaunchedEffect(Unit) { viewModel.loadRoutes() }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Add Customer", style = MaterialTheme.typography.headlineSmall)
        CustomerFormCard(
            editing = null,
            routes = routes.data.orEmpty(),
            onSave = { customer -> viewModel.save(customer, onSaved) },
            onClear = onBack,
            primaryLabel = "Save Customer",
            secondaryLabel = "Cancel"
        )
        saveState.error?.let { ErrorState(it) }
        if (saveState.isSaving) LoadingState("Saving customer...")
    }
}
