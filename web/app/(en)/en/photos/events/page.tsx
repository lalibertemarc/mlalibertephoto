import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/events', 'en')

export default function Page() {
  return <ContentPage pagePath="photos/events" locale="en" />
}
