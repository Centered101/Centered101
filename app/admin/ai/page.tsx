'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Brain, ChevronDown, Loader2, MessageSquare, Pencil,
  Plus, Send, Sparkles, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { UserAvatar } from '@/components/admin/UserAvatar'
import { MarkdownMessage } from '@/components/admin/AIMarkdown'

type Provider = 'gemini' | 'openai' | 'anthropic'
type Message = { role: 'user' | 'assistant'; content: string }
type Conversation = {
  id: string
  title: string
  provider: Provider
  model: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const PROVIDERS: { id: Provider; label: string; free?: boolean; color: string; models: { id: string; label: string }[] }[] = [
  {
    id: 'gemini', label: 'Gemini', free: true, color: '#22C55E',
    models: [
      { id: 'gemini-2.0-flash', label: '2.0 Flash' },
      { id: 'gemini-1.5-flash', label: '1.5 Flash' },
    ],
  },
  {
    id: 'openai', label: 'GPT', color: '#A855F7',
    models: [
      { id: 'gpt-4o-mini', label: '4o mini' },
      { id: 'gpt-4o', label: '4o' },
    ],
  },
  {
    id: 'anthropic', label: 'Claude', color: '#F59E0B',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
    ],
  },
]

const QUICK = [
  { label: 'Featured projects SQL', prompt: 'Write SQL to get my top featured portfolio projects ordered by sort_order' },
  { label: 'Unread messages count', prompt: 'SQL to count contact_messages grouped by status' },
  { label: 'Visitors by country', prompt: 'SQL to get visitor count by country from visitor_logs in the last 7 days' },
  { label: 'Top blog posts', prompt: 'SQL to show blog_posts sorted by views descending' },
  { label: 'Recent audit log', prompt: 'SQL to see last 20 admin actions from audit_logs' },
]

const STORAGE_KEY = 'admin_ai_conversations'

function genId() { return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 50)))
}

