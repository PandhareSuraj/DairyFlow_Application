package com.example.dairyflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.data.model.DashboardStats
import com.example.dairyflow.data.model.UiState
import com.example.dairyflow.data.repository.DashboardRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DashboardViewModel(private val repository: DashboardRepository) : ViewModel() {
    private val _state = MutableStateFlow(UiState<DashboardStats>())
    val state: StateFlow<UiState<DashboardStats>> = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.value = UiState(isLoading = true, data = _state.value.data)
        _state.value = runCatching { repository.loadStats(todayIsoDate()) }.fold(
            onSuccess = { UiState(data = it) },
            onFailure = { UiState(data = _state.value.data, error = it.message ?: "Unable to load dashboard.") }
        )
    }
}
