import '../../globals.css'
import { SiteLayout, siteMetadata } from '@/lib/pages/site-layout'

export const metadata = siteMetadata('en')

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout locale="en">{children}</SiteLayout>
}
