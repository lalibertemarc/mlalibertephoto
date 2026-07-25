import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/wildlife', 'fr')

export default function Page() {
  return <ContentPage pagePath="photos/wildlife" locale="fr" />
}
