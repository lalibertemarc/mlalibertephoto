import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('smsPrices', 'fr')

export default function Page() {
  return <ContentPage pagePath="smsPrices" locale="fr" />
}
