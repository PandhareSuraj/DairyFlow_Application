package com.example.dairyflow.ui.admin.deliveryboys

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.QrLoginViewModel
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter

@Composable
fun AdminQrGeneratorScreen(
    deliveryBoyId: String,
    viewModel: QrLoginViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(deliveryBoyId) {
        if (deliveryBoyId.isNotBlank() && state.qrPayload == null) {
            viewModel.generate(deliveryBoyId)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Delivery Login QR", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("One-time login token. Default expiry is 24 hours.")
        if (state.isLoading) LoadingState()
        state.error?.let { ErrorState(it) }
        state.qrPayload?.let { payload ->
            val qrBitmap = rememberQrBitmap(payload)
            Card {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Scan to Login", style = MaterialTheme.typography.titleMedium)
                    Image(
                        bitmap = qrBitmap.asImageBitmap(),
                        contentDescription = "Delivery boy login QR",
                        modifier = Modifier.fillMaxWidth().height(280.dp)
                    )
                    Text("Expires: ${state.expiresAt ?: "-"}")
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Button({ viewModel.generate(deliveryBoyId) }, modifier = Modifier.weight(1f)) {
                    Text("Regenerate QR")
                }
                OutlinedButton({ copyText(context, payload) }, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Filled.ContentCopy, contentDescription = null)
                    Text(" Copy")
                }
            }
            OutlinedButton({ shareText(context, payload) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.IosShare, contentDescription = null)
                Text(" Share QR")
            }
        }
        Spacer(Modifier.height(4.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
    }
}

@Composable
private fun rememberQrBitmap(payload: String): Bitmap =
    androidx.compose.runtime.remember(payload) {
        val matrix = MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, 720, 720)
        Bitmap.createBitmap(matrix.width, matrix.height, Bitmap.Config.ARGB_8888).apply {
            for (x in 0 until matrix.width) {
                for (y in 0 until matrix.height) {
                    setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
        }
    }

private fun copyText(context: Context, value: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("DairyFlow QR", value))
}

private fun shareText(context: Context, value: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, value)
    }
    context.startActivity(Intent.createChooser(intent, "Share DairyFlow QR"))
}
