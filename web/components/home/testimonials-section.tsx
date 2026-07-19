/**
 * "What my clients say" — six testimonials.
 *
 * The one section that is not a faithful port. In Hugo this is an Owl carousel
 * (`<ul class="owl-carousel testimonials" data-items="4">`, autoplay off, swipeable, stepping
 * 4/3/2/1 across breakpoints) showing four of the six at rest. Here it is a static grid showing
 * all six, at the same column counts — a deliberate change, chosen so the section ships no
 * client JavaScript now that the page's only remaining carousel is the hero. Two testimonials
 * that previously needed a swipe to reach are now simply visible.
 *
 * No CSS module: the source gives `.hp-testimonial-card` no hover state, so there is no cascade
 * to scope and utilities carry the whole card.
 *
 * `min-[480px]` is the one arbitrary breakpoint on the homepage. It is Owl's `itemsMobile`
 * boundary, not a Bootstrap one, so it has no named variant in this config — the three defined
 * are sm/md/lg at 768/992/1200.
 */

import { getTestimonials } from '@/lib/content/homepage-data'
import type { Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import { QuoteIcon } from './icons'
import { SectionHeading } from './section-heading'

export function TestimonialsSection({ locale }: { locale: Locale }) {
  const t = getT(locale, 'Home')
  const testimonials = getTestimonials()

  return (
    <section className="bg-surface-hero py-section max-md:py-section-md max-sm:py-section-sm">
      <div className="container">
        <SectionHeading label={t('testimonialsTitle')} subtitle={t('testimonialsSubtitle')} />

        <ul className="grid list-none grid-cols-1 gap-card-gap p-0 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-sm:gap-card-gap-sm">
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.name + testimonial.position.fr}
              // p-8 is 2rem = 20px at this 10px root — not `p-5`, which is 1.25rem = 12.5px
              // here rather than the 20px its name suggests at a default root.
              //
              // 20px uniform is measured, not read off custom.css, which declares
              // `2rem 1.5rem 1.5rem`. The theme's `.testimonial { padding: 20px }` sits on the
              // same element and wins.
              className="rounded-card border border-white/6 p-8 text-center"
            >
              {/* figure/figcaption rather than the source's bare divs: the attribution is the
                  quote's source, not part of the quote, and blockquote should carry only the
                  quoted text. Hugo put the author in an <h5>, which would inject a phantom
                  fifth-level heading into the page outline six times over. */}
              <figure className="m-0">
                <div className="mb-4 text-quote-icon text-accent opacity-70">
                  <QuoteIcon className="mx-auto size-[1em]" />
                </div>

                <blockquote className="mb-[1.2rem] p-0">
                  <p className="text-quote leading-quote font-light text-white/75 italic">
                    {testimonial.text[locale]}
                  </p>
                </blockquote>

                <figcaption>
                  {/* All six entries carry avatar: "" today, so this never renders — the
                      source's `{{ with .avatar }}` is equally dead. Kept as a real conditional
                      because the field is in the schema and populating it should just work. */}
                  {testimonial.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={testimonial.avatar}
                      alt=""
                      className="mx-auto mb-2 size-14 rounded-round object-cover"
                    />
                  ) : null}
                  {/* leading-[1.1] because this is an h5 in the source and inherits Bootstrap's
                      heading line-height there; as a <p> here it would otherwise take the body's. */}
                  <p className="mb-[0.2rem] text-quote-author leading-[1.1] font-medium tracking-emphasis text-white/85 uppercase">
                    {testimonial.name}
                  </p>
                  <p className="text-quote-role font-light text-white/45">
                    {testimonial.position[locale]}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
