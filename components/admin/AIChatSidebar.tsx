'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowUpRight, Brain, ChevronDown, ExternalLink, Loader2, Plus,
  Send, Sparkles, Trash2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { UserAvatar } from '@/components/admin/UserAvatar'
import { MarkdownMessage } from '@/components/admin/AIMarkdown'

type Message = { role: 'user' | 'assistant'; content: string }
type Provider = 'gemini' | 'openai' | 'anthropic'
type Conversation = {
  id: string
  title: string
  provider: Provider
  model: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'admin_ai_conversations'

const PROVIDERS: { id: Provider; label: string; free?: boolean; models: { id: string; label: string }[] }[] = [
  {
    id: 'gemini', label: 'Gemini', free: true,
    models: [
      { id: 'gemini-2.0-flash', label: '2.0 Flash' },
      { id: 'gemini-1.5-flash', label: '1.5 Flash' },
    ],
  },
  {
    id: 'openai', label: 'GPT',
    models: [
      { id: 'gpt-4o-mini', label: '4o mini' },
      { id: 'gpt-4o', label: '4o' },
    ],
  },
  {
    id: 'anthropic', label: 'Claude',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
    ],
  },
]

const QUICK = [
  'Show featured portfolio projects SQL',
  'Count unread contact messages',
  'Recent visitors by country this week',
  'Blog posts sorted by views',
]

const PROVIDER_COLORS: Record<Provider, string> = {
  gemini: '#22C55E',
  openai: '#A855F7',
  anthropic: '#F59E0B',
}

function genId() { return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function makeTitle(messages: Message[]) {
  const first = messages.find((m) => m.role === 'user')?.content ?? 'New chat'
  return first.length > 40 ? first.slice(0, 40) + '…' : first
}

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function saveConversation(conv: Conversation) {
  const existing = loadConversations()
  const idx = existing.findIndex((c) => c.id === conv.id)
  const updated = idx >= 0
    ? existing.map((c) => c.id === conv.id ? conv : c)
    : [conv, ...existing]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)))
}

