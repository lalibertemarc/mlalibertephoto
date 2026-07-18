/**
 * Error types and the run report.
 *
 * The migration accumulates findings rather than throwing on the first one. It runs over
 * 170 files and gets re-run while content is still changing, so surfacing every problem in
 * one pass beats fixing them one crash at a time. A run with any error writes nothing and
 * exits non-zero.
 *
 * Anticipated content problems are `MigrationError`s and become findings. Anything else is
 * a bug in this script and is left to crash with its stack intact.
 */

export abstract class MigrationError extends Error {
  abstract readonly code: string
  constructor(
    message: string,
    readonly file?: string,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class FrontmatterError extends MigrationError {
  readonly code = 'frontmatter'
}

/** A frontmatter key this pipeline does not know how to migrate. Never dropped silently. */
export class UnknownFrontmatterKeyError extends MigrationError {
  readonly code = 'unknown-frontmatter-key'
}

/** A shortcode name outside the verified closed set. Passing it through would emit `{{<` into MDX. */
export class UnknownShortcodeError extends MigrationError {
  readonly code = 'unknown-shortcode'
}

export class UnbalancedShortcodeError extends MigrationError {
  readonly code = 'unbalanced-shortcode'
}

export class MalformedTagError extends MigrationError {
  readonly code = 'malformed-tag'
}

/** FR and EN disagree on a value that meta.json can only hold once. */
export class LocaleDivergenceError extends MigrationError {
  readonly code = 'locale-divergence'
}

/** A local banner file that is missing and is not one of the four already known to be. */
export class MissingBannerError extends MigrationError {
  readonly code = 'missing-banner'
}

/** A derived URL does not match the live site. */
export class PermalinkMismatchError extends MigrationError {
  readonly code = 'permalink-mismatch'
}

export class SourcePairingError extends MigrationError {
  readonly code = 'source-pairing'
}

export type Severity = 'error' | 'warning' | 'info'

export interface Finding {
  severity: Severity
  code: string
  message: string
  file?: string
}

export class MigrationReport {
  private readonly findings: Finding[] = []

  error(code: string, message: string, file?: string): void {
    this.findings.push({ severity: 'error', code, message, file })
  }

  fail(e: MigrationError): void {
    this.findings.push({ severity: 'error', code: e.code, message: e.message, file: e.file })
  }

  warn(code: string, message: string, file?: string): void {
    this.findings.push({ severity: 'warning', code, message, file })
  }

  info(code: string, message: string, file?: string): void {
    this.findings.push({ severity: 'info', code, message, file })
  }

  get hasErrors(): boolean {
    return this.findings.some((f) => f.severity === 'error')
  }

  count(severity: Severity): number {
    return this.findings.filter((f) => f.severity === severity).length
  }

  /** Findings grouped by code, errors first, so a large run stays readable. */
  summarize(): string {
    if (this.findings.length === 0) return 'No findings.'

    const order: Severity[] = ['error', 'warning', 'info']
    const lines: string[] = []

    for (const severity of order) {
      const group = this.findings.filter((f) => f.severity === severity)
      if (group.length === 0) continue

      lines.push(`\n${severity.toUpperCase()} (${group.length})`)
      const byCode = new Map<string, Finding[]>()
      for (const f of group) {
        const bucket = byCode.get(f.code)
        if (bucket) bucket.push(f)
        else byCode.set(f.code, [f])
      }
      for (const [code, items] of [...byCode].sort((a, b) => a[0].localeCompare(b[0]))) {
        lines.push(`  ${code} (${items.length})`)
        for (const item of items) {
          lines.push(`    ${item.file ? `${item.file}: ` : ''}${item.message}`)
        }
      }
    }
    return lines.join('\n')
  }
}
