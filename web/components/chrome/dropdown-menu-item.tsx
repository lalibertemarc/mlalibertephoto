'use client'

import { useCallback, useRef, useState } from 'react'
import type { ResolvedMenuItem } from '@/lib/nav-menu'
import { CaretIcon } from './icons'
import { NavLink } from './nav-link'
import { useDismissable } from './use-dismissable'

/**
 * A nav entry that owns a submenu — Portfolio, and only Portfolio.
 *
 * The toggle is a `<button>`, not a link, because that is what it already is. Bootstrap's
 * dropdown plugin calls `preventDefault()` on every `data-toggle="dropdown"` click
 * (nav.html:36), so clicking "Portfolio" on the live site opens the submenu and never
 * navigates to `/photos/`, despite being marked up as an anchor pointing there. Rendering a
 * real anchor here would silently add a navigation the site does not currently have; adding
 * a `preventDefault` to a real anchor would be markup that lies about its own behaviour.
 *
 * The submenu keeps its own `open` state rather than the header owning a "which menu is
 * open" value: there is exactly one dropdown, and nothing outside needs to read it.
 *
 * It does need `pathname`, though, and closing on an outside press is not a substitute.
 * `SiteHeader` lives in the root layout, so it survives client-side navigation within a
 * locale tree, and this component is keyed by a stable id — nothing remounts, so `open`
 * would otherwise persist onto the next page. `useDismissable` does not cover it: the ref
 * wraps the submenu as well as the toggle, so following a link *inside* the menu is
 * correctly not an outside press, and a Back/Forward transition fires no pointer or key
 * event at all. Both leave the menu hanging open over a page the visitor never opened it on.
 */
export function DropdownMenuItem({
  item,
  pathname,
}: {
  item: ResolvedMenuItem
  pathname: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useDismissable(ref, close, open)

  // Same render-phase reset SiteHeader uses for the mobile panel; see its comment.
  const [renderedPath, setRenderedPath] = useState(pathname)
  if (renderedPath !== pathname) {
    setRenderedPath(pathname)
    setOpen(false)
  }

  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={[
          'flex w-full items-center gap-1.5 border-t-[5px] px-gutter py-[21px]',
          'text-[14px] font-bold uppercase tracking-[0.08em] transition-colors duration-250',
          item.active
            ? 'border-t-accent-deep bg-accent text-white no-underline'
            : open
              ? // `.navbar-default .navbar-nav > .open > a` — 10% fill, distinct from the
                // 8% hover fill (custom.css:853-858 vs :842-846).
                'border-t-accent bg-white/10 text-white no-underline'
              : 'border-t-transparent text-white/80 underline hover:border-t-accent hover:bg-white/8 hover:text-white',
        ].join(' ')}
      >
        {item.label}
        <CaretIcon open={open} />
      </button>

      <ul
        className={[
          open ? 'block' : 'hidden',
          // Static below the sm breakpoint: the mobile panel is a vertical stack, so the
          // submenu expands in flow there rather than floating over the page.
          'sm:absolute sm:left-0 sm:top-full sm:z-10 sm:min-w-[160px]',
          // `--shadow-dropdown` is 0 8px 24px, not the header's 0 1px 12px
          // (custom.css:874-878 vs :830-832).
          'border border-white/8 bg-surface-dropdown shadow-dropdown',
        ].join(' ')}
      >
        {item.children?.map((child, index) => (
          <li
            key={child.id}
            className={[
              'py-[4px]',
              index < (item.children?.length ?? 0) - 1 ? 'border-b border-white/6' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <NavLink href={child.href} linkProps={child.linkProps} variant="submenu">
              {child.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  )
}
