package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.ProductRow
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.ProductRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SaveState(
    val isSaving: Boolean = false,
    val message: String? = null,
    val error: String? = null
)

class ProductViewModel(private val repository: ProductRepository) : ViewModel() {
    private val _state = MutableStateFlow(UiState<List<ProductRow>>())
    val state: StateFlow<UiState<List<ProductRow>>> = _state.asStateFlow()

    private val _saveState = MutableStateFlow(SaveState())
    val saveState: StateFlow<SaveState> = _saveState.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching { repository.getProducts() }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(error = "Unable to load products.") }
        )
    }

    fun addProduct(
        name: String,
        category: String,
        unit: String,
        price: Double,
        stockQuantity: Double,
        description: String?,
        status: String,
        onSaved: () -> Unit
    ) = viewModelScope.launch {
        _saveState.value = SaveState(isSaving = true)
        runCatching {
            repository.addProduct(
                repository.productPayload(name, category, unit, price, stockQuantity, description, status)
            )
        }.fold(
            onSuccess = {
                _saveState.value = SaveState(message = "Product saved.")
                load()
                onSaved()
            },
            onFailure = {
                Log.e("ProductSaveError", "Failed to save product.", it)
                _saveState.value = SaveState(
                    error = it.userFacingSaveError("Unable to save product. Please try again.")
                )
            }
        )
    }
}
