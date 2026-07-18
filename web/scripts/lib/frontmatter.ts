import { FrontmatterError } from './report.ts'

/**
 * Parser for the TOML frontmatter subset Hugo content actually uses.
 *
 * This is hand-rolled rather than delegated to a TOML library, and that is a deliberate
 * correctness choice, not a dependency-count one. TOML has a first-class datetime type, so
 * any spec-compliant parser hands back a `Date` for the `date` key — exactly the value the
 * URL contract forbids producing, because a Date carries no memory of the offset the URL
 * was derived in (see `lib/permalink.ts`). Using a library would mean immediately undoing
 * its single most useful behaviour for the one field where a mistake is unrecoverable.
 *
 * The grammar below is the whole of what 170 files use: flat keys, no nested or inline
 * tables, no dotted keys, no multi-line strings. Anything outside it raises rather than
 * being skipped, so content that grows a new shape stops the migration instead of losing
 * data quietly.
 */

export type TomlValue = string | number | boolean | string[]

export interface ParsedFrontmatter {
  data: Record<string, TomlValue>
  body: string
}

const DELIMITER = '+++'
const KEY_VALUE = /^([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.*)$/
const DATETIME = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?)?$/

export function splitFrontmatter(raw: string, file: string): { frontmatter: string; body: string } {
  // Tolerate a leading BOM or blank lines before the opening fence.
  const text = raw.startsWith('﻿') ? raw.slice(1) : raw
  const start = text.indexOf(DELIMITER)
  if (start === -1 || text.slice(0, start).trim() !== '') {
    throw new FrontmatterError('File does not open with a +++ frontmatter fence', file)
  }
  const afterOpen = start + DELIMITER.length
  const end = text.indexOf(DELIMITER, afterOpen)
  if (end === -1) {
    throw new FrontmatterError('Unterminated +++ frontmatter fence', file)
  }
  return {
    frontmatter: text.slice(afterOpen, end),
    body: text.slice(end + DELIMITER.length).replace(/^\r?\n/, ''),
  }
}

function parseScalar(raw: string, key: string, file: string): TomlValue {
  const value = raw.trim()

  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1)
  }
  // TOML literal string: no escape processing, which is what we want for Windows-ish paths.
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1)
  }
  if (value === 'true') return true
  if (value === 'false') return false

  // Datetimes stay strings. This is the whole reason this parser exists.
  if (DATETIME.test(value)) return value

  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10)
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value)

  throw new FrontmatterError(`Unsupported value for key "${key}": ${JSON.stringify(value)}`, file)
}

function parseArray(raw: string, key: string, file: string): string[] {
  const inner = raw.trim().slice(1, -1).trim()
  if (inner === '') return []

  const items: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (const char of inner) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === ',') {
      items.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (quote) throw new FrontmatterError(`Unterminated string in array "${key}"`, file)
  if (current.trim() !== '') items.push(current.trim())

  return items.filter((item) => item !== '')
}

export function parseFrontmatter(raw: string, file: string): ParsedFrontmatter {
  const { frontmatter, body } = splitFrontmatter(raw, file)
  const data: Record<string, TomlValue> = {}

  const lines = frontmatter.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim()
    if (line === '' || line.startsWith('#')) continue

    const match = KEY_VALUE.exec(line)
    if (!match || match[1] === undefined || match[2] === undefined) {
      throw new FrontmatterError(`Cannot parse frontmatter line: ${JSON.stringify(line)}`, file)
    }
    const key = match[1]
    let value = match[2]

    // Arrays are single-line throughout the corpus, but keep reading if one is ever split
    // across lines rather than failing on content that TOML considers perfectly valid.
    if (value.startsWith('[') && !value.includes(']')) {
      while (!value.includes(']') && i + 1 < lines.length) {
        i++
        value += ' ' + (lines[i] ?? '').trim()
      }
      if (!value.includes(']')) {
        throw new FrontmatterError(`Unterminated array for key "${key}"`, file)
      }
    }

    if (key in data) {
      throw new FrontmatterError(`Duplicate frontmatter key "${key}"`, file)
    }
    data[key] = value.startsWith('[')
      ? parseArray(value, key, file)
      : parseScalar(value, key, file)
  }

  return { data, body }
}

/** Narrowing helpers — frontmatter values are a union, and callers need one branch of it. */
export function expectString(
  data: Record<string, TomlValue>,
  key: string,
  file: string,
): string {
  const value = data[key]
  if (typeof value !== 'string') {
    throw new FrontmatterError(`Expected "${key}" to be a string, got ${typeof value}`, file)
  }
  return value
}

export function optionalString(
  data: Record<string, TomlValue>,
  key: string,
  file: string,
): string | undefined {
  if (!(key in data)) return undefined
  return expectString(data, key, file)
}

export function expectStringArray(
  data: Record<string, TomlValue>,
  key: string,
  file: string,
): string[] {
  const value = data[key]
  if (!Array.isArray(value)) {
    throw new FrontmatterError(`Expected "${key}" to be an array`, file)
  }
  return value
}

export function optionalStringArray(
  data: Record<string, TomlValue>,
  key: string,
  file: string,
): string[] | undefined {
  if (!(key in data)) return undefined
  return expectStringArray(data, key, file)
}

export function optionalNumber(
  data: Record<string, TomlValue>,
  key: string,
  file: string,
): number | undefined {
  if (!(key in data)) return undefined
  const value = data[key]
  if (typeof value !== 'number') {
    throw new FrontmatterError(`Expected "${key}" to be a number`, file)
  }
  return value
}

export function optionalBoolean(
  data: Record<string, TomlValue>,
  key: string,
  file: string,
): boolean | undefined {
  if (!(key in data)) return undefined
  const value = data[key]
  if (typeof value !== 'boolean') {
    throw new FrontmatterError(`Expected "${key}" to be a boolean`, file)
  }
  return value
}
