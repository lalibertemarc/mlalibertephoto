import Link from 'next/link'
import type { BlogPostSummary } from '@/lib/content/blog-posts'
import { linkTargetProps } from '@/lib/links'
import { pagePermalink, type Locale } from '@/lib/permalink'
import { getSiteConfig } from '@/lib/site-config'
import { getT } from '@/lib/translate'

/**
 * Three columns and a copyright bar, ported from layouts/partials/footer.html.
 *
 * A server component with no client JS. The source's `same-height-row` /
 * `same-height-always` classes are driven by front.js measuring and equalising heights at
 * runtime; the recent-posts rows only ever needed a thumbnail beside a title, which is one
 * flex row and no measurement.
 *
 * The theme-attribution line ("Template by Bootstrapious", "Ported to Hugo by DevCows",
 * footer.html:68-70) is not carried across. It is a factual claim about what builds this
 * site, and it stops being true here.
 */
export function Footer({
  locale,
  recentPosts,
}: {
  locale: Locale
  recentPosts: BlogPostSummary[]
}) {
  const site = getSiteConfig(locale)
  const t = getT(locale, 'Footer')
  const contactHref = pagePermalink('contact', locale)
  const telHref = `tel:${site.address.phone.replace(/[^\d+]/g, '')}`
  const mailHref = `mailto:${site.address.email}`

  return (
    <>
      <footer className="bg-surface-footer py-footer text-white/50">
        <div className="container flex flex-wrap">
          <Column heading={t('aboutUs')}>
            <p>{site.aboutUs}</p>
          </Column>

          <Column heading={t('recentPosts')}>
            <ul>
              {recentPosts.map((post, index) => (
                <li
                  key={post.href}
                  className={[
                    // Measured from `.blog-entries .item` on the live site: a 15% thumbnail
                    // with a 10px gutter, hairline-separated between rows.
                    'flex items-center gap-[10px] py-[5px]',
                    index < recentPosts.length - 1 ? 'mb-[10px] border-b border-white/6' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Link href={post.href} className="w-[15%] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- banners are
                        arbitrary content URLs with no dimensions in meta.json for 4 of 77
                        posts; next/image would need a size for every one. */}
                    <img src={post.imageSrc} alt="" className="block w-full" />
                  </Link>
                  <h5 className="m-0 text-[12px] font-black uppercase tracking-[0.08em]">
                    <Link href={post.href} className="text-white/70 hover:text-accent">
                      {post.title}
                    </Link>
                  </h5>
                </li>
              ))}
            </ul>
          </Column>

          <Column heading={t('contactTitle')}>
            <p className="uppercase">
              <strong className="text-white/75">{site.address.name}</strong>
              <br />
              <a href={telHref} {...linkTargetProps(telHref)} className="hover:text-accent">
                {site.address.phone}
              </a>
              <br />
              <a href={mailHref} {...linkTargetProps(mailHref)} className="hover:text-accent">
                {site.address.email}
              </a>
              <br />
              {site.address.region}
              <br />
              <strong className="text-white/75">{site.address.country}</strong>
            </p>
            <Link
              href={contactHref}
              // Border width and colour follow the *computed* values on the live site, not
              // custom.css's declaration: Bootstrap's `.btn` has equal specificity and wins
              // the border (1px, not the declared 1.5px), and the resolved link colour is
              // white/55 rather than the declared white/70.
              className="mt-[10px] inline-block rounded-button border border-white/30 px-button-footer-x py-button-footer-y text-button-footer uppercase tracking-button text-white/55 transition-colors duration-250 hover:border-white/50 hover:bg-white/8 hover:text-white"
            >
              {t('contactGoTo')}
            </Link>
          </Column>
        </div>
      </footer>

      <div className="bg-surface-copyright py-copyright text-white/35">
        <div className="container">
          <p>{site.copyright}</p>
        </div>
      </div>
    </>
  )
}

/** `col-md-4 col-sm-6` — three across on desktop, two on tablet, stacked on phones. */
function Column({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="w-full px-gutter sm:w-1/2 md:w-1/3">
      <h4 className="mb-[10px] text-footer-heading uppercase tracking-footer-heading text-white/70">
        {heading}
      </h4>
      {children}
    </div>
  )
}
