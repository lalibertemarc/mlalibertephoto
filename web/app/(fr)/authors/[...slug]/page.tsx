import {
  TermPage,
  generateTermMetadata,
  generateTermParams,
  type TermParams,
} from '@/lib/pages/term-page'

export function generateStaticParams() {
  return generateTermParams('authors')
}

export async function generateMetadata({ params }: { params: Promise<TermParams> }) {
  return generateTermMetadata('authors', await params, 'fr')
}

export default async function Page({ params }: { params: Promise<TermParams> }) {
  return <TermPage taxonomy="authors" params={await params} locale="fr" />
}
