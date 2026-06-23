package com.example.dairyflow.ui.viewmodel

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

fun todayIsoDate(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

fun currentMonth(): Int = Calendar.getInstance().get(Calendar.MONTH) + 1

fun currentYear(): Int = Calendar.getInstance().get(Calendar.YEAR)
