package com.example.dairyflow.ui.admin.deliveryboys

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.core.content.FileProvider
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AdminViewModel
import com.example.dairyflow.ui.viewmodel.QrLoginViewModel
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import java.io.File
import java.io.FileOutputStream

@Composable
fun AdminQrGeneratorScreen(
    deliveryBoyId: String,
    viewModel: QrLoginViewModel,
    adminViewModel: AdminViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val dataState by adminViewModel.dataState.collectAsState()
    val context = LocalContext.current
    val deliveryBoy = dataState.data?.deliveryBoys?.firstOrNull { it.id == deliveryBoyId }

    LaunchedEffect(deliveryBoyId) {
        adminViewModel.load()
        if (deliveryBoyId.isNotBlank() && state.qrPayload == null) {
            viewModel.generate(deliveryBoyId)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Delivery Boy Login QR", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(deliveryBoy?.name ?: "Delivery boy", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text("Mobile: ${deliveryBoy?.mobileNumber ?: "-"}")
        Text("One-time login token. Default expiry is 24 hours.")
        if (state.isLoading) LoadingState()
        if (dataState.isLoading && dataState.data == null) LoadingState("Loading delivery boy...")
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
            Text("Login code: $payload", maxLines = 2, overflow = TextOverflow.Ellipsis)
            Button({ viewModel.generate(deliveryBoyId) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.QrCode, contentDescription = null)
                Text(" Regenerate QR")
            }
            OutlinedButton({ copyText(context, payload) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.ContentCopy, contentDescription = null)
                Text(" Copy Login Code")
            }
            OutlinedButton(
                onClick = {
                    shareQrImage(
                        context = context,
                        bitmap = qrBitmap,
                        deliveryBoyName = deliveryBoy?.name ?: "Delivery boy"
                    )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Filled.IosShare, contentDescription = null)
                Text(" Share QR Image")
            }
            OutlinedButton({ shareText(context, payload) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.ContentCopy, contentDescription = null)
                Text(" Share Login Code")
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
    clipboard.setPrimaryClip(ClipData.newPlainText("DairyFlow Login Code", value))
}

private fun shareQrImage(context: Context, bitmap: Bitmap, deliveryBoyName: String) {
    val uri = saveQrBitmap(context, bitmap)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_TEXT, "DairyFlow login QR for $deliveryBoyName")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share DairyFlow QR"))
}

private fun saveQrBitmap(context: Context, bitmap: Bitmap): Uri {
    val directory = File(context.cacheDir, "shared_qr").apply { mkdirs() }
    val file = File(directory, "delivery_boy_login_qr.png")
    FileOutputStream(file).use { stream ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
    }
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}

private fun shareText(context: Context, value: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, value)
    }
    context.startActivity(Intent.createChooser(intent, "Share DairyFlow login code"))
}
