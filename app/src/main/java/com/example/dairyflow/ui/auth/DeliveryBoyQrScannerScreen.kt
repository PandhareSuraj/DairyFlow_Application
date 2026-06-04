package com.example.dairyflow.ui.auth

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.dairyflow.ui.common.ErrorState
import com.example.dairyflow.ui.common.LoadingState
import com.example.dairyflow.ui.viewmodel.AuthViewModel
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@Composable
fun DeliveryBoyQrScannerScreen(
    viewModel: AuthViewModel,
    onBack: () -> Unit,
    onSignedIn: () -> Unit
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    var scannedPayload by remember { mutableStateOf<String?>(null) }
    var scannerStarted by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasCameraPermission = it
    }

    LaunchedEffect(scannerStarted) {
        if (scannerStarted && !hasCameraPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }
    LaunchedEffect(state.isSignedIn, state.profile?.role) {
        if (state.isSignedIn && state.profile?.role.equals("delivery_boy", ignoreCase = true)) onSignedIn()
    }
    LaunchedEffect(scannedPayload) {
        scannedPayload?.let(viewModel::verifyDeliveryQrLogin)
    }

    if (!scannerStarted) {
        DeliveryBoyLoginStart(
            isLoading = state.isLoading,
            error = state.error,
            onScanQr = { scannerStarted = true },
            onBack = onBack
        )
    } else {
        DeliveryBoyCameraScanner(
            hasCameraPermission = hasCameraPermission,
            isLoading = state.isLoading,
            scannedPayload = scannedPayload,
            error = state.error,
            onQrScanned = { scannedPayload = it },
            onAllowCamera = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            onBack = {
                scannerStarted = false
                scannedPayload = null
            }
        )
    }
}

@Composable
private fun DeliveryBoyLoginStart(
    isLoading: Boolean,
    error: String?,
    onScanQr: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Filled.QrCodeScanner, contentDescription = null, modifier = Modifier.size(44.dp))
        Spacer(Modifier.height(14.dp))
        Text("Delivery Boy Login", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            "Use the QR shown by your DairyFlow admin to sign in.",
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.height(28.dp))
        Button(onClick = onScanQr, modifier = Modifier.fillMaxWidth().height(56.dp), enabled = !isLoading) {
            Icon(Icons.Filled.QrCodeScanner, contentDescription = null)
            Text(" Scan QR")
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
        if (isLoading) LoadingState()
        error?.let { ErrorState(it) }
    }
}

@Composable
private fun DeliveryBoyCameraScanner(
    hasCameraPermission: Boolean,
    isLoading: Boolean,
    scannedPayload: String?,
    error: String?,
    onQrScanned: (String) -> Unit,
    onAllowCamera: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var photoError by remember { mutableStateOf<String?>(null) }
    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            photoError = null
            scanQrFromGalleryImage(
                context = context,
                uri = it,
                onQrScanned = onQrScanned,
                onError = { message -> photoError = message }
            )
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(Color(0xFFF8F3E9))) {
        Box(modifier = Modifier.fillMaxWidth().weight(1f).background(Color.Black)) {
            if (hasCameraPermission) {
                QrCameraPreview(
                    enabled = !isLoading && scannedPayload == null,
                    onQrScanned = onQrScanned,
                    modifier = Modifier.fillMaxSize()
                )
                ScannerOverlay(scannedPayload != null)
            } else {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Camera permission is required to scan the login QR.", color = Color.White, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = onAllowCamera) { Text("Allow Camera") }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.Close, contentDescription = "Close scanner", tint = Color.White, modifier = Modifier.size(34.dp))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Filled.FlashOff, contentDescription = null, tint = Color.White, modifier = Modifier.size(30.dp))
                    Icon(Icons.Filled.Info, contentDescription = null, tint = Color.White, modifier = Modifier.size(30.dp))
                }
            }
        }
        Surface(color = Color(0xFFF8F3E9)) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = if (scannedPayload == null) "Scan the DairyFlow login QR" else "QR scanned. Logging in...",
                    style = MaterialTheme.typography.bodyMedium
                )
                OutlinedButton(
                    onClick = { galleryLauncher.launch("image/*") },
                    enabled = !isLoading && scannedPayload == null,
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Icon(Icons.Filled.Image, contentDescription = null)
                    Text(" Scan from photo")
                }
                OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth().height(48.dp)) { Text("Back") }
                if (isLoading) LoadingState()
                error?.let { ErrorState(it) }
                photoError?.let { ErrorState(it) }
            }
        }
    }
}

