'use client'

import { useActionState, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { saveProjectBrand } from '@/lib/work/services/documents'
import type { DocumentActionState } from '@/lib/work/services/documents'
import type { BrandColor, BrandFont, ProjectBrand } from '@/lib/work/validation/documents'

/**
 * The project's OFFICIAL brand — palette and typefaces.
 *
 * Two components, one file, because they must never drift apart: whatever the
 * editor can save is exactly what the read-only view can show.
 *
 * The palette is a LIST, not three fixed slots. A brand routinely carries more
 * than primary/secondary/background — accents, surfaces, states — and a schema
 * that hard-codes three would push the fourth colour into a notes field where
 * nothing can read it.
 */

const SWATCH_FALLBACK = '#CCCCCC'

/** Read-only palette + typefaces. Used on the client portal and anywhere staff just need to look. */
export function BrandDisplay({ brand }: { brand: ProjectBrand }) {
  if (brand.colors.length === 0 && brand.fonts.length === 0) {
    return <p className="muted empty-inline">ยังไม่ได้กำหนดแบรนด์สำหรับโปรเจกต์นี้</p>
  }

  return (
    <div className="brand-display">
      {brand.colors.length > 0 && (
        <div className="brand-swatches">
          {brand.colors.map((color, index) => (
            <figure key={`${color.role}-${index}`} className="brand-swatch">
              <span className="brand-swatch-chip" style={{ background: color.hex }} aria-hidden />
              <figcaption>
                <strong>{color.role}</strong>
                <small className="muted">{color.hex.toUpperCase()}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {brand.fonts.length > 0 && (
        <ul className="brand-fonts">
          {brand.fonts.map((font, index) => (
            <li key={`${font.role}-${index}`}>
              <span className="muted">{font.role}</span>
              <strong style={{ fontFamily: `${font.name}, var(--work-font, sans-serif)` }}>
                {font.name}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Staff editor. Rows live in React state and post as JSON in one hidden field,
 * the same shape the intake wizard's milestone table uses — one submit, one
 * validation pass, no per-row round trip.
 *
 * Colour rows carry BOTH a native colour input and the hex text, because a
 * brand hex is usually pasted from a spec, not picked by eye.
 */
export function BrandEditor({ projectId, brand }: { projectId: string; brand: ProjectBrand }) {
  const [state, formAction] = useActionState<DocumentActionState, FormData>(saveProjectBrand, {})
  useActionToast(state)

  const [colors, setColors] = useState<BrandColor[]>(brand.colors)
  const [fonts, setFonts] = useState<BrandFont[]>(brand.fonts)

  const updateColor = (index: number, patch: Partial<BrandColor>) =>
    setColors(colors.map((color, i) => (i === index ? { ...color, ...patch } : color)))
  const updateFont = (index: number, patch: Partial<BrandFont>) =>
    setFonts(fonts.map((font, i) => (i === index ? { ...font, ...patch } : font)))

  return (
    <form action={formAction} className="work-form brand-editor">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="colorsJson" value={JSON.stringify(colors)} />
      <input type="hidden" name="fontsJson" value={JSON.stringify(fonts)} />

      <div className="full">
        <div className="brand-editor-head">
          <h4>สีของแบรนด์</h4>
          <button
            type="button"
            className="text-btn"
            onClick={() => setColors([...colors, { role: '', hex: SWATCH_FALLBACK }])}
          >
            <Plus size={14} /> เพิ่มสี
          </button>
        </div>

        {colors.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีสี</p>
        ) : (
          <ul className="brand-editor-rows">
            {colors.map((color, index) => (
              <li key={index}>
                <input
                  aria-label="บทบาทของสี"
                  placeholder="เช่น Primary"
                  value={color.role}
                  onChange={(event) => updateColor(index, { role: event.target.value })}
                />
                <input
                  aria-label="เลือกสี"
                  type="color"
                  className="brand-color-input"
                  value={/^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : SWATCH_FALLBACK}
                  onChange={(event) => updateColor(index, { hex: event.target.value.toUpperCase() })}
                />
                <input
                  aria-label="รหัสสี"
                  placeholder="#409EFE"
                  value={color.hex}
                  onChange={(event) => updateColor(index, { hex: event.target.value })}
                />
                <button
                  type="button"
                  className="text-btn danger"
                  aria-label={`ลบสี ${color.role || index + 1}`}
                  onClick={() => setColors(colors.filter((_, i) => i !== index))}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="full">
        <div className="brand-editor-head">
          <h4>ฟอนต์</h4>
          <button
            type="button"
            className="text-btn"
            onClick={() => setFonts([...fonts, { role: '', name: '' }])}
          >
            <Plus size={14} /> เพิ่มฟอนต์
          </button>
        </div>

        {fonts.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีฟอนต์</p>
        ) : (
          <ul className="brand-editor-rows">
            {fonts.map((font, index) => (
              <li key={index}>
                <input
                  aria-label="บทบาทของฟอนต์"
                  placeholder="เช่น Heading"
                  value={font.role}
                  onChange={(event) => updateFont(index, { role: event.target.value })}
                />
                <input
                  aria-label="ชื่อฟอนต์"
                  placeholder="เช่น Inter"
                  value={font.name}
                  onChange={(event) => updateFont(index, { name: event.target.value })}
                />
                <button
                  type="button"
                  className="text-btn danger"
                  aria-label={`ลบฟอนต์ ${font.role || index + 1}`}
                  onClick={() => setFonts(fonts.filter((_, i) => i !== index))}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.error && <p className="field-error full">{state.error}</p>}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังบันทึก...">บันทึกแบรนด์</SubmitButton>
      </div>
    </form>
  )
}
