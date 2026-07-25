/**
 * The site's typeface, loaded once and shared by both root layouts.
 *
 * Mirrors the weights the Hugo site requests in layouts/partials/headers.html:48
 * (Roboto:400,100,100italic,300,300italic,500,700,800). next/font self-hosts these, so the
 * render-blocking fonts.googleapis.com request goes away.
 *
 * Extracted from app/layout.tsx when the per-locale route groups split it in two. Calling
 * the loader once and importing the result is Next's own guidance — a second call in the
 * other layout would be a second font instance for the same family.
 */

import { Roboto } from 'next/font/google'

export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-roboto',
  display: 'swap',
})
