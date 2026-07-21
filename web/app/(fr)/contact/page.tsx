import { ContentPage, contentPageMetadata } from '@/lib/pages/content-page'

export const generateMetadata = () => contentPageMetadata('contact', 'fr')

export default function Page() {
  return <ContentPage pagePath="contact" locale="fr" />
}