private fun scanQrFromGalleryImage(
    context: android.content.Context,
    uri: Uri,
    onQrScanned: (String) -> Unit,
    onError: (String) -> Unit
) {
    val scanner = BarcodeScanning.getClient()
    runCatching { InputImage.fromFilePath(context, uri) }
        .onSuccess { image ->
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    val payload = barcodes
                        .firstOrNull {
                            it.format == Barcode.FORMAT_QR_CODE &&
                                it.rawValue?.startsWith("DAIRYFLOW_QR:") == true
                        }
                        ?.rawValue
                    if (payload != null) {
                        onQrScanned(payload)
                    } else {
                        onError("No DairyFlow login QR found in this photo.")
                    }
                }
                .addOnFailureListener {
                    onError("Unable to scan this photo. Please choose a clear QR image.")
                }
                .addOnCompleteListener {
                    scanner.close()
                }
        }
        .onFailure {
            scanner.close()
            onError("Unable to open this photo. Please choose another QR image.")
        }
}

@Composable
private fun ScannerOverlay(scanned: Boolean) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .size(260.dp)
                .background(Color.White.copy(alpha = 0.16f), RoundedCornerShape(28.dp))
                .border(1.dp, Color.White.copy(alpha = 0.24f), RoundedCornerShape(28.dp))
        )
        Canvas(modifier = Modifier.size(310.dp)) {
            val stroke = Stroke(width = 7.dp.toPx(), cap = StrokeCap.Round)
            val corner = 52.dp.toPx()
            val inset = 12.dp.toPx()
            val color = if (scanned) Color(0xFF8EE59B) else Color.White.copy(alpha = 0.88f)
            val left = inset
            val top = inset
            val right = size.width - inset
            val bottom = size.height - inset
            drawLine(color, Offset(left, top + corner), Offset(left, top + 14.dp.toPx()), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(left + 14.dp.toPx(), top), Offset(left + corner, top), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(right - corner, top), Offset(right - 14.dp.toPx(), top), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(right, top + 14.dp.toPx()), Offset(right, top + corner), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(left, bottom - corner), Offset(left, bottom - 14.dp.toPx()), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(left + 14.dp.toPx(), bottom), Offset(left + corner, bottom), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(right - corner, bottom), Offset(right - 14.dp.toPx(), bottom), strokeWidth = stroke.width, cap = StrokeCap.Round)
            drawLine(color, Offset(right, bottom - corner), Offset(right, bottom - 14.dp.toPx()), strokeWidth = stroke.width, cap = StrokeCap.Round)
        }
        Text(
            "Scan QR code",
            color = Color.White,
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.align(Alignment.Center).offset(y = 190.dp)
        )
    }
}

@OptIn(ExperimentalGetImage::class)
@Composable
private fun QrCameraPreview(
    enabled: Boolean,
    onQrScanned: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val scanner = remember { BarcodeScanning.getClient() }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                analysis.setAnalyzer(executor) { proxy ->
                    val mediaImage = proxy.image
                    if (mediaImage == null || !enabled) {
                        proxy.close()
                        return@setAnalyzer
                    }
                    val input = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
                    scanner.process(input)
                        .addOnSuccessListener { barcodes ->
                            barcodes
                                .firstOrNull {
                                    it.format == Barcode.FORMAT_QR_CODE &&
                                        it.rawValue?.startsWith("DAIRYFLOW_QR:") == true
                                }
                                ?.rawValue
                                ?.let(onQrScanned)
                        }
                        .addOnCompleteListener { proxy.close() }
                }
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
            }, ContextCompat.getMainExecutor(ctx))
            previewView
        }
    )

    DisposableEffect(Unit) {
        onDispose {
            scanner.close()
            executor.shutdown()
            runCatching { ProcessCameraProvider.getInstance(context).get().unbindAll() }
        }
    }
}
