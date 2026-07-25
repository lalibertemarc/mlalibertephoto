import Link from 'next/link'
import type { ComponentProps } from 'react'
import { linkStripsTrailingSlash } from '@/lib/links'

/**
 * A `Link` that does not let Next mangle a trailing-slashed, dotted href.
 *
 * `next.config.ts` sets `trailingSlash: true`, but `<Link>` treats a path whose last segment
 * contains a dot as a file and strips the slash — rendering `<Link href="/tags/fe-50mm-f1.8/">`
 * as `href="/tags/fe-50mm-f1.8"`, which then disagrees with the page's own canonical and both
 * sitemaps. For those paths this falls back to a plain `<a>`, which React emits verbatim, so the
 * slash survives. Every other href keeps `<Link>` and its client-side navigation.
 *
 * Only the handful of dotted taxonomy terms take the `<a>` branch, so the lost prefetch is
 * immaterial. See `linkStripsTrailingSlash` in `lib/links.ts` and docs/build-validation.md.
 */
export function SlashSafeLink({
  href,
  ...props
}: { href: string } & Omit<ComponentProps<'a'>, 'href'>) {
  if (linkStripsTrailingSlash(href)) return <a href={href} {...props} />
  return <Link href={href} {...props} />
}
