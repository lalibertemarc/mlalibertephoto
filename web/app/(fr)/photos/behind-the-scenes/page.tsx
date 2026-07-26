import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/behind-the-scenes', 'fr')

export default function Page() {
  return <ContentPage pagePath="photos/behind-the-scenes" locale="fr" />
}
