package app.drobr.eko

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import java.time.LocalDate

// Semana de paseos: 7 barras (la última es hoy) con la meta como línea de puntos
class WeekView(c: Context) : View(c) {
    private val d = resources.displayMetrics.density
    private var data: List<Pair<LocalDate, Int>> = emptyList()
    private var goal = 5000
    private val bar = Paint(Paint.ANTI_ALIAS_FLAG)
    private val txt = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#5A463D"); textSize = 11 * d; textAlign = Paint.Align.CENTER }
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#D0795A"); strokeWidth = 1.5f * d
        pathEffect = android.graphics.DashPathEffect(floatArrayOf(5 * d, 4 * d), 0f)
    }
    private val days = arrayOf("L", "M", "X", "J", "V", "S", "D")

    fun set(week: List<Pair<LocalDate, Int>>, goal: Int) { data = week; this.goal = goal; invalidate() }

    override fun onMeasure(w: Int, h: Int) = setMeasuredDimension(MeasureSpec.getSize(w), (130 * d).toInt())

    override fun onDraw(cv: Canvas) {
        if (data.isEmpty()) return
        val top = 18 * d; val bottom = height - 20 * d
        val max = maxOf(goal, data.maxOf { it.second }).toFloat() * 1.1f
        val slot = width / 7f; val bw = slot * 0.55f
        data.forEachIndexed { i, (day, n) ->
            val cx = slot * i + slot / 2
            val h = (bottom - top) * (n / max)
            bar.color = Color.parseColor(if (n >= goal) "#5FA88E" else if (i == 6) "#E9A93B" else "#C9A27A")
            cv.drawRoundRect(RectF(cx - bw / 2, bottom - maxOf(h, 3 * d), cx + bw / 2, bottom), 6 * d, 6 * d, bar)
            cv.drawText(days[day.dayOfWeek.value - 1], cx, height - 4 * d, txt)
            if (n > 0) cv.drawText(if (n >= 1000) "${n / 1000},${(n % 1000) / 100}k" else "$n", cx, bottom - h - 4 * d, txt)
        }
        val gy = bottom - (bottom - top) * (goal / max)
        cv.drawLine(0f, gy, width.toFloat(), gy, line)
    }
}
