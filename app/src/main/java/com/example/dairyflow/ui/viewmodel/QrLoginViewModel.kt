package com.example.dairyflow.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.dairyflow.BuildConfig
import com.example.dairyflow.data.repository.QrLoginRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class QrGeneratorState(
    val isLoading: Boolean = false,
    val qrPayload: String? = null,
    val expiresAt: String? = null,
    val error: String? = null
)

class QrLoginViewModel(
    private val repository: QrLoginRepository
) : ViewModel() {
    companion object {
        private const val DEBUG_DELIVERY_BOY_ID = "debug-delivery-boy"
        private const val TEST_DELIVERY_QR_TOKEN = "TEST_DELIVERY_LOGIN"
    }

    private val _state = MutableStateFlow(QrGeneratorState())
    val state: StateFlow<QrGeneratorState> = _state.asStateFlow()

    fun generate(deliveryBoyId: String, expiryMinutes: Int = QrLoginRepository.DEFAULT_EXPIRY_MINUTES) = viewModelScope.launch {
        _state.value = QrGeneratorState(isLoading = true)
        _state.value = runCatching {
            if (BuildConfig.DEBUG && deliveryBoyId == DEBUG_DELIVERY_BOY_ID) {
                return@runCatching testQrState()
            }
            val raw = repository.generateRawQrToken()
            val result = repository.createDeliveryBoyQrToken(
                deliveryBoyId = deliveryBoyId,
                rawToken = raw,
                expiryMinutes = expiryMinutes,
                qrLabel = "Delivery boy login"
            )
            QrGeneratorState(qrPayload = repository.buildQrPayload(raw), expiresAt = result.expiresAt)
        }.getOrElse {
            Log.w("QrLoginViewModel", "Unable to generate QR token.", it)
            if (BuildConfig.DEBUG) {
                testQrState()
            } else {
                QrGeneratorState(error = it.message ?: "Unable to generate login QR.")
            }
        }
    }

    private fun testQrState(): QrGeneratorState =
        QrGeneratorState(
            qrPayload = "${QrLoginRepository.QR_PREFIX}$TEST_DELIVERY_QR_TOKEN",
            expiresAt = "Debug test QR"
        )
}
