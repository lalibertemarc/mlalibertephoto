import { TaxonomyListPage, taxonomyListMetadata } from '@/lib/pages/taxonomy-list'

export const metadata = taxonomyListMetadata('tags', 'en')

export default function Page() {
  return <TaxonomyListPage taxonomy="tags" locale="en" />
}
