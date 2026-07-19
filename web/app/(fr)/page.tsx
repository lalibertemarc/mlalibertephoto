import { HomePage, homeMetadata } from '@/lib/pages/home'

export const metadata = homeMetadata('fr')

export default function Page() {
  return <HomePage locale="fr" />
}
