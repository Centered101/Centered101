'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  Lightbulb,
  Mail,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'

import { useActionToast } from '@/components/work/forms'
import { useStripWorkPrefix } from '@/components/work/layout/work-link-context'
import { LEGAL } from '@/lib/work/legal'
import { workHref } from '@/lib/work/nav'
import { submitFeedback } from '@/lib/work/services/feedback'
import type { ActionState } from '@/lib/work/services/projects'
import { FEEDBACK_MESSAGE_MAX, describeImageRejection } from '@/lib/work/validation/feedback'
import type { FeedbackKind } from '@/lib/work/types/enums'

/**
 * The feedback control in the topbar.
 *
 * Modelled on Supabase's widget, which gets three things right and is worth
 * copying for all of them:
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
 *   3. IT OFFERS HELP AS A SIBLING, not as a rejection. Half of what arrives
 *      in a feedback box is really "I am stuck" — so the panel flips to a list
 *      of places that can actually answer that, and flips back. Both
 *      directions matter: someone who opened help and found nothing must not
 *      have to hunt for the feedback button again.
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

/** Which of the three screens the panel is showing. */
type Screen = 'choose' | 'write' | 'help'

export function FeedbackMenu({ changeRequestsHref }: { changeRequestsHref: string }) {
  const [open, setOpen] = useState(false)
  // 'choose' is the resting screen. Picking a kind is what opens the textarea,
  // so the panel never shows a box before it knows what goes in it.
  const [screen, setScreen] = useState<Screen>('choose')
  const [kind, setKind] = useState<FeedbackKind | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  // True only for the frame or two while the page is being photographed.
  const [capturing, setCapturing] = useState(false)
  // The lightbox showing `attachment` full-size. A separate flag from
  // `attachment` itself so clearing the file also closes it in one place
  // (clearAttachment) rather than every reader of `attachment` needing to
  // remember to check both.
  const [previewOpen, setPreviewOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const attachRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const pathname = usePathname()
  const [state, formAction] = useActionState(submitFeedback, EMPTY)

  // A fresh object URL per attachment (captured or uploaded), revoked when
  // it's replaced or cleared — otherwise each one leaks the previous blob
  // for the life of the tab.
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!attachment) {
      setAttachmentUrl(null)
      return
    }
    const url = URL.createObjectURL(attachment)
    setAttachmentUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [attachment])

  // Sonner reports the result, the same as every other action in the app. The
  // callback runs once per success and returns the panel to its resting state,
  // so the next report does not start inside the last one.
  useActionToast(state, () => {
    setOpen(false)
    setScreen('choose')
    setKind(null)
    setAttachment(null)
    setAttachmentError(null)
    setPreviewOpen(false)
  })

  // Same dismissal contract as the notification bell next door: an outside
  // click or Escape closes it, so it behaves like a menu rather than a panel
  // you have to hit the button again to get rid of.
  //
  // The attach menu is a menu inside that menu, and the preview lightbox is
  // a layer on top of everything, so Escape closes the topmost one first —
  // one keypress undoing three decisions at once would cost more retyping
  // than it saves clicks.
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (previewOpen) return // its own backdrop handles this
      const target = event.target as Node
      if (!rootRef.current?.contains(target)) {
        setOpen(false)
        return
      }
      if (attachRef.current && !attachRef.current.contains(target)) setAttachOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (previewOpen) setPreviewOpen(false)
      else if (attachOpen) setAttachOpen(false)
      else setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, attachOpen, previewOpen])

  // Choosing a kind is a click; typing the report is the point. Moving focus
  // saves the second click that every one of these widgets otherwise costs.
  useEffect(() => {
    if (screen === 'write') textareaRef.current?.focus()
  }, [screen])

  const selected = KINDS.find((option) => option.value === kind) ?? KINDS[0]

  /**
   * Accepts a file into the form, whether it was chosen or photographed.
   *
   * The <input> is what the form actually submits, so a captured image has to
   * be written INTO it rather than held beside it in state — a `File` in a
   * useState is not a form field and would never reach the action.
   */
  function attach(file: File) {
    const rejection = describeImageRejection(file)
    setAttachmentError(rejection)

    if (rejection) {
      setAttachment(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    if (fileRef.current) {
      const transfer = new DataTransfer()
      transfer.items.add(file)
      fileRef.current.files = transfer.files
    }
    setAttachment(file)
  }

  function clearAttachment() {
    setAttachment(null)
    setAttachmentError(null)
    setPreviewOpen(false)
    // The input keeps its own FileList, which is what the form submits —
    // clearing the state alone would send a file the user thinks they removed.
    if (fileRef.current) fileRef.current.value = ''
  }

  /**
   * Photographs the page the user is looking at.
   *
   * RENDERED FROM THE DOM, not from a screen-capture stream. `getDisplayMedia`
   * would be dependency-free, but it asks the operating system for permission
   * and then asks the user to pick a window — three decisions to attach one
   * image, and nothing at all on a phone. Painting the DOM to a canvas asks for
   * nothing and produces the same picture.
   *
   * html2canvas-pro is loaded ON DEMAND. It is a large library that most people
   * will never trigger, and a static import would put it in the bundle of every
   * page in the workspace.
   *
   * VIEWPORT ONLY. A full-document capture of a long invoice table is several
   * megabytes of content nobody was looking at; what matters is what was on
   * screen when they reached for the button.
   *
   * The panel hides itself first — a screenshot of the feedback form is not a
   * screenshot of the problem.
   */
  async function captureScreen() {
    setAttachOpen(false)
    setAttachmentError(null)
    setCapturing(true)

    // Hiding the widget is only meant to last "a frame or two" (see above).
    // html2canvas has no timeout of its own, and the cross-origin avatar
    // refetch below (useCORS) can stall instead of failing outright — with
    // nothing racing it, that leaves `capturing` true and the whole widget
    // invisible indefinitely. This bounds the wait so the button always
    // comes back, even when the capture itself never settles.
    let timedOut = false
    const timeout = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        timedOut = true
        reject(new Error('screen capture timed out'))
      }, 8000)
    })

    try {
      // Two frames: one for React to commit the hidden panel, one for the
      // browser to paint it. Capturing after a single frame photographs the
      // panel that is on its way out.
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      })

      const { default: html2canvas } = await import('html2canvas-pro')
      const canvas = await Promise.race([
        html2canvas(document.body, {
          backgroundColor: null,
          // Capped at 2: a 3x phone screen triples the file size for detail
          // nobody reads in a bug report.
          scale: Math.min(window.devicePixelRatio || 1, 2),
          x: window.scrollX,
          y: window.scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
          logging: false,
          // The sidebar's account chip is a Google avatar (lh3.googleusercontent.com)
          // — cross-origin, and in dev next/image links straight to it instead of
          // proxying through same-origin /_next/image (next.config.mjs sets
          // `images.unoptimized` there). Without this, html2canvas draws that <img>
          // onto the canvas untainted-check-free, the canvas is marked tainted, and
          // `toBlob()` below throws a SecurityError — this asks html2canvas to
          // (re-)fetch cross-origin images in CORS mode, which Google's avatar CDN
          // permits, so the canvas stays exportable.
          useCORS: true,
        }),
        timeout,
      ])

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (!blob) throw new Error('canvas produced no blob')

      attach(new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' }))
    } catch (error) {
      // A capture that fails must not cost the message that was already typed,
      // so this reports beside the attach button and leaves the form alone.
      console.error('[feedback] screen capture failed:', error)
      setAttachmentError(
        timedOut
          ? 'จับภาพหน้าจอใช้เวลานานเกินไป ลองใหม่หรืออัปโหลดรูปแทนได้'
          : 'จับภาพหน้าจอไม่สำเร็จ ลองอัปโหลดรูปแทนได้',
      )
    } finally {
      setCapturing(false)
    }
  }

  function openPanel() {
    setOpen((wasOpen) => !wasOpen)
    setAttachOpen(false)
  }

  return (
    <div className={`feedback${capturing ? ' feedback-capturing' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="feedback-trigger"
        onClick={openPanel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MessageSquare size={15} />
        <span>ความคิดเห็น</span>
      </button>

      {open && <div className="feedback-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      {open && (
        <div className="feedback-panel" role="dialog" aria-label="ส่งความคิดเห็น">
          {screen === 'choose' && (
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
                    onClick={() => {
                      setKind(option.value)
                      setScreen('write')
                    }}
                  >
                    <option.icon size={20} />
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="feedback-switch"
                onClick={() => setScreen('help')}
              >
                ขอความช่วยเหลือแทน
              </button>
            </>
          )}

          {screen === 'write' && (
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
                  onClick={() => setScreen('choose')}
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
                  <button
                    type="button"
                    className="feedback-attachment-name"
                    onClick={() => setPreviewOpen(true)}
                    disabled={!attachmentUrl}
                  >
                    {attachmentUrl ? (
                      // Visible without a click — the full-size lightbox
                      // (on click) is for confirming detail, not for seeing
                      // that the right picture got attached at all. Sized
                      // inline as well as by class: an unscaled screenshot
                      // is thousands of pixels wide, and this thumbnail must
                      // never render at that native size while the stylesheet
                      // is mid-reload.
                      <img
                        src={attachmentUrl}
                        alt=""
                        className="feedback-attachment-thumb"
                        style={{ width: 22, height: 22, maxWidth: 22, maxHeight: 22 }}
                      />
                    ) : (
                      <ImagePlus size={13} />
                    )}
                    <span>{attachment.name}</span>
                  </button>
                  <button type="button" onClick={clearAttachment} aria-label="เอารูปออก">
                    <X size={13} />
                  </button>
                </div>
              )}
              {attachmentError && <p className="field-error">{attachmentError}</p>}

              <div className="feedback-actions">
                <button
                  type="button"
                  className="feedback-switch"
                  onClick={() => setScreen('help')}
                >
                  ขอความช่วยเหลือแทน
                </button>

                <div className="feedback-send">
                  {/* Hidden rather than styled: a file input cannot be made to
                      look like the rest of this panel in any browser. It stays
                      a real, focusable field — the attach button below opens a
                      menu, and "อัปโหลดรูปภาพ" clicks this. */}
                  <input
                    ref={fileRef}
                    type="file"
                    name="screenshot"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="feedback-file"
                    id="feedback-screenshot"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) attach(file)
                    }}
                  />

                  <div className="feedback-attach-wrap" ref={attachRef}>
                    <button
                      type="button"
                      className="icon-btn feedback-attach"
                      onClick={() => setAttachOpen((menuOpen) => !menuOpen)}
                      aria-expanded={attachOpen}
                      aria-haspopup="menu"
                      aria-label="แนบภาพหน้าจอ"
                      disabled={capturing}
                    >
                      <ImagePlus size={15} />
                    </button>

                    {attachOpen && (
                      <div className="feedback-attach-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAttachOpen(false)
                            fileRef.current?.click()
                          }}
                        >
                          <Upload size={14} />
                          อัปโหลดรูปภาพ
                        </button>
                        <button type="button" role="menuitem" onClick={captureScreen}>
                          <Camera size={14} />
                          จับภาพหน้าจอ
                        </button>
                      </div>
                    )}
                  </div>

                  <FeedbackSubmit capturing={capturing} />
                </div>
              </div>
            </form>
          )}

          {screen === 'help' && <HelpScreen changeRequestsHref={changeRequestsHref} onBack={() => setScreen('choose')} onClose={() => setOpen(false)} />}
        </div>
      )}

      {previewOpen && attachmentUrl && (
        <div
          className="feedback-preview-backdrop"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-label="ตัวอย่างรูปที่แนบ"
        >
          {/* The stopPropagation is the whole point: clicking the backdrop
              closes the preview, clicking the picture itself must not. */}
          <img
            src={attachmentUrl}
            alt={attachment?.name ?? 'ตัวอย่างรูปที่แนบ'}
            className="feedback-preview-image"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            className="feedback-preview-close"
            onClick={() => setPreviewOpen(false)}
            aria-label="ปิดตัวอย่าง"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * The help screen.
 *
 * EVERY ROW GOES SOMEWHERE THAT EXISTS. Supabase's version lists docs, status
 * and a Discord, because Supabase has those; this workspace has a change
 * request queue, an inbox and two legal documents, and listing a "เอกสารคู่มือ"
 * row that leads nowhere would be worse than listing nothing — it turns one
 * stuck person into one stuck person who now distrusts the menu.
 *
 * The exit back to feedback is a button, not a close: someone who came looking
 * for an answer and did not find one is exactly the person with something
 * worth reporting.
 */
function HelpScreen({
  changeRequestsHref,
  onBack,
  onClose,
}: {
  changeRequestsHref: string
  onBack: () => void
  onClose: () => void
}) {
  const stripPrefix = useStripWorkPrefix()
  const links: {
    href: string
    label: string
    hint: string
    icon: typeof ClipboardList
    external?: boolean
  }[] = [
    {
      // Already resolved by AppShell, where the portal (and so which queue)
      // is known — see its own comment.
      href: changeRequestsHref,
      label: 'คำขอเปลี่ยนแปลง',
      hint: 'ขอแก้ไขหรือเพิ่มงานในโปรเจกต์ พร้อมใบเสนอราคา',
      icon: ClipboardList,
    },
    {
      href: `mailto:${LEGAL.contactEmail}`,
      label: 'อีเมลทีมงาน',
      hint: LEGAL.contactEmail,
      icon: Mail,
      external: true,
    },
    {
      href: workHref('/work/terms-of-service', stripPrefix),
      label: 'ข้อกำหนดการใช้งาน',
      hint: 'ขอบเขตบริการ การชำระเงิน และการส่งมอบงาน',
      icon: ScrollText,
    },
    {
      href: workHref('/work/privacy-policy', stripPrefix),
      label: 'นโยบายความเป็นส่วนตัว',
      hint: 'ข้อมูลที่เก็บ ใครเห็นได้บ้าง และการขอลบข้อมูล',
      icon: ShieldCheck,
    },
  ]

  return (
    <>
      <div className="feedback-head feedback-head-row">
        <button type="button" className="feedback-back" onClick={onBack} aria-label="ย้อนกลับ">
          <ArrowLeft size={14} />
        </button>
        <strong>ต้องการความช่วยเหลือ?</strong>
      </div>

      <nav className="feedback-links">
        {links.map((link) =>
          link.external ? (
            <a key={link.href} href={link.href} onClick={onClose}>
              <link.icon size={16} />
              <span>
                <strong>{link.label}</strong>
                <small>{link.hint}</small>
              </span>
              <ChevronRight size={14} />
            </a>
          ) : (
            <Link key={link.href} href={link.href} onClick={onClose}>
              <link.icon size={16} />
              <span>
                <strong>{link.label}</strong>
                <small>{link.hint}</small>
              </span>
              <ChevronRight size={14} />
            </Link>
          ),
        )}
      </nav>

      <button type="button" className="feedback-switch feedback-switch-block" onClick={onBack}>
        ส่งความคิดเห็นแทน
      </button>
    </>
  )
}

/**
 * The send button.
 *
 * Its own component so `useFormStatus` reads the form above it — called from
 * FeedbackMenu it would report idle forever, because the hook looks at the
 * nearest form ANCESTOR and the component rendering a form is not inside it.
 *
 * Not `SubmitButton` from components/forms: that one renders the app's
 * full-width form buttons, and this sits in a toolbar next to an icon.
 *
 * Disabled during a capture as well as during a submit: the screenshot is not
 * in the form yet while the canvas is being painted, and sending in that
 * moment loses it silently.
 */
function FeedbackSubmit({ capturing }: { capturing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="feedback-submit" disabled={pending || capturing}>
      {pending ? 'กำลังส่ง...' : capturing ? 'กำลังจับภาพ...' : 'ส่ง'}
    </button>
  )
}
