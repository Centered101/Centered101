'use client'

import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="rounded bg-[#27272A] px-1.5 py-0.5 font-mono text-[11px] text-[#22C55E]">{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-[#FAFAFA]">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic text-[#A1A1AA]">{part.slice(1, -1)}</em>
    return part
  })
}

function InlineMarkdown({ text, compact }: { text: string; compact?: boolean }) {
  if (!text.trim()) return null
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const sz = compact ? 'text-[12px]' : 'text-sm'
    if (line.startsWith('### ')) nodes.push(<p key={i} className={`mt-1 ${sz} font-semibold text-[#FAFAFA]`}>{parseInline(line.slice(4))}</p>)
    else if (line.startsWith('## ')) nodes.push(<p key={i} className={`mt-1 ${sz} font-bold text-[#FAFAFA]`}>{parseInline(line.slice(3))}</p>)
    else if (line.startsWith('# ')) nodes.push(<p key={i} className={`mt-1 ${compact ? 'text-sm' : 'text-base'} font-bold text-[#FAFAFA]`}>{parseInline(line.slice(2))}</p>)
    else if (line.match(/^[-*] /)) nodes.push(<div key={i} className={`flex gap-2 ${sz}`}><span className="mt-0.5 text-[#52525b]">•</span><span>{parseInline(line.slice(2))}</span></div>)
    else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1]
      nodes.push(<div key={i} className={`flex gap-2 ${sz}`}><span className="shrink-0 text-[#52525b]">{num}.</span><span>{parseInline(line.replace(/^\d+\. /, ''))}</span></div>)
    } else if (!line.trim()) nodes.push(<div key={i} className="h-1.5" />)
    else nodes.push(<p key={i} className={`${sz} leading-relaxed`}>{parseInline(line)}</p>)
  }
  return <div className="space-y-0.5 text-[#FAFAFA]">{nodes}</div>
}

function CodeBlock({ lang, code, compact }: { lang: string; code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
      <div className="flex items-center justify-between border-b border-[#27272A] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#3f3f46]">{lang || 'code'}</span>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="flex items-center gap-1 text-[10px] text-[#3f3f46] transition-colors hover:text-[#A1A1AA]"
        >
          {copied ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
        </button>
      </div>
      <pre className={`overflow-x-auto px-3 py-2.5 font-mono ${compact ? 'text-[11px]' : 'text-[12px]'} leading-relaxed text-[#A1A1AA]`}>{code}</pre>
    </div>
  )
}

export function MarkdownMessage({ content, compact }: { content: string; compact?: boolean }) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/)
          const lang = m?.[1] || ''
          const code = (m?.[2] ?? part.slice(3, -3)).trim()
          return <CodeBlock key={i} lang={lang} code={code} compact={compact} />
        }
        return <InlineMarkdown key={i} text={part} compact={compact} />
      })}
    </div>
  )
}
