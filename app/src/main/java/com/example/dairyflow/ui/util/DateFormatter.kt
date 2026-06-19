package com.example.dairyflow.ui.util

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

object DateFormatter {
    private val dateInputs = listOf(
        "yyyy-MM-dd",
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd HH:mm"
    )

    fun formatDate(value: String?, locale: Locale = Locale.getDefault()): String {
        val raw = value?.trim().orEmpty()
        if (raw.isBlank()) return "-"
        val date = parse(raw) ?: return raw
        return SimpleDateFormat("d MMMM yyyy", locale).format(date)
    }

    fun formatDateTime(value: String?, locale: Locale = Locale.getDefault()): String {
        val raw = value?.trim().orEmpty()
        if (raw.isBlank()) return "-"
        if (!raw.containsTime()) return formatDate(raw, locale)
        val date = parse(raw) ?: return raw
        return SimpleDateFormat("d MMMM yyyy, h:mm a", locale).format(date)
    }

    fun formatBillingMonth(value: String?, locale: Locale = Locale.getDefault()): String {
        val raw = value?.trim().orEmpty()
        if (raw.isBlank()) return "-"
        val parts = raw.split("-")
        if (parts.size < 2) return raw
        val year = parts.getOrNull(0)?.toIntOrNull() ?: return raw
        val month = parts.getOrNull(1)?.toIntOrNull()?.takeIf { it in 1..12 } ?: return raw
        return formatBillingMonth(month, year, locale)
    }

    fun formatBillingMonth(month: Int, year: Int, locale: Locale = Locale.getDefault()): String {
        if (month !in 1..12 || year <= 0) return "%02d/%04d".format(month, year)
        val calendar = Calendar.getInstance(locale).apply {
            clear()
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }
        return SimpleDateFormat("MMMM yyyy", locale).format(calendar.time)
    }

    private fun parse(value: String): java.util.Date? {
        val normalized = value.replace(Regex("\\.\\d{6}(?=[+-]\\d{2}:\\d{2}$|Z$)")) {
            it.value.take(4)
        }
        return dateInputs.firstNotNullOfOrNull { pattern ->
            runCatching {
                SimpleDateFormat(pattern, Locale.US).apply { isLenient = false }.parse(normalized)
            }.getOrNull()
        }
    }

    private fun String.containsTime(): Boolean =
        contains('T') || Regex("\\d{4}-\\d{2}-\\d{2}\\s+\\d{1,2}:\\d{2}").containsMatchIn(this)
}
