package com.example.dairyflow

import android.app.Application
import com.example.dairyflow.core.AppContainer

class DairyFlowApplication : Application() {
    val container: AppContainer by lazy { AppContainer() }
}
