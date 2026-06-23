package com.example.dairyflow.ui.viewmodel

import com.example.dairyflow.data.repository.SESSION_EXPIRED_MESSAGE
import io.github.jan.supabase.postgrest.exception.PostgrestRestException

internal fun Throwable.userFacingSaveError(defaultMessage: String): String =
    when {
        message == SESSION_EXPIRED_MESSAGE -> SESSION_EXPIRED_MESSAGE
        this is IllegalArgumentException || this is IllegalStateException -> message ?: defaultMessage
        this is PostgrestRestException -> listOfNotNull<String>(
            message,
            details?.toString(),
            hint?.toString()
        ).firstOrNull { it.isNotBlank() } ?: defaultMessage
        else -> defaultMessage
    }
