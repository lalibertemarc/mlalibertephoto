import {
  TermPage,
  generateTermMetadata,
  generateTermParams,
  type TermParams,
} from '@/lib/pages/term-page'

export function generateStaticParams() {
  return generateTermParams('tags')
}

export async function generateMetadata({ params }: { params: Promise<TermParams> }) {
  return generateTermMetadata('tags', await params, 'fr')
}

export default async function Page({ params }: { params: Promise<TermParams> }) {
  return <TermPage taxonomy="tags" params={await params} locale="fr" />
}
