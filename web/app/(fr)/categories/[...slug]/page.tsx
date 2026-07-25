import {
  TermPage,
  generateTermMetadata,
  generateTermParams,
  type TermParams,
} from '@/lib/pages/term-page'

export function generateStaticParams() {
  return generateTermParams('categories')
}

export async function generateMetadata({ params }: { params: Promise<TermParams> }) {
  return generateTermMetadata('categories', await params, 'fr')
}

export default async function Page({ params }: { params: Promise<TermParams> }) {
  return <TermPage taxonomy="categories" params={await params} locale="fr" />
}
