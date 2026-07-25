/**
 * Hugo's paginator, as far as this site actually uses it.
 *
 * Lives at `lib/` rather than under `content/` or `seo/` because both the blog index and the
 * taxonomy term pages need it and neither owns it.
 *
 * Deliberately smaller than Hugo's `.Paginator`: the theme's list template renders a
 * prev/next pager only — no page numbers, no ellipsis, no `.PageNumber` anywhere — so there
 * is nothing here to build a numbered widget from. See docs/blog-port.md.
 */

/** `[pagination] pagerSize` in config/_default/hugo.toml. The one place this number lives. */
export const PAGER_SIZE = 30

export function totalPages(itemCount: number, pageSize = PAGER_SIZE): number {
  // A list with no items still has one (empty) page, matching Hugo.
  return Math.max(1, Math.ceil(itemCount / pageSize))
}

export interface PageSlice<T> {
  items: T[]
  page: number
  totalPages: number
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize = PAGER_SIZE,
): PageSlice<T> {
  const pages = totalPages(items.length, pageSize)
  if (!Number.isInteger(page) || page < 1 || page > pages) {
    throw new Error(`Page ${page} is outside 1..${pages}`)
  }

  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page, totalPages: pages }
}

/**
 * `baseHref` is the locale-prefixed page-1 URL with both slashes, e.g. `/blog/` or
 * `/en/tags/lr/mogrify-2/`.
 *
 * Page 1 is the base URL itself and never `page/1/`. Hugo *does* emit a `/page/1/` for every
 * paginated list, but as a `noindex` meta-refresh alias rather than a real page — 269 of them
 * across the site. Those are served by redirects instead; see `scripts/build-seo-files.ts`.
 */
export function pageHref(baseHref: string, page: number): string {
  return page <= 1 ? baseHref : `${baseHref}page/${page}/`
}

export interface PagerLinks {
  /** Toward page 1. `null` on the first page, which Hugo renders as a disabled control. */
  prevHref: string | null
  /** Toward the last page. `null` on the last page. */
  nextHref: string | null
}

export function pagerLinks(baseHref: string, page: number, pages: number): PagerLinks {
  return {
    prevHref: page > 1 ? pageHref(baseHref, page - 1) : null,
    nextHref: page < pages ? pageHref(baseHref, page + 1) : null,
  }
}
