import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('contact', 'en')

export default function Page() {
  return <ContentPage pagePath="contact" locale="en" />
}
