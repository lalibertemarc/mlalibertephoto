import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos', 'en')

export default function Page() {
  return <ContentPage pagePath="photos" locale="en" />
}
