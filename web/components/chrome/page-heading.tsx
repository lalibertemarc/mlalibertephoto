/**
 * The page-title band that sits under the nav.
 *
 * Ported from layouts/partials/breadcrumbs.html, which despite its name renders no
 * breadcrumb trail — no `.Ancestors`, no list, no links. It is an `<h1>` in a full-width
 * band, in one of two skins, and the component is named for what it does.
 *
 * The dark skin applies to blog posts and to pages whose `page_class` contains "dark" (the
 * four `dark-gallery` pages plus videos); everything else gets the theme's light textured
 * band. `layouts/index.html` never calls the partial, so the homepage has no band.
 */

/**
 * Mirrors the `$isDark` expression at breadcrumbs.html:1.
 *
 * The `page` branch is no longer consulted: standalone pages render one skin and always pass
 * `dark` (see lib/pages/content-page.tsx and the note atop components/pages/page.module.css).
 * Kept because it is the faithful record of Hugo's condition, and is what to re-enable if the
 * three light pages are ever given a light skin back.
 */
export function isDarkPageHeading(kind: 'blog' | 'page', pageClass?: string): boolean {
  return kind === 'blog' || Boolean(pageClass?.includes('dark'))
}

export function PageHeading({ title, dark }: { title: string; dark: boolean }) {
  // `#heading-breadcrumbs h1 { text-align: center }` below 992px (style.marsala.css:1758-1762)
  // is not scoped to `.dark-heading`, and custom.css never sets `text-align`, so it applies
  // to both skins.
  const heading = 'm-0 max-md:text-center'

  if (dark) {
    return (
      <div className="border-b border-white/6 bg-surface-heading py-heading-band">
        <div className="container">
          <h1
            className={`${heading} text-page-title font-light leading-page-title tracking-title text-white max-sm:text-page-title-sm`}
          >
            {title}
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-[40px] bg-[url('/img/texture-bw.png')] bg-center bg-repeat py-[20px]">
      <div className="container">
        <h1
          className={`${heading} text-[30px] font-bold uppercase tracking-[0.08em] text-heading-light`}
        >
          {title}
        </h1>
      </div>
    </div>
  )
}
