import { UnauthorizedState } from '@/components/work/states'
import { Footer } from '@/components/work/layout/footer'

export const metadata = { title: 'ไม่มีสิทธิ์เข้าถึง' }

/**
 * Where `denyAccess()` sends a signed-in user who lacks the required
 * permission.
 *
 * Uses `.standalone-state`, the wrapper every other outside-the-shell screen
 * uses (not-found, error, loading). It previously rendered the shell's own
 * `.app > .main > .content` markup without a sidebar — a flex row with an
 * empty first column, which pushed the message against the edge.
 *
 * The reason is echoed back so the person knows what to ask for. It is echoed
 * as TEXT inside a React node — never as HTML — so a crafted `?reason=` cannot
 * inject markup, and it names only the missing permission, never the resource
 * or whether it exists.
 */
export default async function WorkForbiddenPage(props: PageProps<'/work/forbidden'>) {
  const { reason } = await props.searchParams
  const message = typeof reason === 'string' ? reason : undefined

  return (
    <div className="standalone-state">
      <UnauthorizedState
        description={message ?? 'บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ'}
      />
      <Footer />
    </div>
  )
}
