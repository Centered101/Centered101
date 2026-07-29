'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'

type AuditLog = {
  id: string
  action: string
  resource: string
  resource_id: string | null
  outcome: string
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

type SecurityEvent = {
  id: string
  severity: string
  event_type: string
  message: string | null
  ip_address: string | null
  resolved: boolean
  created_at: string
}

type LoginLog = {
  id: string
  provider: string
  email: string | null
  github_username: string | null
  outcome: string
  ip_address: string | null
  created_at: string
}

type MonitoringData = {
  auditLogs: AuditLog[]
  securityEvents: SecurityEvent[]
  loginLogs: LoginLog[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

const severityIcon = { info: Info, warning: AlertTriangle, critical: XCircle } as const
const severityColor = { info: 'text-[#409EFE]', warning: 'text-[#F59E0B]', critical: 'text-[#EF4444]' } as const
const outcomeColor = { success: 'text-[#22C55E]', failed: 'text-[#EF4444]', blocked: 'text-[#F59E0B]' } as const

export default function MonitoringPage() {
  usePageTitle('มอนิเตอร์ระบบ')
  const { data, loading, error, refetch } = useAdminApi<MonitoringData>('/api/admin/monitoring')
  useAdminRealtime(['admin_audit_log', 'admin_security_events'], refetch)

  if (loading) return <AdminLoading message="กำลังโหลดข้อมูลมอนิเตอร์..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const { auditLogs, securityEvents, loginLogs } = data!
  const unresolved = securityEvents.filter((e) => !e.resolved).length

  return (
    <AdminPageContainer>
      <AdminPageHeader title="มอนิเตอร์ระบบ" description="บันทึกการทำงาน เหตุการณ์ความปลอดภัย และประวัติการเข้าสู่ระบบจาก Supabase" />

      {unresolved > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 px-5 py-3.5">
          <AlertTriangle className="size-5 text-[#EF4444]" />
          <p className="text-sm font-semibold text-[#FAFAFA]">
            มีเหตุการณ์ความปลอดภัยที่ยังไม่แก้ไข {unresolved} รายการ
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'บันทึกการทำงาน', value: auditLogs.length, color: 'text-[#FAFAFA]' },
          { label: 'เหตุการณ์ความปลอดภัย', value: securityEvents.length, color: unresolved > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]' },
          { label: 'ประวัติเข้าสู่ระบบ', value: loginLogs.length, color: 'text-[#FAFAFA]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Audit logs */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">บันทึกการทำงาน</h2>
            <p className="mt-0.5 text-[11px] text-[#52525b]">การทำงานล่าสุด {auditLogs.length} รายการ</p>
          </div>
          {auditLogs.length === 0 ? (
            <AdminEmpty title="ยังไม่มีบันทึกการทำงาน" description="การทำงานของผู้ดูแลจะแสดงที่นี่" />
          ) : (
            <div className="max-h-96 divide-y divide-[#27272A]/50 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-[#27272A]/20">
                  <div>
                    {log.outcome === 'success' ? (
                      <CheckCircle2 className="mt-0.5 size-4 text-[#22C55E]" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 text-[#EF4444]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#FAFAFA]">{log.action}</p>
                    <p className="text-[10px] text-[#52525b]">
                      {log.resource}{log.resource_id ? ` · ${log.resource_id}` : ''}
                    </p>
                    {log.ip_address && (
                      <p className="font-mono text-[10px] text-[#3f3f46]">IP: {log.ip_address}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-[#3f3f46]">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Security events */}
          <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
            <div className="border-b border-[#27272A] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">เหตุการณ์ความปลอดภัย</h2>
            </div>
            {securityEvents.length === 0 ? (
              <AdminEmpty title="ยังไม่มีเหตุการณ์ความปลอดภัย" />
            ) : (
              <div className="max-h-52 divide-y divide-[#27272A]/50 overflow-y-auto">
                {securityEvents.map((evt) => {
                  const sev = evt.severity as keyof typeof severityIcon
                  const Icon = severityIcon[sev] ?? Info
                  return (
                    <div key={evt.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#27272A]/20">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${severityColor[sev] ?? 'text-[#A1A1AA]'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-[#FAFAFA]">{evt.event_type}</p>
                        {evt.message && <p className="text-[11px] text-[#52525b]">{evt.message}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        {evt.resolved ? (
                          <span className="text-[10px] text-[#22C55E]">แก้ไขแล้ว</span>
                        ) : (
                          <span className="text-[10px] text-[#EF4444]">เปิดอยู่</span>
                        )}
                        <p className="text-[10px] text-[#3f3f46]">{timeAgo(evt.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Login log */}
          <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
            <div className="border-b border-[#27272A] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">ประวัติการเข้าสู่ระบบ</h2>
            </div>
            {loginLogs.length === 0 ? (
              <AdminEmpty title="ยังไม่มีประวัติการเข้าสู่ระบบ" />
            ) : (
              <div className="max-h-52 divide-y divide-[#27272A]/50 overflow-y-auto">
                {loginLogs.map((log) => {
                  const oc = log.outcome as keyof typeof outcomeColor
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#27272A]/20">
                      <div className={`text-[12px] font-semibold capitalize ${outcomeColor[oc] ?? 'text-[#A1A1AA]'}`}>
                        {log.outcome}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-[#A1A1AA]">
                          {log.github_username || log.email || 'ไม่ทราบผู้ใช้'}
                        </p>
                        <p className="text-[10px] text-[#52525b]">{log.provider}</p>
                      </div>
                      <span className="text-[11px] text-[#3f3f46]">{timeAgo(log.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPageContainer>
  )
}
