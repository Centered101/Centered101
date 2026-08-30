'use client'

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

import { formatMoney, formatMoneyCompact } from '@/lib/work/format'
import type { MonthlyRevenue } from '@/lib/work/queries/payments'

/**
 * Revenue bars, from `payments` grouped by month.
 *
 * Chart.js, replacing the prototype's hand-rolled CSS bars. The bars looked
 * the part but could not do what a chart is for: there was no hover, no
 * readable value for a specific month, and a bar under about 2% of the peak
 * collapsed to its `min-height` and read as a rounding error rather than as a
 * small month.
 *
 * REGISTERED PIECE BY PIECE rather than importing `chart.js/auto`. The auto
 * bundle pulls in every controller, scale and plugin — line, radar, doughnut,
 * the animations and the legend — for a chart that uses four of them.
 *
 * `Legend` is deliberately absent: the panel already draws its own key above
 * the canvas, with the twelve-month total beside it.
 */
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

/** Matches .key-paid / .key-pending in work.css. */
const PAID = '#409efe'
const PENDING = '#b7d8f8'

export function RevenueChart({
  data,
  currency = 'THB',
}: {
  data: MonthlyRevenue[]
  currency?: string
}) {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    // The wrapper below owns the height; without this Chart.js would impose
    // its own 2:1 ratio and the panel would grow with the viewport.
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 11 },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
        callbacks: {
          // The raw values are minor units; formatMoney is what turns them
          // into money, here as everywhere else.
          label: (item: TooltipItem<'bar'>) =>
            ` ${item.dataset.label}: ${formatMoney(item.parsed.y, currency)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#dfe3e8' },
        ticks: { color: '#647084', font: { size: 9 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#eef2f6' },
        border: { display: false },
        ticks: {
          color: '#647084',
          font: { size: 9 },
          maxTicksLimit: 5,
          callback: (value) => formatMoneyCompact(Number(value), currency),
        },
      },
    },
  }

  return (
    <div className="chart-wrap">
      <div className="chart-canvas">
        <Bar
          options={options}
          data={{
            labels: data.map((month) => month.label),
            datasets: [
              {
                label: 'ชำระแล้ว',
                data: data.map((month) => month.paid),
                backgroundColor: PAID,
                borderRadius: 4,
                // Bars keep a readable width in a 12-month window without
                // stretching to fill it when the window is short.
                maxBarThickness: 14,
              },
              {
                label: 'รอชำระ',
                data: data.map((month) => month.pending),
                backgroundColor: PENDING,
                borderRadius: 4,
                maxBarThickness: 14,
              },
            ],
          }}
        />
      </div>
    </div>
  )
}
