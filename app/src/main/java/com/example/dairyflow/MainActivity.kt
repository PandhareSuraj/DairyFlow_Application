package com.example.dairyflow

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember
import com.example.dairyflow.ui.navigation.AppNavGraph
import com.example.dairyflow.ui.theme.DairyFlowTheme
import com.example.dairyflow.ui.viewmodel.DairyFlowViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DairyFlowTheme {
                val app = application as DairyFlowApplication
                val factory = remember { DairyFlowViewModelFactory(app.container) }
                AppNavGraph(factory)
            }
        }
    }
}
