import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/events', 'fr')

export default function Page() {
  return <ContentPage pagePath="photos/events" locale="fr" />
}
