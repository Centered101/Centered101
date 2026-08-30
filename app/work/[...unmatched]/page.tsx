import { notFound } from 'next/navigation'

/**
 * Catch-all for /work URLs that match no route.
 *
 * `app/work/not-found.tsx` does NOT cover these on its own. A nested
 * not-found file only answers a `notFound()` call raised inside its own
 * subtree; a URL that matches no route at all is answered by the ROOT
 * not-found, and this project has no `app/not-found.tsx` — so a mistyped
 * workspace URL fell through to Next's built-in black 404 page, which is
 * neither branded nor in Thai.
 *
 * This page exists only to raise that call from inside /work, which is what
 * hands the render to the workspace's own not-found screen. It sits below
 * every real route in the matching order (static and dynamic segments both
 * win over a catch-all), so nothing that already resolves changes.
 */
export default function UnmatchedWorkRoute(): never {
  notFound()
}
