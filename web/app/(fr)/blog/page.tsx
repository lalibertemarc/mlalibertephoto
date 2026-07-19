import { BlogIndexPage, blogIndexMetadata } from '@/lib/pages/blog-index'

export const metadata = blogIndexMetadata()

export default function Page() {
  return <BlogIndexPage locale="fr" />
}
