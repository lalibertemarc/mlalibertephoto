import {
  BlogIndexPage,
  blogIndexMetadata,
  generateBlogIndexParams,
} from '@/lib/pages/blog-index'

export const generateStaticParams = generateBlogIndexParams

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  return blogIndexMetadata('fr', (await params).page)
}

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  return <BlogIndexPage locale="fr" page={(await params).page} />
}
