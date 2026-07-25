import { TaxonomyListPage, taxonomyListMetadata } from '@/lib/pages/taxonomy-list'

export const metadata = taxonomyListMetadata('authors', 'en')

export default function Page() {
  return <TaxonomyListPage taxonomy="authors" locale="en" />
}
