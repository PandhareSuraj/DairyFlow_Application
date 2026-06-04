package com.example.dairyflow.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val DarkColorScheme = darkColorScheme(
    primary = DairyBlueSea,
    onPrimary = Color.White,
    secondary = DairyGold,
    tertiary = DairyGreen,
    background = Color(0xFF0B1220),
    onBackground = Color(0xFFE5E7EB),
    surface = Color(0xFF111827),
    onSurface = Color(0xFFE5E7EB),
    surfaceVariant = Color(0xFF1F2937),
    onSurfaceVariant = Color(0xFFCBD5E1)
)

private val LightColorScheme = lightColorScheme(
    primary = DairyBlueSea,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD7E9F7),
    onPrimaryContainer = DairyDeepNavy,
    secondary = DairyGold,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFE8B5),
    onSecondaryContainer = Color(0xFF3F2E00),
    tertiary = DairyGreen,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD8F3DF),
    onTertiaryContainer = Color(0xFF083E1C),
    background = DairyCream,
    onBackground = DairyCharcoal,
    surface = Color.White,
    onSurface = DairyCharcoal,
    surfaceVariant = DairyLightSlate,
    onSurfaceVariant = Color(0xFF475569),
    outline = DairyCardBorder
)

private val DairyShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(8.dp),
    extraLarge = RoundedCornerShape(8.dp)
)

@Composable
fun DairyFlowTheme(
    darkTheme: Boolean = false,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor -> LightColorScheme
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = DairyShapes,
        content = content
    )
}
