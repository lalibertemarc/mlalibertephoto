import { TaxonomyListPage, taxonomyListMetadata } from '@/lib/pages/taxonomy-list'

export const metadata = taxonomyListMetadata('tags', 'fr')

export default function Page() {
  return <TaxonomyListPage taxonomy="tags" locale="fr" />
}