function makeTitle(messages: Message[]) {
  const first = messages.find((m) => m.role === 'user')?.content ?? 'New chat'
  return first.length > 40 ? first.slice(0, 40) + '…' : first
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AIPage() {
  usePageTitle('AI Assistant')
  const { getAdminHeaders, authInfo } = useAdminAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [provider, setProvider] = useState<Provider>('gemini')
  const [model, setModel] = useState('gemini-2.0-flash')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const convs = loadConversations()
    setConversations(convs)
    if (convs.length > 0) {
      const latest = convs[0]
      setActiveId(latest.id)
      setProvider(latest.provider)
      setModel(latest.model)
      setMessages(latest.messages)
    }

    // Live-sync when sidebar saves a conversation to localStorage
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      setConversations(loadConversations())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function newChat() {
    setActiveId(null)
    setMessages([])
    setInput('')
  }

  function selectConversation(conv: Conversation) {
    setActiveId(conv.id)
    setProvider(conv.provider)
    setModel(conv.model)
    setMessages(conv.messages)
    setInput('')
  }

  function deleteConversation(id: string) {
    const updated = conversations.filter((c) => c.id !== id)
    setConversations(updated)
    saveConversations(updated)
    if (activeId === id) {
      if (updated.length > 0) selectConversation(updated[0])
      else newChat()
    }
  }

  function switchProvider(p: Provider) {
    setProvider(p)
    const first = PROVIDERS.find((x) => x.id === p)!.models[0]
    setModel(first.id)
    setShowModelPicker(false)
  }

  function saveCurrentConversation(id: string, msgs: Message[], prov: Provider, mdl: string) {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === id)
      const now = new Date().toISOString()
      let updated: Conversation[]
      if (exists) {
        updated = prev.map((c) =>
          c.id === id ? { ...c, messages: msgs, title: makeTitle(msgs), updatedAt: now } : c
        )
      } else {
        const newConv: Conversation = {
          id, title: makeTitle(msgs), provider: prov, model: mdl, messages: msgs,
          createdAt: now, updatedAt: now,
        }
        updated = [newConv, ...prev]
      }
      saveConversations(updated)
      return updated
    })
  }

  async function send(userMessage?: string) {
    const text = (userMessage ?? input).trim()
    if (!text || streaming) return

    const convId = activeId ?? genId()
    if (!activeId) setActiveId(convId)

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, provider, model }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const u = [...prev]
          u[u.length - 1] = { role: 'assistant', content: acc }
          return u
        })
      }

      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: acc }]
      setMessages(finalMessages)
      saveCurrentConversation(convId, finalMessages, provider, model)
    } catch (err) {
      const msg = (err as Error).message
      setMessages((prev) => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: `Error: ${msg}` }
        return u
      })
      toast.error(msg)
    } finally {
      setStreaming(false)
    }
  }

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!
  const currentModel = currentProvider.models.find((m) => m.id === model) ?? currentProvider.models[0]
  const color = currentProvider.color

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Conversation History ── */}
      <div className="flex w-56 shrink-0 flex-col border-r border-[#27272A] bg-[#0a0a0a]">
        <div className="border-b border-[#27272A] px-3 py-3">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center gap-2 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-xs font-medium text-[#A1A1AA] transition-colors hover:border-[#409EFE]/30 hover:bg-[#409EFE]/5 hover:text-[#409EFE]"
          >
            <Plus className="size-3.5" />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-[11px] text-[#3f3f46]">No history yet</p>
          ) : (
            conversations.map((conv) => {
              const p = PROVIDERS.find((x) => x.id === conv.provider)!
              return (
                <div key={conv.id} className="group relative px-2">
                  {editingId === conv.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => {
                        if (editTitle.trim()) {
                          setConversations((prev) => {
                            const updated = prev.map((c) => c.id === conv.id ? { ...c, title: editTitle.trim() } : c)
                            saveConversations(updated)
                            return updated
                          })
                        }
                        setEditingId(null)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      className="w-full rounded-lg border border-[#409EFE]/40 bg-[#18181B] px-2 py-1.5 text-[11px] text-[#FAFAFA] focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        activeId === conv.id
                          ? 'bg-[#18181B] text-[#FAFAFA]'
                          : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-[#FAFAFA]'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="size-3 shrink-0" style={{ color: p.color }} />
                        <span className="truncate text-[11px] font-medium">{conv.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#3f3f46]">{p.label}</span>
                        <span className="text-[10px] text-[#3f3f46]">·</span>
                        <span className="text-[10px] text-[#3f3f46]">{timeLabel(conv.updatedAt)}</span>
                      </div>
                    </button>
                  )}

                  {activeId === conv.id && editingId !== conv.id && (
                    <div className="absolute right-3 top-1.5 hidden items-center gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title) }}
                        className="grid size-5 place-items-center rounded text-[#3f3f46] hover:text-[#A1A1AA]"
                      >
                        <Pencil className="size-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                        className="grid size-5 place-items-center rounded text-[#3f3f46] hover:text-[#EF4444]"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Main: Chat Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Provider + model selector bar */}
        <div className="flex items-center gap-3 border-b border-[#27272A] px-5 py-2.5">
          <div className="flex rounded-lg border border-[#27272A] bg-[#18181B] p-0.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => switchProvider(p.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                  provider === p.id ? 'text-[#FAFAFA]' : 'text-[#52525b] hover:text-[#A1A1AA]'
                )}
                style={provider === p.id ? { backgroundColor: p.color + '20', color: p.color } : {}}
              >
                {p.label}
                {p.free && (
                  <span className="rounded px-1 py-px text-[9px] font-bold" style={{ backgroundColor: p.color + '20', color: p.color }}>
                    FREE
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Model picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-2.5 py-1.5 text-[11px] text-[#A1A1AA] hover:text-[#FAFAFA]"
            >
              <Brain className="size-3" style={{ color }} />
              {currentModel.label}
              <ChevronDown className="size-3" />
            </button>
            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowModelPicker(false)} />
                <div className="absolute left-0 top-9 z-20 overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B] py-1 shadow-xl">
                  {currentProvider.models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setModel(m.id); setShowModelPicker(false) }}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-[12px] transition-colors hover:bg-[#27272A]',
                        model === m.id ? 'text-[#FAFAFA]' : 'text-[#A1A1AA]'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span className="ml-auto text-[11px] text-[#3f3f46]">
            {messages.length > 0 ? `${Math.ceil(messages.length / 2)} exchanges` : 'New conversation'}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-8">
              <div className="text-center">
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-[#27272A] bg-[#18181B]">
                  <Brain className="size-6" style={{ color }} />
                </div>
                <p className="text-sm font-semibold text-[#FAFAFA]">
                  {currentProvider.label} Assistant
                </p>
                <p className="mt-1 text-[12px] text-[#52525b]">
                  SQL queries · content · analytics · schema
                </p>
              </div>

              <div className="w-full space-y-2">
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                  Quick prompts
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {QUICK.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => send(q.prompt)}
                      className="flex items-center gap-2.5 rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3 text-left text-[11px] text-[#A1A1AA] transition-colors hover:border-[#3f3f46] hover:text-[#FAFAFA]"
                    >
                      <Sparkles className="size-3 shrink-0" style={{ color }} />
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-5">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={i} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
                    {isUser ? (
                      <UserAvatar
                        avatarUrl={authInfo?.avatarUrl}
                        githubUsername={authInfo?.githubUsername}
                        name={authInfo?.displayName || authInfo?.githubUsername || 'Me'}
                        size="sm"
                      />
                    ) : (
                      <div
                        className="grid size-7 shrink-0 place-items-center rounded-full text-xs"
                        style={{ backgroundColor: color + '20', color }}
                      >
                        <Brain className="size-3.5" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                      isUser
                        ? 'rounded-tr-none bg-[#409EFE]/10 text-[#FAFAFA]'
                        : 'rounded-tl-none bg-[#18181B] text-[#FAFAFA]'
                    )}>
                      {msg.content === '' && !isUser
                        ? <Loader2 className="size-4 animate-spin text-[#52525b]" />
                        : isUser
                          ? <p className="text-sm leading-relaxed">{msg.content}</p>
                          : <MarkdownMessage content={msg.content} />
                      }
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#27272A] px-6 py-4">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-3 rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3 focus-within:border-[#409EFE]/30">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                placeholder={`Ask ${currentProvider.label} about your database, generate SQL, write content…`}
                rows={1}
                className="flex-1 resize-none bg-transparent py-0.5 text-sm text-[#FAFAFA] placeholder:text-[#3f3f46] focus:outline-none"
                style={{ maxHeight: '120px' }}
                onInput={(e) => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 120)}px`
                }}
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={!input.trim() || streaming}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-white disabled:opacity-40"
                style={{ backgroundColor: color }}
              >
                {streaming
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Send className="size-3.5" />
                }
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-[#3f3f46]">
              Enter to send · Shift+Enter for new line · history saved locally
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
