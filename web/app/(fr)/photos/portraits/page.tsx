import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/portraits', 'fr')

export default function Page() {
  return <ContentPage pagePath="photos/portraits" locale="fr" />
}
