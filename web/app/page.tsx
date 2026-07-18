import Link from 'next/link'

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center text-center">
      <p className="text-section-label tracking-eyebrow text-white/45 uppercase">
        Migration scaffold
      </p>
      <h1 className="text-hero sm:text-hero-md md:text-hero leading-hero tracking-title mt-4 font-light text-white">
        Marc Laliberte
      </h1>
      <p className="text-section-subtitle leading-body max-w-subtitle mt-6 font-light text-white/60">
        Next.js scaffold with the design tokens lifted from{' '}
        <code className="text-accent">static/css/custom.css</code>. No pages
        migrated yet — that is items #3 through #9.
      </p>
      <Link
        href="/tokens/"
        className="text-button tracking-button rounded-button mt-10 inline-block border-[1.5px] border-white/50 px-6 py-2.5 text-white/85 transition-colors duration-250 hover:border-white/80 hover:bg-white/10 hover:text-white"
      >
        View token reference
      </Link>
    </main>
  )
}
