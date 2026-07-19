import '../globals.css'
import { SiteLayout, siteMetadata } from '@/lib/pages/site-layout'

export const metadata = siteMetadata('fr')

export default function FrLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout locale="fr">{children}</SiteLayout>
}
