import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('videos', 'en')

export default function Page() {
  return <ContentPage pagePath="videos" locale="en" />
}
