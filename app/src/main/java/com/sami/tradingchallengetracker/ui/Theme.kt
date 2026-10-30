package com.sami.tradingchallengetracker.ui

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkBg = Color(0xFF0B0F17)
val CardBg = Color(0xFF121824)
val CardBorder = Color(0xFF1E293B)
val AmberAccent = Color(0xFFF59E0B)
val AmberLight = Color(0xFFFBBF24)
val ProfitGreen = Color(0xFF10B981)
val LossRed = Color(0xFFEF4444)
val TextMuted = Color(0xFF94A3B8)

private val DarkColorScheme = darkColorScheme(
    primary = AmberAccent,
    onPrimary = Color(0xFF0B0F17),
    background = DarkBg,
    onBackground = Color.White,
    surface = CardBg,
    onSurface = Color.White
)

@Composable
fun TradingChallengeTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
