import { HomePage, homeMetadata } from '@/lib/pages/home'

export const metadata = homeMetadata('en')

export default function Page() {
  return <HomePage locale="en" />
}
