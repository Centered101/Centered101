import { mockMonthLabels, mockRevenueBars } from '@/lib/work/mock/data'

/**
 * Revenue bars.
 *
 * Still the prototype's hand-rolled CSS bars — deliberately. Swapping in
 * Chart.js is a visual change and belongs with real data (Phase 26), not with
 * a routing refactor.
 */
export function RevenueChart({
  bars = mockRevenueBars,
  labels = mockMonthLabels,
}: {
  bars?: number[]
  labels?: string[]
}) {
  return (
    <div className="chart-wrap">
      <div className="chart-grid">
        <div className="y-labels">
          <span>฿40k</span>
          <span>฿30k</span>
          <span>฿20k</span>
          <span>฿10k</span>
          <span>฿0</span>
        </div>
        <div className="bars">
          {bars.map((height, i) => (
            <div className="bar-col" key={i}>
              <div className="bar paid" style={{ height: `${height * 0.62}%` }} />
              <div className="bar pending" style={{ height: `${height * 0.17}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="x-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}
