'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { toast } from 'sonner'
import { Activity, CheckCircle2, ExternalLink, Globe, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

type Subdomain = {
  id: string
  name: string
  type: string | null
  status: string | null
  ssl_enabled: boolean
  ssl_expiry: string | null
  latency_ms: number | null
  monthly_visits: number | null
  created_at: string
}

type SubdomainsData = { subdomains: Subdomain[] }

type DomainForm = {
  name: string
  type: string
  ssl_enabled: boolean
}

const BLANK: DomainForm = { name: '', type: 'subdomain', ssl_enabled: true }

export default function SubdomainsPage() {
  usePageTitle('Subdomains')
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<SubdomainsData>('/api/admin/subdomains')
  const { mutate: saveDomain, loading: saving } = useAdminMutation<DomainForm>('/api/admin/subdomains', 'POST')
  const { mutate: deleteDomain } = useAdminMutation<undefined>('/api/admin/subdomains', 'DELETE')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<DomainForm>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Subdomain | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkingId, setCheckingId] = useState<string | null>(null)

  if (loading) return <AdminLoading message="Loading subdomains..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const subdomains = data?.subdomains ?? []
  const active = subdomains.filter((s) => s.status === 'active').length
  const sslValid = subdomains.filter((s) => s.ssl_enabled).length

  async function handleAdd() {
    if (!form.name.trim()) { toast.error('Domain name is required'); return }
    try {
      await saveDomain(form)
      toast.success(`Added ${form.name}`)
      setModalOpen(false)
      setForm(BLANK)
      refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(sd: Subdomain) {
    try {
      await deleteDomain(undefined, { id: sd.id })
      toast.success(`Removed ${sd.name}`)
      setDeleteTarget(null)
      refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function checkAll() {
    setChecking(true)
    const toastId = toast.loading('Checking all domains...')
    try {
      const res = await fetch('/api/admin/subdomains/check', {
        method: 'POST',
        headers: getAdminHeaders(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Check failed')
      const results = json.results as { status: string; latency_ms: number | null }[]
      const up = results.filter((r) => r.status === 'active').length
      const down = results.length - up
      toast.success(`${up} up · ${down} down`, { id: toastId })
      refetch()
    } catch (err) {
      toast.error((err as Error).message, { id: toastId })
    } finally {
      setChecking(false)
    }
  }

  async function checkOne(sd: Subdomain) {
    setCheckingId(sd.id)
    try {
      const res = await fetch(`/api/admin/subdomains/check?id=${sd.id}`, {
        method: 'POST',
        headers: getAdminHeaders(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Check failed')
      const r = json.results?.[0]
      if (r) {
        toast.success(r.status === 'active' ? `${sd.name} — ${r.latency_ms}ms` : `${sd.name} — unreachable`)
      }
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCheckingId(null)
    }
  }

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Subdomain Manager</h1>
          <p className="mt-0.5 text-sm text-[#52525b]">DNS, SSL certificates, and domain health from Supabase</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkAll}
            disabled={checking || subdomains.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA] disabled:opacity-50"
          >
            {checking ? <Loader2 className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
            Check Health
          </button>
          <button
            onClick={() => { setForm(BLANK); setModalOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff]"
          >
            <Globe className="size-3.5" />
            Add Domain
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Domains', value: subdomains.length, color: 'text-[#FAFAFA]' },
          { label: 'Active', value: active, color: 'text-[#22C55E]' },
          { label: 'SSL Enabled', value: sslValid, color: 'text-[#409EFE]' },
          { label: 'Provider', value: 'Vercel', color: 'text-[#A1A1AA]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Domains table */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="border-b border-[#27272A] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Domains & Subdomains</h2>
        </div>
        {subdomains.length === 0 ? (
          <AdminEmpty title="No domains configured" description="Add domains to manage SSL and routing" />
        ) : (
          <div className="divide-y divide-[#27272A]/50">
            {subdomains.map((sd) => (
              <div key={sd.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-[#27272A]/20">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#409EFE]">{sd.name}</span>
                    {sd.type === 'apex' && (
                      <span className="rounded border border-[#409EFE]/20 bg-[#409EFE]/10 px-1.5 py-px text-[9px] font-semibold text-[#409EFE]">APEX</span>
                    )}
                    {sd.type === 'wildcard' && (
                      <span className="rounded border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-1.5 py-px text-[9px] font-semibold text-[#F59E0B]">WILDCARD</span>
                    )}
                    <StatusBadge status={sd.status ?? 'unknown'} />
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[#3f3f46]">https://{sd.name}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {sd.ssl_enabled ? (
                      <CheckCircle2 className="size-3.5 text-[#22C55E]" />
                    ) : (
                      <XCircle className="size-3.5 text-[#EF4444]" />
                    )}
                    <span className={`text-[11px] ${sd.ssl_enabled ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      SSL {sd.ssl_enabled ? 'Valid' : 'Off'}
                    </span>
                    {sd.ssl_expiry && (
                      <span className="text-[10px] text-[#3f3f46]">
                        exp {new Date(sd.ssl_expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {sd.latency_ms != null && (
                    <span className={`font-mono text-[11px] ${sd.latency_ms < 100 ? 'text-[#22C55E]' : sd.latency_ms < 300 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                      {sd.latency_ms}ms
                    </span>
                  )}

                  {sd.monthly_visits != null && (
                    <span className="text-[11px] text-[#52525b]">{sd.monthly_visits.toLocaleString()} visits/mo</span>
                  )}

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => checkOne(sd)}
                      disabled={checkingId === sd.id || checking}
                      title="Ping domain"
                      className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:border-[#409EFE]/30 hover:text-[#409EFE] disabled:opacity-40"
                    >
                      {checkingId === sd.id
                        ? <Loader2 className="size-3 animate-spin" />
                        : <RefreshCw className="size-3" />}
                    </button>
                    <a href={`https://${sd.name}`} target="_blank" rel="noopener noreferrer" className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#409EFE]">
                      <ExternalLink className="size-3" />
                    </a>
                    <button
                      onClick={() => setDeleteTarget(sd)}
                      className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#EF4444]"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Domain modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-[#27272A] bg-[#18181B] text-[#FAFAFA] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA]">Add Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs text-[#A1A1AA]">Domain Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.toLowerCase() }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] font-mono text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                placeholder="app.centered101.com"
              />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-[#27272A] bg-[#09090B] px-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#409EFE]/30"
              >
                {['subdomain', 'apex', 'wildcard'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#27272A] px-3 py-2.5">
              <p className="text-sm text-[#FAFAFA]">SSL Enabled</p>
              <Switch checked={form.ssl_enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, ssl_enabled: v }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="h-8 border-[#27272A] bg-transparent text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} className="h-8 bg-[#409EFE] text-sm text-white hover:bg-[#60aeff] disabled:opacity-60">
              {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              Add Domain
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Remove ${deleteTarget?.name}?`}
        description="This domain record will be deleted from Supabase."
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
