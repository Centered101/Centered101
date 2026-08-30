'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ImagePlus, Lightbulb, MessageSquare, TriangleAlert, X } from 'lucide-react'

import { useActionToast } from '@/components/work/forms'
import { submitFeedback } from '@/lib/work/services/feedback'
import type { ActionState } from '@/lib/work/services/projects'
import {
  FEEDBACK_MESSAGE_MAX,
  describeImageRejection,
} from '@/lib/work/validation/feedback'
import type { FeedbackKind } from '@/lib/work/types/enums'

/**
 * The feedback control in the topbar.
 *
 * Modelled on Supabase's widget, which gets two things right and is worth
 * copying for both:
 *
 *   1. IT ASKS "issue or idea" FIRST. One question, before the textarea, and
 *      it is the only piece of triage the person typing can answer better than
 *      the person reading. Everything else — who they are, where they were,
 *      what browser — the server already knows and never asks for.
 *
 *   2. IT NEVER LEAVES THE PAGE. The report is worth having precisely because
 *      it is written while the thing is on screen; a link to a form somewhere
 *      else collects the reports people care enough about to retype, which is
 *      not the same set.
 *
 * What is NOT copied is the look. This is a light workspace on #409EFE with
 * 18px corners, so the two choices are cards in the workspace's own palette
 * rather than Supabase's dark tiles.
 *
 * THE PANEL IS A FORM POSTING TO A SERVER ACTION, not a fetch. That is what
 * lets the screenshot ride along as a real multipart file with no upload
 * endpoint, and it keeps the pending state in `useFormStatus` territory like
 * every other form in the app.
 */

const EMPTY: ActionState = {}

const KINDS: {
  value: FeedbackKind
  label: string
  hint: string
  placeholder: string
  icon: typeof TriangleAlert
  tone: 'issue' | 'idea'
}[] = [
  {
    value: 'ISSUE',
    label: 'ปัญหา',
    hint: 'ที่พบระหว่างใช้งาน',
    placeholder: 'ปัญหาที่ฉันพบคือ...',
    icon: TriangleAlert,
    tone: 'issue',
  },
  {
    value: 'IDEA',
    label: 'ไอเดีย',
    hint: 'ที่อยากให้พัฒนาต่อ',
    placeholder: 'ไอเดียของฉันคือ...',
    icon: Lightbulb,
    tone: 'idea',
  },
]

export function FeedbackMenu({ helpHref }: { helpHref: string }) {
  const [open, setOpen] = useState(false)
  // Null is the first screen — the choice. Picking a kind is what opens the
  // textarea, so the panel never shows a box before it knows what goes in it.
  const [kind, setKind] = useState<FeedbackKind | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const pathname = usePathname()
  const [state, formAction] = useActionState(submitFeedback, EMPTY)

  // Sonner reports the result, the same as every other action in the app. The
  // callback runs once per success and returns the panel to its resting state,
  // so the next report does not start inside the last one.
  useActionToast(state, () => {
    setOpen(false)
    setKind(null)
    setAttachment(null)
    setAttachmentError(null)
  })

  // Same dismissal contract as the notification bell next door: an outside
  // click or Escape closes it, so it behaves like a menu rather than a panel
  // you have to hit the button again to get rid of.
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Choosing a kind is a click; typing the report is the point. Moving focus
  // saves the second click that every one of these widgets otherwise costs.
  useEffect(() => {
    if (kind) textareaRef.current?.focus()
  }, [kind])

  const selected = KINDS.find((option) => option.value === kind) ?? null

  function pickAttachment(file: File | null) {
    if (!file) {
      setAttachment(null)
      setAttachmentError(null)
      return
    }
    // Checked here AND on the server (services/feedback.ts). This copy exists
    // to say no before a 5 MB upload starts, not to be the rule.
    const rejection = describeImageRejection(file)
    setAttachmentError(rejection)
    setAttachment(rejection ? null : file)
  }

  function clearAttachment() {
    setAttachment(null)
    setAttachmentError(null)
    // The input keeps its own FileList, which is what the form actually
    // submits — clearing the state without clearing the element would send a
    // file the user thinks they removed.
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggle() {
    setOpen((wasOpen) => !wasOpen)
  }

  return (
    <div className="feedback" ref={rootRef}>
      <button
        type="button"
        className="feedback-trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MessageSquare size={15} />
        <span>ความคิดเห็น</span>
      </button>

      {open && (
        <div className="feedback-panel" role="dialog" aria-label="ส่งความคิดเห็น">
          {!selected ? (
            <>
              <div className="feedback-head">
                <strong>อยากบอกอะไรกับเราบ้าง?</strong>
                <small className="muted">ทีมงานอ่านทุกข้อความ</small>
              </div>
              <div className="feedback-choices">
                {KINDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`feedback-choice ${option.tone}`}
                    onClick={() => setKind(option.value)}
                  >
                    <option.icon size={20} />
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form className="feedback-form" action={formAction}>
              {/* The three fields the browser is trusted with. Everything else
                  on the row — author, email, user agent — is read on the
                  server, where the page cannot choose it. */}
              <input type="hidden" name="kind" value={selected.value} />
              <input type="hidden" name="pagePath" value={pathname} />

              <div className="feedback-head feedback-head-row">
                <button
                  type="button"
                  className="feedback-back"
                  onClick={() => setKind(null)}
                  aria-label="เลือกประเภทใหม่"
                >
                  <ArrowLeft size={14} />
                </button>
                <strong>{selected.label}</strong>
              </div>

              <textarea
                ref={textareaRef}
                name="message"
                required
                rows={5}
                maxLength={FEEDBACK_MESSAGE_MAX}
                placeholder={selected.placeholder}
                className="feedback-textarea"
              />

              {attachment && (
                <div className="feedback-attachment">
                  <ImagePlus size={13} />
                  <span>{attachment.name}</span>
                  <button type="button" onClick={clearAttachment} aria-label="เอารูปออก">
                    <X size={13} />
                  </button>
                </div>
              )}
              {attachmentError && <p className="field-error">{attachmentError}</p>}

              <div className="feedback-actions">
                <Link href={helpHref} className="feedback-help" onClick={() => setOpen(false)}>
                  ขอความช่วยเหลือแทน
                </Link>

                <div className="feedback-send">
                  {/* Hidden rather than styled: a file input cannot be made to
                      look like the rest of this panel in any browser, and the
                      label below is a real control for keyboard users. */}
                  <input
                    ref={fileRef}
                    type="file"
                    name="screenshot"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="feedback-file"
                    id="feedback-screenshot"
                    onChange={(event) => pickAttachment(event.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="feedback-screenshot"
                    className="icon-btn feedback-attach"
                    title="แนบภาพหน้าจอ"
                  >
                    <ImagePlus size={15} />
                  </label>
                  <FeedbackSubmit />
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The send button.
 *
 * Its own component so `useFormStatus` reads the form above it — called from
 * FeedbackMenu it would report idle forever, because the hook looks at the
 * nearest form ANCESTOR and the component rendering a form is not inside it.
 *
 * Not `SubmitButton` from components/work/forms: that one renders the app's
 * full-width form buttons, and this sits in a toolbar next to an icon.
 */
function FeedbackSubmit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="feedback-submit" disabled={pending}>
      {pending ? 'กำลังส่ง...' : 'ส่ง'}
    </button>
  )
}
