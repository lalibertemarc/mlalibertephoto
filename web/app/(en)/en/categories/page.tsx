import { TaxonomyListPage, taxonomyListMetadata } from '@/lib/pages/taxonomy-list'

export const metadata = taxonomyListMetadata('categories', 'en')

export default function Page() {
  return <TaxonomyListPage taxonomy="categories" locale="en" />
}
