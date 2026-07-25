/**
 * A taxonomy hub — `/tags/`, `/categories/`, `/authors/` and their `/en/` counterparts.
 *
 * **These pages render blank on the live site.** `_default/list.html` builds its paginator
 * from `where .Data.Pages "Type" "in" .Site.Params.mainSections`, which matches nothing on a
 * Kind=taxonomy page, so all six URLs serve a heading, an inert pager and the sidebar — no
 * term links at all. They are nonetheless in the sitemap and indexed.
 *
 * Populating them is a deliberate deviation, recorded in docs/seo-contract.md. The reason is
 * structural rather than cosmetic: on the Hugo site the sidebar's tag and category widgets
 * appear on every list and single page and are the only site-wide link path to the 129 term
 * pages. The port drops the sidebar, so without these hubs most term pages would have no
 * internal links pointing at them at all — on a site already showing 322 URLs as
 * "crawled — currently not indexed".
 */

import type { Metadata } from 'next'
import { TermList } from '@/components/blog/TermList'
import { PageHeading, isDarkPageHeading } from '@/components/chrome/page-heading'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { getTermsByTaxonomy } from '@/lib/content/terms'
import { newestDate } from '@/lib/dates'
import { taxonomyListPermalink, titleCaseTerm, type Locale, type TaxonomyKind } from '@/lib/permalink'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * The heading, which is the taxonomy's own name and is **not translated**.
 *
 * Hugo titles a taxonomy page from the plural key in `[taxonomies]`, so the French
 * `/categories/` is headed "Categories" and `/authors/` is headed "Authors" — English words
 * on a French page, in both the `<h1>` and the `<title>`. There is no i18n lookup involved;
 * the theme's `Widgets.categoriesTitle` string exists but belongs to the sidebar widget, not
 * to this heading.
 *
 * Reproduced rather than corrected: these are indexed titles, and the brief's rule is to
 * reproduce current output. Translating them is a defensible follow-up, but it is a content
 * change to six live pages and should be decided on its own.
 */
function titleFor(taxonomy: TaxonomyKind): string {
  return titleCaseTerm(taxonomy)
}

export function taxonomyListMetadata(taxonomy: TaxonomyKind, locale: Locale): Metadata {
  return buildMetadata({
    locale,
    permalinks: {
      fr: taxonomyListPermalink(taxonomy, 'fr'),
      en: taxonomyListPermalink(taxonomy, 'en'),
    },
    title: titleFor(taxonomy),
  })
}

export async function TaxonomyListPage({
  taxonomy,
  locale,
}: {
  taxonomy: TaxonomyKind
  locale: Locale
}) {
  const terms = await getTermsByTaxonomy(taxonomy)

  // Alphabetical by display term, not by slug — a directory is read, not scanned by date.
  // Distinct from `TermEntry.members`, which is newest-first for the term pages themselves.
  const sorted = [...terms].sort((a, b) =>
    titleCaseTerm(a.term).localeCompare(titleCaseTerm(b.term), locale),
  )
  const updatedAt = newestDate(terms.flatMap((term) => term.memberDates))

  return (
    <>
      <ExtraMeta updatedAt={updatedAt} />
      <PageHeading title={titleFor(taxonomy)} dark={isDarkPageHeading('blog')} />
      <main className="container py-12">
        <TermList terms={sorted} locale={locale} />
      </main>
    </>
  )
}
