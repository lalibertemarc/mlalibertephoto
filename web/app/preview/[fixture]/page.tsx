/**
 * DEV-ONLY verification surface. DELETE when real content routing lands (items #7-#9).
 *
 * The MDX components need to be exercised through actual MDX compilation, not a hand-written
 * demo page, but the app has no content routing yet and building it here would absorb the
 * page-layout work. So this route compiles a handful of real migrated files and renders them
 * through the component map — enough to verify every behaviour end to end.
 *
 * It is deliberately crude: no layout, no metadata beyond noindex, no styling of the
 * surrounding page. It exists to be looked at and then removed.
 *
 * Note this is the one place `@mdx-js/mdx` is imported by app code rather than by the
 * migration script, which is why it can stay a devDependency only until this route is gone.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { IntlProvider } from '@/components/intl-provider'
import { findFirstImageModal, ImageModalJsonLd, mdxComponents } from '@/components/mdx'
import type { Locale } from '@/lib/permalink'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * One fixture per thing worth seeing rendered:
 *   portraits   — Gallery, variant="wide", a gallery CTA, hover overlays
 *   restoration — four BeforeAfter sliders on one page, standalone ImageModal, NavButtons
 *   iframe      — raw HTML passed through from the migration
 *   portraits-en — the same gallery in English, to check the strings actually switch
 *   sizing      — the only post declaring `height` without `width`, and the only one whose
 *                 `width` is unitless ("1350"); both are easy to render distorted
 */
const FIXTURES = {
  portraits: { file: 'pages/photos/portraits/fr.mdx', locale: 'fr' },
  restoration: { file: 'pages/restoration/fr.mdx', locale: 'fr' },
  iframe: { file: 'blog/2025-03-02-sonumdiamoncobra/fr.mdx', locale: 'fr' },
  'portraits-en': { file: 'pages/photos/portraits/en.mdx', locale: 'en' },
  sizing: { file: 'blog/2025-10-08-butterbuttbutler/fr.mdx', locale: 'fr' },
} as const satisfies Record<string, { file: string; locale: Locale }>

type FixtureName = keyof typeof FIXTURES

export function generateStaticParams(): { fixture: FixtureName }[] {
  return (Object.keys(FIXTURES) as FixtureName[]).map((fixture) => ({ fixture }))
}

/** The compile gate in the migration keeps frontmatter in the body; strip it for rendering. */
function stripFrontmatter(source: string): string {
  if (!source.startsWith('---')) return source
  const end = source.indexOf('\n---', 3)
  return end === -1 ? source : source.slice(source.indexOf('\n', end + 1) + 1)
}

export default async function PreviewPage({ params }: { params: Promise<{ fixture: string }> }) {
  const { fixture } = await params
  const config = FIXTURES[fixture as FixtureName]
  if (!config) return <p>Unknown fixture: {fixture}</p>

  const source = await readFile(path.join(process.cwd(), 'content', config.file), 'utf8')
  const { default: Content } = await evaluate(stripFrontmatter(source), {
    ...runtime,
    baseUrl: import.meta.url,
  })

  // Called rather than rendered as <Content/>: the JSON-LD lookup needs the materialized
  // element tree, and an unrendered <Content/> element only has the components prop on it.
  // MDX compiles to a plain synchronous function component, so invoking it is safe and
  // returns the tree that would otherwise be produced one render later.
  const body = Content({ components: mdxComponents })
  const firstImage = findFirstImageModal(body)

  return (
    <IntlProvider locale={config.locale}>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>
          preview: {config.file} ({config.locale})
        </p>
        {firstImage && (
          <ImageModalJsonLd image={firstImage} pageUrl={`https://marclaliberte.photos/preview/${fixture}/`} />
        )}
        {body}
      </main>
    </IntlProvider>
  )
}
