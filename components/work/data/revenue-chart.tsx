import { formatMoneyCompact } from '@/lib/work/format'
import type { MonthlyRevenue } from '@/lib/work/queries/payments'

/**
 * Revenue bars, from `payments` grouped by month.
 *
 * Still the prototype's hand-rolled CSS bars — deliberately. The change here
 * is the data, not the design.
 *
 * Bars are scaled to the largest month in the window rather than to a fixed
 * ceiling, and the y-axis labels are derived from that same maximum. The
 * prototype hardcoded ฿0–฿40k, which would have quietly clipped any month
 * above it once real numbers arrived.
 */
export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const peak = Math.max(...data.map((month) => month.paid + month.pending), 1)

  // Four gridlines from the top down, so the axis always matches the bars.
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => Math.round(peak * fraction))

  return (
    <div className="chart-wrap">
      <div className="chart-grid">
        <div className="y-labels">
          {ticks.map((tick, i) => (
            <span key={i}>{formatMoneyCompact(tick)}</span>
          ))}
        </div>
        <div className="bars">
          {data.map((month) => (
            <div className="bar-col" key={month.month}>
              <div className="bar paid" style={{ height: `${(month.paid / peak) * 100}%` }} />
              <div
                className="bar pending"
                style={{ height: `${(month.pending / peak) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="x-labels">
        {data.map((month) => (
          <span key={month.month}>{month.label}</span>
        ))}
      </div>
    </div>
  )
}
