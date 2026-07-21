import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('restoration', 'en')

export default function Page() {
  return <ContentPage pagePath="restoration" locale="en" />
}
