/**
 * Types `useTranslations` against the actual catalogs, so `t('close')` in the wrong
 * namespace is a build error rather than a missing string in the browser. French is the
 * default locale, so fr.json is the reference shape.
 */

import type { Messages } from '@/lib/messages'
import type { Locale } from '@/lib/permalink'

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: Messages
  }
}