export function AIChatSidebar({ onClose }: { onClose: () => void }) {
  const { getAdminHeaders, authInfo } = useAdminAuth()
  const [provider, setProvider] = useState<Provider>('gemini')
  const [model, setModel] = useState('gemini-2.0-flash')
  const [messages, setMessages] = useState<Message[]>([])
  const [convId, setConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // On open: load latest conversation from shared storage
  useEffect(() => {
    const convs = loadConversations()
    if (convs.length > 0) {
      const latest = convs[0]
      setConvId(latest.id)
      setProvider(latest.provider)
      setModel(latest.model)
      setMessages(latest.messages)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function switchProvider(p: Provider) {
    setProvider(p)
    setModel(PROVIDERS.find((x) => x.id === p)!.models[0].id)
    setShowModelPicker(false)
  }

  function newChat() {
    setConvId(null)
    setMessages([])
    setInput('')
  }

  async function send(userMessage?: string) {
    const text = (userMessage ?? input).trim()
    if (!text || streaming) return

    const id = convId ?? genId()
    if (!convId) setConvId(id)

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

      // Sync to shared localStorage (AI Center reads this)
      saveConversation({
        id,
        title: makeTitle(finalMessages),
        provider,
        model,
        messages: finalMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
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

  function clearChat() {
    setConvId(null)
    setMessages([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const color = PROVIDER_COLORS[provider]
  const currentProvider = PROVIDERS.find((p) => p.id === provider)!
  const currentModel = currentProvider.models.find((m) => m.id === model) ?? currentProvider.models[0]

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-[#27272A] bg-[#09090B]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="size-4" style={{ color }} />
          <span className="text-sm font-semibold text-[#FAFAFA]">AI Assistant</span>
          {currentProvider.free && (
            <span className="rounded border border-[#22C55E]/20 bg-[#22C55E]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#22C55E]">FREE</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* New chat */}
          <button
            type="button"
            onClick={newChat}
            title="New chat"
            className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#3f3f46] hover:border-[#3f3f46] hover:text-[#A1A1AA]"
          >
            <Plus className="size-3.5" />
          </button>
          {/* Clear */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              title="Clear chat"
              className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#3f3f46] hover:border-[#EF4444]/30 hover:text-[#EF4444]"
            >
              <Trash2 className="size-3" />
            </button>
          )}
          {/* Open AI Center */}
          <Link
            href="/admin/ai"
            onClick={onClose}
            title="Open AI Center"
            className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#3f3f46] hover:border-[#409EFE]/30 hover:text-[#409EFE]"
          >
            <ExternalLink className="size-3.5" />
          </Link>
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#52525b] hover:border-[#3f3f46] hover:text-[#FAFAFA]"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Provider + model selector */}
      <div className="flex items-center gap-2 border-b border-[#27272A] px-4 py-2.5">
        <div className="flex rounded-lg border border-[#27272A] bg-[#18181B] p-0.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => switchProvider(p.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                provider === p.id ? 'text-[#FAFAFA]' : 'text-[#52525b] hover:text-[#A1A1AA]'
              )}
              style={provider === p.id ? { backgroundColor: PROVIDER_COLORS[p.id] + '20', color: PROVIDER_COLORS[p.id] } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowModelPicker((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-[#27272A] bg-[#18181B] px-2 py-1 text-[11px] text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            {currentModel.label}
            <ChevronDown className="size-3" />
          </button>
          {showModelPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowModelPicker(false)} />
              <div className="absolute right-0 top-8 z-20 overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B] py-1 shadow-xl">
                {currentProvider.models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setModel(m.id); setShowModelPicker(false) }}
                    className={cn(
                      'block w-full px-3.5 py-2 text-left text-[12px] transition-colors hover:bg-[#27272A]',
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-center text-[11px] text-[#3f3f46]">Ask anything about your database</p>
            <div className="space-y-1.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="flex w-full items-center gap-2 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-left text-[11px] text-[#A1A1AA] transition-colors hover:border-[#3f3f46] hover:text-[#FAFAFA]"
                >
                  <Sparkles className="size-3 shrink-0" style={{ color }} />
                  {q}
                </button>
              ))}
            </div>
            {/* Link to AI Center full page */}
            <Link
              href="/admin/ai"
              onClick={onClose}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#27272A] px-3 py-2 text-[11px] text-[#52525b] transition-colors hover:border-[#409EFE]/30 hover:text-[#409EFE]"
            >
              <ArrowUpRight className="size-3" />
              Open full AI Center
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user'
              return (
                <div key={i} className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
                  {isUser ? (
                    <UserAvatar
                      avatarUrl={authInfo?.avatarUrl}
                      githubUsername={authInfo?.githubUsername}
                      name={authInfo?.displayName || authInfo?.githubUsername || 'Me'}
                      size="sm"
                    />
                  ) : (
                    <div
                      className="grid size-7 shrink-0 place-items-center rounded-full"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      <Brain className="size-3.5" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed',
                    isUser ? 'rounded-tr-none bg-[#409EFE]/10 text-[#FAFAFA]' : 'rounded-tl-none bg-[#18181B] text-[#FAFAFA]'
                  )}>
                    {msg.content === '' && !isUser
                      ? <Loader2 className="size-3.5 animate-spin text-[#52525b]" />
                      : isUser
                        ? <p className="text-[12px] leading-relaxed">{msg.content}</p>
                        : <MarkdownMessage content={msg.content} compact />
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
      <div className="border-t border-[#27272A] px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-[#27272A] bg-[#18181B] px-3 py-2 focus-within:border-[#409EFE]/30">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask or type SQL…"
            rows={1}
            className="flex-1 resize-none bg-transparent py-0.5 text-[12px] text-[#FAFAFA] placeholder:text-[#3f3f46] focus:outline-none"
            style={{ maxHeight: '80px' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 80)}px`
            }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-white disabled:opacity-40"
            style={{ backgroundColor: color }}
          >
            {streaming ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[10px] text-[#3f3f46]">Enter · Shift+Enter new line</p>
          {convId && (
            <Link
              href="/admin/ai"
              onClick={onClose}
              className="flex items-center gap-1 text-[10px] text-[#3f3f46] transition-colors hover:text-[#409EFE]"
            >
              View in AI Center
              <ArrowUpRight className="size-2.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
