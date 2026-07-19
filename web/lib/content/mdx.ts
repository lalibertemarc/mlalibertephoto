/**
 * Splitting a migrated `.mdx` file into its frontmatter and its body.
 *
 * Shared because two readers need it and must agree: `blog-posts.ts` takes only the title
 * for the chrome, `site-index.ts` takes the whole frontmatter plus the body for the feeds.
 * A regex that disagreed between them would show up as a page whose title and whose feed
 * entry came from different halves of the same file.
 */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

export interface MdxParts {
  /** The raw YAML between the delimiters, unparsed. */
  frontmatter: string
  body: string
}

/** `null` when the file has no frontmatter block at all. */
export function splitMdxFrontmatter(source: string): MdxParts | null {
  const match = FRONTMATTER.exec(source)
  if (!match?.[1]) return null

  return { frontmatter: match[1], body: source.slice(match[0].length) }
}
