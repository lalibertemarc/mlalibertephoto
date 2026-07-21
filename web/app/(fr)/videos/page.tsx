import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('videos', 'fr')

export default function Page() {
  return <ContentPage pagePath="videos" locale="fr" />
}
