import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design tokens — extracted from custom.css',
}

/**
 * Live reference for every token in app/globals.css.
 *
 * This page exists so items #4-#9 can eyeball the extracted design system
 * against the live Hugo site instead of reading CSS. It is scaffold tooling,
 * not part of the public site, and gets deleted (or moved behind a dev-only
 * route) when the migration lands.
 */

type Token = { name: string; value: string; note?: string }

const ACCENTS: Token[] = [
  { name: 'accent', value: '#c9a84c', note: '--primary-accent' },
  { name: 'accent-deep', value: '#8a7233', note: '--navbar-border-top' },
  { name: 'accent-border', value: '#a8893e', note: '--button-border' },
  { name: 'accent-focus', value: '#9a7d38', note: '--link-focus' },
  { name: 'accent-hover', value: '#b09542', note: '--link-hover-bg' },
  { name: 'accent-soft', value: '#d4bf7a', note: '--navbar-focus' },
  { name: 'accent-pale', value: '#e0d3a3', note: '--pagination-bg' },
  { name: 'accent-glow', value: 'rgba(201,168,76,.6)', note: '--form-shadow' },
]

const SURFACES: Token[] = [
  { name: 'surface-hero', value: '#1e1414', note: 'carousel, testimonials' },
  { name: 'surface-page', value: '#1a1212', note: 'gallery, features, blog' },
  { name: 'surface-heading', value: '#221818', note: 'breadcrumb band' },
  { name: 'surface-footer', value: '#151010', note: 'footer' },
  { name: 'surface-copyright', value: '#0f0b0b', note: 'copyright bar' },
  { name: 'scrim-hero', value: '#160e0e', note: 'carousel vignette base' },
  { name: 'scrim-gallery', value: '#1a1212', note: 'gallery overlay base' },
]

const TYPE: Token[] = [
  { name: 'text-hero', value: '3rem', note: 'carousel h1' },
  { name: 'text-hero-md', value: '2.4rem', note: '≤991px' },
  { name: 'text-hero-sm', value: '2rem', note: '≤767px' },
  { name: 'text-card-icon', value: '2.2rem', note: 'feature icon' },
  { name: 'text-page-title', value: '2rem', note: 'blog h1' },
  { name: 'text-cta-title', value: '1.8rem', note: 'cta heading' },
  { name: 'text-post-h2', value: '1.75rem', note: 'blog h2' },
  { name: 'text-quote-icon', value: '1.4rem', note: 'testimonial mark' },
  { name: 'text-post-h3', value: '1.35rem', note: 'blog h3' },
  { name: 'text-post-body', value: '1.2rem', note: 'blog paragraph' },
  { name: 'text-gallery-h3', value: '1.1rem', note: 'service tier' },
  { name: 'text-gallery-body', value: '1.05rem', note: 'gallery paragraph' },
  { name: 'text-card-title', value: '1rem', note: 'feature card title' },
  { name: 'text-quote', value: '0.95rem', note: 'testimonial text' },
  { name: 'text-card-body', value: '0.9rem', note: 'card body' },
  { name: 'text-button', value: '0.875rem', note: 'outline button' },
  { name: 'text-quote-author', value: '0.85rem', note: 'attribution' },
  { name: 'text-section-label', value: '0.8rem', note: 'uppercase eyebrow' },
  { name: 'text-blog-card-meta', value: '0.75rem', note: 'date line' },
]

const TRACKING: Token[] = [
  { name: 'tracking-body', value: '0.015em' },
  { name: 'tracking-title', value: '0.02em' },
  { name: 'tracking-wide', value: '0.03em' },
  { name: 'tracking-button', value: '0.04em' },
  { name: 'tracking-label', value: '0.06em' },
  { name: 'tracking-meta', value: '0.1em' },
  { name: 'tracking-footer-heading', value: '0.14em' },
  { name: 'tracking-eyebrow', value: '0.18em' },
]

