/**
 * The two head tags Next's Metadata object cannot express.
 *
 * `og:updated_time` has no field on `OpenGraph`, and `article:publisher` has none on
 * `OpenGraphArticle` (which models `authors`, `section`, `tags` and the three timestamps,
 * but not the publisher). The `other` escape hatch is no help: it always renders
 * `<meta name=...>`, and both of these need `property=`.
 *
 * So they are rendered as ordinary JSX. React 19 hoists `<meta>` out of the tree and into
 * `<head>` wherever it appears, so this can sit anywhere in a page's markup — the same
 * mechanism that lets `ImageModalJsonLd` emit its script from inside the MDX body.
 *
 * Any route calling `buildMetadata` should render this too; the two halves together are the
 * full tag set.
 */

import { FACEBOOK_PUBLISHER_URL } from '@/lib/seo/constants'
import { formatMetaDatetime } from '@/lib/seo/format'

export interface ExtraMetaProps {
  /** Raw frontmatter datetime. Omit to skip `og:updated_time`, matching Hugo's `with`. */
  updatedAt?: string
  /** Hugo's `$is_blog` — `article:publisher` is inside that branch. */
  isArticle?: boolean
}

export function ExtraMeta({ updatedAt, isArticle = false }: ExtraMetaProps) {
  return (
    <>
      {updatedAt && (
        <meta property="og:updated_time" content={formatMetaDatetime(updatedAt)} />
      )}
      {isArticle && <meta property="article:publisher" content={FACEBOOK_PUBLISHER_URL} />}
    </>
  )
}
