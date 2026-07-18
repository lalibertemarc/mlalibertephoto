import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'

// Mirrors the weights the Hugo site requests in layouts/partials/headers.html:48
// (Roboto:400,100,100italic,300,300italic,500,700,800). next/font self-hosts
// these, so the render-blocking fonts.googleapis.com request goes away.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-roboto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Marc Laliberte Photographe & Vidéographe',
  description: 'Photographe et vidéographe de la ville de Québec.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={roboto.variable}>
      <body>{children}</body>
    </html>
  )
}