const SHADOWS: Token[] = [
  { name: 'shadow-button', value: '0 2px 4px rgba(0,0,0,.15)' },
  { name: 'shadow-button-hover', value: '0 4px 12px rgba(0,0,0,.2)' },
  { name: 'shadow-image-hover', value: '0 4px 16px rgba(0,0,0,.25)' },
  { name: 'shadow-card-hover', value: '0 8px 24px rgba(0,0,0,.3)' },
  { name: 'shadow-blog-card-hover', value: '0 6px 20px rgba(0,0,0,.3)' },
  { name: 'shadow-dropdown', value: '0 8px 24px rgba(0,0,0,.4)' },
  { name: 'shadow-navbar', value: '0 1px 12px rgba(0,0,0,.4)' },
  { name: 'shadow-modal', value: '0 8px 32px rgba(0,0,0,.4)' },
  { name: 'shadow-embed', value: '0 4px 20px rgba(0,0,0,.4)' },
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-16">
      <h2 className="text-gallery-h2 tracking-eyebrow mb-6 border-t border-white/8 pt-8 font-light text-white/45 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Swatches({ tokens }: { tokens: Token[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tokens.map((t) => (
        <div key={t.name} className="rounded-card border border-white/6 p-3">
          <div
            className="rounded-button mb-3 h-16 w-full border border-white/8"
            style={{ background: t.value }}
          />
          <p className="text-card-body text-white/85">{t.name}</p>
          <p className="text-blog-card-meta mt-1 font-mono text-white/40">
            {t.value}
          </p>
          {t.note ? (
            <p className="text-blog-card-meta mt-1 text-white/30">{t.note}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function Rows({ tokens }: { tokens: Token[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {tokens.map((t) => (
          <tr key={t.name} className="border-b border-white/6">
            <td className="text-card-body py-2 pr-4 align-top text-white/85">
              {t.name}
            </td>
            <td className="text-blog-card-meta py-2 pr-4 align-top font-mono whitespace-nowrap text-white/40">
              {t.value}
            </td>
            <td className="text-blog-card-meta py-2 align-top text-white/30">
              {t.note ?? ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TokensPage() {
  return (
    <main className="container py-16">
      <p className="text-section-label tracking-eyebrow text-white/45 uppercase">
        Reference
      </p>
      <h1 className="text-page-title leading-page-title tracking-title mt-3 font-light text-white">
        Design tokens
      </h1>
      <p className="text-gallery-body leading-body max-w-gallery-prose mt-4 font-light text-white/60">
        Extracted verbatim from{' '}
        <code className="text-accent">static/css/custom.css</code>. Values are
        not rounded to Tailwind scale steps.
      </p>

      <div className="mt-16">
        <Section title="Accent">
          <Swatches tokens={ACCENTS} />
        </Section>

        <Section title="Surfaces">
          <Swatches tokens={SURFACES} />
        </Section>

        <Section title="Type scale">
          <div className="space-y-4">
            {TYPE.map((t) => (
              <div
                key={t.name}
                className="flex flex-wrap items-baseline gap-x-6 border-b border-white/6 pb-3"
              >
                <span
                  className="leading-none font-light text-white"
                  style={{ fontSize: t.value }}
                >
                  Aa
                </span>
                <span className="text-card-body text-white/85">{t.name}</span>
                <span className="text-blog-card-meta font-mono text-white/40">
                  {t.value}
                </span>
                <span className="text-blog-card-meta text-white/30">
                  {t.note ?? ''}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Letter spacing">
          <div className="space-y-3">
            {TRACKING.map((t) => (
              <div
                key={t.name}
                className="flex flex-wrap items-baseline gap-x-6 border-b border-white/6 pb-2"
              >
                <span
                  className="text-card-title font-light text-white uppercase"
                  style={{ letterSpacing: t.value }}
                >
                  Portraits
                </span>
                <span className="text-card-body text-white/85">{t.name}</span>
                <span className="text-blog-card-meta font-mono text-white/40">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Shadow">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SHADOWS.map((t) => (
              <div key={t.name}>
                <div
                  className="rounded-card bg-surface-hero mb-3 h-20 w-full"
                  style={{ boxShadow: t.value }}
                />
                <p className="text-card-body text-white/85">{t.name}</p>
                <p className="text-blog-card-meta mt-1 font-mono text-white/40">
                  {t.value}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radius">
          <div className="flex flex-wrap gap-8">
            {[
              { name: 'rounded-button', value: '2px' },
              { name: 'rounded-card', value: '3px' },
              { name: 'rounded-embed', value: '4px' },
              { name: 'rounded-full', value: '50%' },
            ].map((r) => (
              <div key={r.name}>
                <div
                  className="bg-accent mb-2 h-16 w-16"
                  style={{ borderRadius: r.value }}
                />
                <p className="text-blog-card-meta text-white/85">{r.name}</p>
                <p className="text-blog-card-meta font-mono text-white/40">
                  {r.value}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Breakpoints">
          <Rows
            tokens={[
              { name: 'sm', value: '768px', note: 'Bootstrap sm — above max-width 767px' },
              { name: 'md', value: '992px', note: 'Bootstrap md — above max-width 991px' },
              { name: 'lg', value: '1200px', note: 'Bootstrap lg' },
            ]}
          />
        </Section>

        <Section title="Easing & animation">
          <Rows
            tokens={[
              {
                name: 'ease-carousel',
                value: 'cubic-bezier(.25,.46,.45,.94)',
                note: 'slide copy entrance',
              },
              {
                name: 'ease-indicator',
                value: 'cubic-bezier(.4,0,.2,1)',
                note: 'pagination line width',
              },
              {
                name: 'animate-ken-burns',
                value: 'kenBurns 6s ease-out forwards',
                note: 'active slide image',
              },
              {
                name: 'animate-carousel-fade-up',
                value: 'carouselFadeUp .55s',
                note: 'staggered copy',
              },
            ]}
          />
        </Section>
      </div>
    </main>
  )
}
