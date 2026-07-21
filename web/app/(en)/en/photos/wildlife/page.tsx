import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('photos/wildlife', 'en')

export default function Page() {
  return <ContentPage pagePath="photos/wildlife" locale="en" />
}
