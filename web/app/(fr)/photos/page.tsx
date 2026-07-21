import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos', 'fr')

export default function Page() {
  return <ContentPage pagePath="photos" locale="fr" />
}
