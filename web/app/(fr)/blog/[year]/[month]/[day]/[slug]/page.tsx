import {
  BlogPostPage,
  generateBlogPostMetadata,
  generateBlogPostParams,
  type BlogPostParams,
} from '@/lib/pages/blog-post'

export const generateStaticParams = generateBlogPostParams

export async function generateMetadata({ params }: { params: Promise<BlogPostParams> }) {
  return generateBlogPostMetadata(await params, 'fr')
}

export default async function Page({ params }: { params: Promise<BlogPostParams> }) {
  return <BlogPostPage params={await params} locale="fr" />
}
