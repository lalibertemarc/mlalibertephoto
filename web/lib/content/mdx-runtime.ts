/**
 * Turning a migrated MDX body into a React element tree, at build time.
 *
 * This is the one place the app evaluates content as code. It is deliberately narrow and
 * deliberately not part of `mdx.ts`: that module only splits frontmatter, and two readers
 * (`blog-posts.ts`, `site-index.ts`) import it specifically because it is cheap. Pulling
 * `@mdx-js/mdx`, `react/jsx-runtime` and the whole component map into their import graph to
 * read a title would defeat the reason they are separate.
 *
 * `output: 'export'` means there is no server at runtime, so every call here happens during
 * `next build` and its result is baked into the exported HTML.
 */

import { evaluate } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import type { ReactNode } from 'react'
import { findFirstImageModal, mdxComponents, type ImageModalProps } from '@/components/mdx'

export interface CompiledMdxBody {
  /** Render directly: `<PostBody>{tree}</PostBody>`. */
  tree: ReactNode
  /** The first `<ImageModal>` in the body, for the ImageObject block. `null` if there is none. */
  firstImage: ImageModalProps | null
}

/**
 * Compile and evaluate one MDX body.
 *
 * Nothing here is blog-specific — a standalone-page loader can reuse it verbatim.
 *
 * **No remark/rehype plugins**, matching `scripts/migrate-content.ts`'s compile gate exactly.
 * That parity is the point: the gate already proves every file in `web/content/` compiles, and
 * it only proves that for the configuration it used. Adding a plugin here would mean the thing
 * that was verified and the thing that runs are no longer the same thing.
 *
 * `development` is left at its default `false`, so `jsx`/`jsxs` are the required runtime
 * exports and `jsxDEV` is not involved. Content is static and rebuilt on every change, so
 * there is no value in a dev/build behavioural split — one path is easier to reason about.
 *
 * `baseUrl` is defensive. No body contains `import`/`export` (the migration's shortcode
 * registry is a closed set and an unrecognised name is a hard error there), so nothing
 * resolves a specifier today; passing it costs nothing and avoids a confusing failure if that
 * ever changes.
 */
export async function compileMdxBody(body: string): Promise<CompiledMdxBody> {
  const { default: Content } = await evaluate(body, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  })

  // Called as a plain function, not as `<Content />`. This is load-bearing, not a style
  // choice, and @mdx-js/mdx's own docs recommend it for exactly this case.
  //
  // `findFirstImageModal` walks `props.children`. A JSX element's `props.children` is only
  // whatever was passed *in* — for `<Content />` that is nothing, so the walk would always
  // return null and every post would silently lose its ImageObject block. Invoking `Content`
  // directly runs its body once and returns the real nested tree.
  //
  // This does not render anything: the MDX-generated function turns markdown into elements,
  // but `ImageModal`, `Gallery` and friends stay opaque element descriptors. Their own
  // function bodies are never called here — React's reconciler does that later — so no hook
  // rule and no `'use client'` boundary is crossed by this call.
  const tree = Content({ components: mdxComponents }) as ReactNode

  return { tree, firstImage: findFirstImageModal(tree) }
}
