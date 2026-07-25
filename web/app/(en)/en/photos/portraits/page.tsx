import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/portraits', 'en')

export default function Page() {
  return <ContentPage pagePath="photos/portraits" locale="en" />
}
