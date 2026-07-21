import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('smsPrices', 'en')

export default function Page() {
  return <ContentPage pagePath="smsPrices" locale="en" />
}
