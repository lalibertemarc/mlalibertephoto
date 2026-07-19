import Link from 'next/link'

/**
 * One nav entry. Purely presentational — whether it is active, and whether it opens a new
 * tab, are both decided in `lib/nav-menu.ts` and arrive as props.
 *
 * Two variants, because the source styles the bar and its menus through separate rule sets
 * spread across two stylesheets. `custom.css` supplies the colours; the *typography* —
 * uppercase, bold, underline, tracking, the 5px top-border indicator — comes from the
 * theme's `style.marsala.css:317-339` (`.navbar ul.nav > li > a`) and `:361-371`
 * (`.navbar ul.dropdown-menu li`), which the token extraction never covered.
 *
 * Sizes are stated in pixels rather than Tailwind steps because they are measured from the
 * live site (14px bar, 12px menu, `21px 15px` padding). Under this app's 10px root a
 * default step like `text-sm` would resolve to 8.75px — see the note in globals.css.
 */

const BASE = 'block transition-colors duration-250'

const VARIANTS = {
  top: {
    base: 'border-t-[5px] px-gutter py-[21px] text-[14px] font-bold uppercase tracking-[0.08em]',
    idle: 'border-t-transparent text-white/80 underline hover:border-t-accent hover:bg-white/8 hover:text-white',
    // The source pairs the accent fill with a *deeper* top border and drops the underline
    // (custom.css:847-852 plus style.marsala.css:334-339).
    active: 'border-t-accent-deep bg-accent text-white no-underline',
  },
  // Submenu entries have no active state: nav.html:117-124 renders them as bare
  // `<li><a>` with no `IsMenuCurrent` check, so Hugo cannot highlight them even in
  // principle. `ResolvedSubMenuItem` omits `active` so this cannot drift back.
  submenu: {
    base: 'whitespace-nowrap px-[20px] py-[5px] text-[12px] uppercase tracking-[0.08em] no-underline',
    idle: 'text-white/70 hover:bg-white/5 hover:text-accent',
    active: 'text-white/70 hover:bg-white/5 hover:text-accent',
  },
} as const

export function NavLink({
  href,
  active,
  linkProps,
  variant = 'top',
  className,
  children,
}: {
  href: string
  active?: boolean
  linkProps?: { target?: string; rel?: string }
  variant?: keyof typeof VARIANTS
  className?: string
  children: React.ReactNode
}) {
  const styles = VARIANTS[variant]
  return (
    <Link
      href={href}
      {...linkProps}
      {...(active ? { 'aria-current': 'page' as const } : {})}
      className={[BASE, styles.base, active ? styles.active : styles.idle, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Link>
  )
}
