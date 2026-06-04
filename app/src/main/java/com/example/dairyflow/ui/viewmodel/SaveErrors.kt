package com.example.dairyflow.ui.viewmodel

import com.example.dairyflow.data.repository.SESSION_EXPIRED_MESSAGE

internal fun Throwable.userFacingSaveError(defaultMessage: String): String =
    when {
        message == SESSION_EXPIRED_MESSAGE -> SESSION_EXPIRED_MESSAGE
        this is IllegalArgumentException || this is IllegalStateException -> message ?: defaultMessage
        else -> defaultMessage
    }
