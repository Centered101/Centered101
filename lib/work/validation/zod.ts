import { z, type ZodErrorMap } from 'zod'

/**
 * Zod, with its built-in messages in Thai.
 *
 * WHY THIS FILE EXISTS. Every service in /work reports a failed parse as
 * `parsed.error.issues[0]?.message` — 20+ call sites do exactly that — so any
 * issue Zod raises itself, rather than one a schema names, lands in front of a
 * client verbatim. That is how "Expected string, received null" ended up under
 * the payment step of the intake wizard.
 *
 * Fixing it per-field would mean annotating several hundred schema members and
 * would silently regress the moment someone adds the next one. The error map
 * is the single place Zod asks when a schema has NOT supplied a message, so
 * this covers every schema in the workspace, including ones not written yet.
 *
 * The map is global, which is safe here and only here: `zod` is imported by
 * these eleven validation modules and nowhere else in the repo, and all of
 * them back Thai-language screens. Import `z` from this module rather than
 * from 'zod' directly so the map is installed before any schema is built.
 *
 * An explicit message always wins — `.min(1, 'กรุณากรอกชื่อโปรเจกต์')` is
 * untouched by anything below. This is the floor, not a replacement.
 */
const thaiErrorMap: ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      // A missing field and a field of the wrong shape are different problems
      // to the person reading this: one they can act on, one they cannot.
      return issue.received === 'undefined' || issue.received === 'null'
        ? { message: 'กรุณากรอกข้อมูลในช่องนี้' }
        : { message: 'รูปแบบข้อมูลไม่ถูกต้อง' }

    case 'too_small': {
      const min = Number(issue.minimum)
      if (issue.type === 'string') {
        return min <= 1
          ? { message: 'กรุณากรอกข้อมูลในช่องนี้' }
          : { message: `ต้องมีอย่างน้อย ${min} ตัวอักษร` }
      }
      if (issue.type === 'array') {
        return min <= 1
          ? { message: 'กรุณาเลือกอย่างน้อย 1 รายการ' }
          : { message: `ต้องมีอย่างน้อย ${min} รายการ` }
      }
      return { message: `ต้องไม่น้อยกว่า ${min}` }
    }

    case 'too_big': {
      const max = Number(issue.maximum)
      if (issue.type === 'string') return { message: `ต้องยาวไม่เกิน ${max} ตัวอักษร` }
      if (issue.type === 'array') return { message: `เลือกได้ไม่เกิน ${max} รายการ` }
      return { message: `ต้องไม่เกิน ${max}` }
    }

    case 'invalid_string':
      if (issue.validation === 'email') return { message: 'รูปแบบอีเมลไม่ถูกต้อง' }
      if (issue.validation === 'url') return { message: 'รูปแบบลิงก์ไม่ถูกต้อง' }
      if (issue.validation === 'uuid') return { message: 'รหัสอ้างอิงไม่ถูกต้อง' }
      return { message: 'รูปแบบข้อความไม่ถูกต้อง' }

    case 'invalid_enum_value':
    case 'invalid_literal':
    case 'invalid_union_discriminator':
      return { message: 'ค่าที่เลือกไม่ถูกต้อง' }

    case 'invalid_date':
      return { message: 'รูปแบบวันที่ไม่ถูกต้อง' }

    case 'not_multiple_of':
      return { message: `ต้องเป็นจำนวนที่หารด้วย ${Number(issue.multipleOf)} ลงตัว` }

    case 'not_finite':
      return { message: 'ตัวเลขไม่ถูกต้อง' }

    case 'unrecognized_keys':
      return { message: 'มีข้อมูลที่ระบบไม่รู้จักส่งเข้ามา' }

    default:
      // Everything else, `custom` included, falls here. Never ctx.defaultError:
      // that IS the English string this file exists to keep off the screen. A
      // custom issue that reaches this point had no message of its own, which
      // is a schema bug rather than something to explain to a client.
      return { message: 'ข้อมูลไม่ถูกต้อง' }
  }
}

z.setErrorMap(thaiErrorMap)

export { z }
