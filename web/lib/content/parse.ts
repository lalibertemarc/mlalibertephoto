/**
 * Schema parsing that names the file it failed on.
 *
 * `schema.parse(json)` throws a `ZodError` whose message lists paths *inside* the object and
 * says nothing about where the object came from. Across 85 `meta.json` and 154 MDX
 * frontmatters that is the difference between a build failure someone can act on and one
 * they have to bisect. Every content reader parses through here, so the file path is never
 * lost — whether the failure surfaces in `scripts/validate-content.ts` or three hundred
 * pages into a `next build`.
 *
 * Paths are reported relative to `process.cwd()`, which is `web/` for both the app and the
 * scripts, giving `content/blog/2025-10-29-prohibition/meta.json` rather than an absolute
 * path that differs between a laptop and Netlify.
 */

import path from 'node:path'
import type { z } from 'zod'

export class ContentValidationError extends Error {
  constructor(
    readonly file: string,
    readonly issues: readonly string[],
  ) {
    super(`${file}\n${issues.map((issue) => `    - ${issue}`).join('\n')}`)
    this.name = 'ContentValidationError'
  }
}

/** One line per issue: the failing key path, then what was wrong with it. */
export function describeZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const keyPath = issue.path.join('.')
    return keyPath ? `${keyPath}: ${issue.message}` : issue.message
  })
}

export function displayPath(file: string): string {
  return path.relative(process.cwd(), file).replace(/\\/g, '/')
}

/**
 * `schema.parse`, but a failure throws a `ContentValidationError` naming `file`.
 *
 * `file` may be absolute; it is displayed relative to the working directory.
 */
export function parseContentFile<S extends z.ZodType>(
  schema: S,
  value: unknown,
  file: string,
): z.infer<S> {
  const result = schema.safeParse(value)
  if (result.success) return result.data as z.infer<S>
  throw new ContentValidationError(displayPath(file), describeZodIssues(result.error))
}
