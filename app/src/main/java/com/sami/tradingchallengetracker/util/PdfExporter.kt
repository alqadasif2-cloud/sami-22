package com.sami.tradingchallengetracker.util

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.sami.tradingchallengetracker.data.ChallengeEntity
import com.sami.tradingchallengetracker.data.TradeEntity
import com.sami.tradingchallengetracker.data.TradeType
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object PdfExporter {

    fun shareReport(
        context: Context,
        challenge: ChallengeEntity,
        trades: List<TradeEntity>,
        onError: (String) -> Unit = {}
    ) {
        try {
            val pdfDocument = PdfDocument()
            val pageWidth = 595
            val pageHeight = 842
            var pageNumber = 1

            var pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
            var page = pdfDocument.startPage(pageInfo)
            var canvas: Canvas = page.canvas

            val titlePaint = Paint().apply {
                color = Color.rgb(11, 15, 23)
                textSize = 20f
                isFakeBoldText = true
                typeface = Typeface.DEFAULT_BOLD
            }

            val textPaint = Paint().apply {
                color = Color.rgb(30, 41, 59)
                textSize = 12f
                typeface = Typeface.DEFAULT
            }

            val winPaint = Paint().apply {
                color = Color.rgb(16, 185, 129)
                textSize = 11f
                isFakeBoldText = true
            }

            val lossPaint = Paint().apply {
                color = Color.rgb(239, 68, 68)
                textSize = 11f
                isFakeBoldText = true
            }

            val linePaint = Paint().apply {
                color = Color.rgb(226, 232, 240)
                strokeWidth = 1f
            }

            var y = 50f

            // Title
            canvas.drawText("Sami - تقرير رحلة التداول", 40f, y, titlePaint)
            y += 25f

            // Metadata
            val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.getDefault())
            canvas.drawText("المتداول: ${challenge.userName.ifEmpty { "Sami" }}", 40f, y, textPaint)
            canvas.drawText("تاريخ التقرير: ${sdf.format(Date())}", 350f, y, textPaint)
            y += 20f

            val initialStr = String.format(Locale.US, "$%.2f", challenge.initialCapitalCents / 100.0)
            val currentStr = String.format(Locale.US, "$%.2f", challenge.currentBalanceCents / 100.0)
            val targetStr = String.format(Locale.US, "$%.2f", challenge.targetBalanceCents / 100.0)

            canvas.drawText("رأس المال الأولي: $initialStr", 40f, y, textPaint)
            canvas.drawText("الرصيد الحالي: $currentStr", 200f, y, textPaint)
            canvas.drawText("الهدف: $targetStr", 380f, y, textPaint)
            y += 25f

            canvas.drawLine(40f, y, 555f, y, linePaint)
            y += 20f

            // Table Header
            val headerPaint = Paint().apply {
                color = Color.rgb(71, 85, 105)
                textSize = 11f
                isFakeBoldText = true
            }
            canvas.drawText("#", 45f, y, headerPaint)
            canvas.drawText("النتيجة", 90f, y, headerPaint)
            canvas.drawText("الرصيد السابق", 200f, y, headerPaint)
            canvas.drawText("الرصيد الجديد", 330f, y, headerPaint)
            canvas.drawText("التاريخ", 450f, y, headerPaint)
            y += 10f
            canvas.drawLine(40f, y, 555f, y, linePaint)
            y += 18f

            // Trades List
            trades.forEach { trade ->
                if (y > pageHeight - 60) {
                    pdfDocument.finishPage(page)
                    pageNumber++
                    pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                    page = pdfDocument.startPage(pageInfo)
                    canvas = page.canvas
                    y = 50f
                }

                val sign = if (trade.type == TradeType.WIN) "+" else "-"
                val resultStr = String.format(Locale.US, "%s$%.2f", sign, Math.abs(trade.resultCents) / 100.0)
                val oldStr = String.format(Locale.US, "$%.2f", trade.oldBalanceCents / 100.0)
                val newStr = String.format(Locale.US, "$%.2f", trade.newBalanceCents / 100.0)
                val timeStr = SimpleDateFormat("MM/dd HH:mm", Locale.getDefault()).format(Date(trade.timestamp))

                canvas.drawText(trade.tradeNumber.toString(), 45f, y, textPaint)
                canvas.drawText(resultStr, 90f, y, if (trade.type == TradeType.WIN) winPaint else lossPaint)
                canvas.drawText(oldStr, 200f, y, textPaint)
                canvas.drawText(newStr, 330f, y, textPaint)
                canvas.drawText(timeStr, 450f, y, textPaint)
                y += 20f
            }

            pdfDocument.finishPage(page)

            // Save PDF
            val reportsDir = File(context.cacheDir, "reports").apply { mkdirs() }
            val pdfFile = File(reportsDir, "Sami_Trading_Report_${System.currentTimeMillis()}.pdf")
            FileOutputStream(pdfFile).use { out ->
                pdfDocument.writeTo(out)
            }
            pdfDocument.close()

            // Share Intent
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", pdfFile)
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Sami - تقرير التداول")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(shareIntent, "مشاركة تقرير التداول").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (e: Exception) {
            onError("تعذر إنشاء تقرير PDF: ${e.message ?: "خطأ غير متوقع"}")
        }
    }
}
