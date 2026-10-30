package com.sami.tradingchallengetracker.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object Money {

    fun normalizeArabicDigits(str: String): String {
        val arabic = arrayOf("٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩")
        var result = str
        for (i in 0..9) {
            result = result.replace(arabic[i], i.toString())
        }
        return result
    }

    fun parseToCents(rawInput: String): Result<Long> {
        return try {
            val trimmed = normalizeArabicDigits(
                rawInput.trim().replace("$", "").replace("،", ",")
            )
            if (trimmed.isEmpty()) {
                return Result.failure(IllegalArgumentException("يرجى إدخال نتيجة الصفقة."))
            }
            val normalized = trimmed.replace(",", ".")
            val regex = Regex("^([+-])?(\\d+)(?:\\.(\\d{1,2}))?$")
            val match = regex.find(normalized)
                ?: return Result.failure(IllegalArgumentException("يرجى إدخال رقم صحيح."))

            val sign = if (match.groupValues[1] == "-") -1L else 1L
            val whole = match.groupValues[2].toLongOrNull()
                ?: return Result.failure(IllegalArgumentException("قيمة غير صحيحة."))
            val fractionStr = match.groupValues[3].padEnd(2, '0').take(2)
            val fraction = fractionStr.toLongOrNull() ?: 0L
            val totalCents = sign * (whole * 100L + fraction)

            if (totalCents == 0L) {
                return Result.failure(IllegalArgumentException("لا يمكن أن تكون نتيجة الصفقة صفراً."))
            }
            Result.success(totalCents)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun parseCapitalToCents(rawInput: String): Result<Long> {
        return try {
            val trimmed = normalizeArabicDigits(
                rawInput.trim().replace("$", "").replace("،", ",")
            )
            if (trimmed.isEmpty()) {
                return Result.failure(IllegalArgumentException("يرجى إدخال قيمة صحيحة."))
            }
            val normalized = trimmed.replace(",", ".")
            val regex = Regex("^(\\d+)(?:\\.(\\d{1,2}))?$")
            val match = regex.find(normalized)
                ?: return Result.failure(IllegalArgumentException("يرجى إدخال رقم صحيح أكبر من صفر."))

            val whole = match.groupValues[1].toLongOrNull()
                ?: return Result.failure(IllegalArgumentException("قيمة غير صحيحة."))
            val fractionStr = match.groupValues[2].padEnd(2, '0').take(2)
            val fraction = fractionStr.toLongOrNull() ?: 0L
            val totalCents = whole * 100L + fraction

            if (totalCents <= 0L) {
                return Result.failure(IllegalArgumentException("يجب أن تكون القيمة أكبر من صفر."))
            }
            Result.success(totalCents)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun format(cents: Long?, showSign: Boolean = false): String {
        if (cents == null) return "-"
        val isNegative = cents < 0L
        val isPositive = cents > 0L
        val absCents = kotlin.math.abs(cents)
        val dollars = absCents / 100L
        val remainder = absCents % 100L
        val formattedDollars = String.format(Locale.US, "%,d", dollars)
        val formattedNumber = "$$formattedDollars.${remainder.toString().padStart(2, '0')}"

        return when {
            isNegative -> "-$formattedNumber"
            isPositive && showSign -> "+$formattedNumber"
            else -> formattedNumber
        }
    }

    fun formatDateTime(timestamp: Long): String {
        return try {
            val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.US)
            sdf.format(Date(timestamp))
        } catch (e: Exception) {
            "-"
        }
    }

    fun calculateProgress(currentBalanceCents: Long, targetBalanceCents: Long): Float {
        if (targetBalanceCents <= 0L || currentBalanceCents <= 0L) return 0f
        val pct = (currentBalanceCents.toFloat() / targetBalanceCents.toFloat()) * 100f
        return pct.coerceIn(0f, 100f)
    }
}
