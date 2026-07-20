import { TaxonomyListPage, taxonomyListMetadata } from '@/lib/pages/taxonomy-list'

export const metadata = taxonomyListMetadata('categories', 'fr')

export default function Page() {
  return <TaxonomyListPage taxonomy="categories" locale="fr" />
}
