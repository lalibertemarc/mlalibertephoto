/**
 * The Server Component counterpart to `useTranslations`.
 *
 * `next-intl/server` is entirely unusable in this app, and not for the reason the
 * migration brief assumed. Every one of its APIs — `getTranslations`, `getMessages`,
 * `getLocale`, `getFormatter` — routes through `getConfig()`, which imports the module
 * specifier `next-intl/config`. Only `createNextIntlPlugin` aliases that specifier to a
 * user `i18n/request.ts`; unaliased, it resolves to a stub whose entire body is
 * `throw new Error("Couldn't find next-intl config file...")`. That throw happens before
 * the arguments are read, so even `getTranslations({ locale, namespace })` — passing the
 * locale explicitly — fails exactly as hard.
 *
 * `setRequestLocale` is a real export and does not itself throw, but it is dead weight
 * here: all it does is write a locale into a React `cache()`, and nothing that could read
 * that value back ever succeeds without the config file. Calling it would imply a
 * mechanism that is not present.
 *
 * `createTranslator` is the half underneath that has no such dependency: a synchronous,
 * pure function over `{ locale, messages, namespace }`, re-exported at the top level of
 * next-intl via `export * from 'use-intl/core'`. It is what `getTranslations` calls once
 * `getConfig()` has succeeded, so this skips the broken step rather than working around
 * it. Typing comes for free — `createTranslator` reads `Locale` and `Messages` off
 * `AppConfig`, which `global.d.ts` already narrows to this app's types.
 *
 * Client components keep using `useTranslations` under `IntlProvider`; see
 * `components/intl-provider.tsx` for why that one has to stay a client component.
 */

import { createTranslator, type NamespaceKeys, type NestedKeyOf } from 'next-intl'
import { getMessages, type Messages } from './messages'
import type { Locale } from './permalink'

export function getT<
  NestedKey extends NamespaceKeys<Messages, NestedKeyOf<Messages>> = never,
>(locale: Locale, namespace?: NestedKey) {
  return createTranslator({ locale, messages: getMessages(locale), namespace })
}
