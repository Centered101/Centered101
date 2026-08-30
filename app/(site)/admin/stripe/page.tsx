'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { ArrowUpRight, CreditCard, DollarSign, Package, RefreshCw, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { useAdminApi } from '@/lib/hooks/useAdminApi'

type StripeData = {
  balance: { available: number; pending: number; currency: string }
  revenue: { thisMonth: number; transactionsThisMonth: number }
  recentCharges: {
    id: string
    amount: number
    currency: string
    status: string
    description: string | null
    email: string | null | undefined
    created: number
    paid: boolean
    refunded: boolean
  }[]
  products: {
    id: string
    name: string
    description: string | null
    active: boolean
    price: number | null
    currency: string | undefined
    interval: string | null
    priceId: string | null
  }[]
  subscriptions: { active: number; trialing: number; total: number }
}

function formatAmount(amount: number, currency = 'thb') {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(amount)
}

function timeAgo(unix: number) {
  const diff = Date.now() - unix * 1000
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: '#22C55E',
  pending: '#F59E0B',
  failed: '#EF4444',
}

export default function StripePage() {
  usePageTitle('การชำระเงิน')
  const { data, loading, error, refetch } = useAdminApi<StripeData>('/api/admin/stripe')

  if (loading) return <AdminLoading message="กำลังโหลดข้อมูล Stripe..." />
  if (error) return <AdminError error={error} onRetry={refetch} />
  if (!data) return <AdminEmpty title="ยังไม่มีข้อมูล Stripe" />

  const { balance, revenue, recentCharges, products, subscriptions } = data
  const currency = balance.currency

  const stats = [
    {
      label: 'ยอดคงเหลือที่ถอนได้',
      value: formatAmount(balance.available, currency),
      icon: DollarSign,
      color: '#22C55E',
      sub: 'พร้อมโอนออก',
    },
    {
      label: 'ยอดรอดำเนินการ',
      value: formatAmount(balance.pending, currency),
      icon: TrendingUp,
      color: '#F59E0B',
      sub: 'อยู่ระหว่างดำเนินการ',
    },
    {
      label: 'รายได้เดือนนี้',
      value: formatAmount(revenue.thisMonth, currency),
      icon: CreditCard,
      color: '#409EFE',
      sub: `${revenue.transactionsThisMonth} รายการ`,
    },
    {
      label: 'สมาชิกที่ใช้งานอยู่',
      value: subscriptions.active.toString(),
      icon: Users,
      color: '#A855F7',
      sub: `ทดลองใช้ ${subscriptions.trialing} รายการ`,
    },
  ]

  return (
    <div className="space-y-6 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">การชำระเงิน</h1>
          <p className="mt-0.5 text-sm text-[#52525b]">แดชบอร์ด Stripe · โหมด {currency.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-3 text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            <ArrowUpRight className="size-3" />
            เปิด Stripe
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="h-8 border-[#27272A] bg-[#18181B] text-xs text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
          >
            <RefreshCw className="size-3" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg border border-[#27272A] bg-[#09090B]">
                  <Icon className="size-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-[#FAFAFA]">{s.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-[#A1A1AA]">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-[#52525b]">{s.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Recent Charges */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">รายการชำระล่าสุด</h2>
            <p className="mt-0.5 text-[11px] text-[#52525b]">10 รายการล่าสุด</p>
          </div>
          {recentCharges.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[12px] text-[#3f3f46]">ยังไม่มีรายการชำระ</div>
          ) : (
            <div className="divide-y divide-[#27272A]/60">
              {recentCharges.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[c.status] ?? '#52525b' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#FAFAFA]">
                      {c.description || c.email || c.id}
                    </p>
                    <p className="text-[11px] text-[#52525b]">
                      {c.email && c.description ? c.email : ''} · {timeAgo(c.created)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-[#FAFAFA]">
                      {formatAmount(c.amount, c.currency)}
                    </p>
                    <p className="text-[10px]" style={{ color: STATUS_COLOR[c.status] ?? '#52525b' }}>
                      {c.refunded ? 'คืนเงินแล้ว' : c.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#FAFAFA]">สินค้า</h2>
              <p className="mt-0.5 text-[11px] text-[#52525b]">สินค้าที่ใช้งานใน Stripe</p>
            </div>
            <Package className="size-4 text-[#3f3f46]" />
          </div>
          {products.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center text-[12px] text-[#3f3f46] px-4">
              ยังไม่มีสินค้า<br />สร้างสินค้าได้ใน Stripe Dashboard
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]/60">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#FAFAFA]">{p.name}</p>
                    <p className="text-[11px] text-[#52525b]">
                      {p.interval ? `ราย${p.interval}` : 'จ่ายครั้งเดียว'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {p.price !== null && p.currency ? (
                      <p className="text-[13px] font-semibold text-[#FAFAFA]">
                        {formatAmount(p.price, p.currency)}
                      </p>
                    ) : (
                      <p className="text-[12px] text-[#52525b]">ยังไม่มีราคา</p>
                    )}
                    <StatusBadge status={p.active ? 'active' : 'inactive'} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-[#27272A] px-5 py-3">
            <a
              href="https://dashboard.stripe.com/products"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-[#409EFE] hover:underline"
            >
              <ArrowUpRight className="size-3" />
              จัดการสินค้าใน Stripe
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
