package com.example.dairyflow

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4

import org.junit.Test
import org.junit.runner.RunWith

import org.junit.Assert.*
import kotlinx.coroutines.runBlocking

@RunWith(AndroidJUnit4::class)
class ExampleInstrumentedTest {
    @Test
    fun useAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.example.dairyflow", appContext.packageName)
    }

    @Test
    fun testCreateDeliveryBoy() {
        runBlocking {
            val appContext = InstrumentationRegistry.getInstrumentation().targetContext
            val app = appContext.applicationContext as com.example.dairyflow.DairyFlowApplication
            val container = app.container
            
            try {
                android.util.Log.d("TEST_DB", "Logging in as admin...")
                val profile = container.authRepository.signInAdmin(
                    "dairyflow.admin.8275838256@test.local",
                    "DairyFlowTest@8275838256"
                )
                android.util.Log.d("TEST_DB", "Logged in successfully: $profile")
                
                android.util.Log.d("TEST_DB", "Calling upsertDeliveryBoy...")
                container.adminRepository.upsertDeliveryBoy(
                    com.example.dairyflow.data.model.AdminDeliveryBoy(
                        id = null,
                        profileId = null,
                        name = "Sp Test",
                        mobileNumber = "9767000000",
                        email = "sp.test@example.com",
                        assignedRouteId = null,
                        isActive = true
                    )
                )
                android.util.Log.d("TEST_DB", "Successfully created delivery boy!")
            } catch (e: Exception) {
                android.util.Log.e("TEST_DB", "FAILED WITH EXCEPTION", e)
                throw e
            }
        }
    }
}