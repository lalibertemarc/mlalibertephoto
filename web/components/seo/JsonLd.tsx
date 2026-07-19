/**
 * A schema.org block as a `<script type="application/ld+json">`.
 *
 * The `<` escape is what stops a `<` inside any string value — a caption, a title — from
 * closing the script element early. `components/mdx/ImageModalJsonLd.tsx` predates this and
 * inlines the same idiom; it is left alone rather than refactored, since rewriting working,
 * shipped markup to save three lines is not worth the risk to the one JSON-LD block the
 * site already emits.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
