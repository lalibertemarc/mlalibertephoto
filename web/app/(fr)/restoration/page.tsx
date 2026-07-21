import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('restoration', 'fr')

export default function Page() {
  return <ContentPage pagePath="restoration" locale="fr" />
}
