package com.example.dairyflow

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import com.example.dairyflow.ui.localization.LocalDairyStrings
import com.example.dairyflow.ui.localization.dairyStrings
import com.example.dairyflow.ui.navigation.AppNavGraph
import com.example.dairyflow.ui.theme.DairyFlowTheme
import com.example.dairyflow.ui.viewmodel.DairyFlowViewModelFactory

class MainActivity : ComponentActivity() {
    private var authCallbackUri by mutableStateOf<Uri?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        authCallbackUri = intent?.data?.takeIf { it.isAuthCallback() }
        enableEdgeToEdge()
        setContent {
            val app = application as DairyFlowApplication
            val settings by app.container.appSettingsRepository.settings.collectAsState()
            val context = LocalContext.current
            DairyFlowTheme(themePreference = settings.themePreference) {
                CompositionLocalProvider(LocalDairyStrings provides dairyStrings(context, settings.language)) {
                val factory = remember { DairyFlowViewModelFactory(app.container) }
                AppNavGraph(
                    factory = factory,
                    appSettingsRepository = app.container.appSettingsRepository,
                    authCallbackUri = authCallbackUri?.toString(),
                    onAuthCallbackConsumed = { authCallbackUri = null }
                )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        authCallbackUri = intent.data?.takeIf { it.isAuthCallback() }
    }

    private fun Uri.isAuthCallback(): Boolean =
        scheme == "dairyflow" && host == "auth" && path == "/callback"
}
