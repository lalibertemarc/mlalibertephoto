import { BlogIndexPage, blogIndexMetadata } from '@/lib/pages/blog-index'

export const metadata = blogIndexMetadata('en')

export default function Page() {
  return <BlogIndexPage locale="en" />
}
