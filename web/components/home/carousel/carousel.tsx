'use client'

import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import type { EmblaCarouselType } from 'embla-carousel'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/permalink'
import type { CarouselSlide as CarouselSlideData } from '@/lib/schema'
import { CarouselSlide } from './carousel-slide'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import styles from './carousel.module.css'

/**
 * Owl's real interval, which is not the one the config appears to name. `slide_speed = 2000` in
 * params.toml feeds Owl's `slideSpeed` — the transition duration — while `auto_play = true`
 * reaches Owl as a boolean, which 1.3.2 turns into its own 5000ms default. Verified against the
 * running site: `$('.homepage').data('owlCarousel').options.autoPlay === 5000`.
 */
const AUTOPLAY_DELAY = 5000

/**
 * Embla's scroll duration, which is NOT milliseconds — it feeds a friction model, and the
 * default of 25 lands around 400ms. This value is tuned so a slide takes roughly the 2000ms
 * Owl's `slideSpeed` gives it today; measured in the browser rather than converted, because
 * there is no documented factor.
 */
const SCROLL_DURATION = 50

export function HomeCarousel({
  slides,
  locale,
}: {
  slides: CarouselSlideData[]
  locale: Locale
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  // Lazy useState, not useRef: the plugin instance has to be created once and then read during
  // render to be passed to useEmblaCarousel, and reading `.current` during render is exactly
  // what refs are not for.
  const [autoplay] = useState(() =>
    Autoplay({
      delay: AUTOPLAY_DELAY,
      // Owl's `stopOnHover: true` pauses while the pointer is over the hero and resumes when it
      // leaves. Both flags are needed for that: the plugin defaults to not pausing on hover at
      // all, and to treating any interaction as a permanent stop — which would leave the
      // carousel dead after the first hover or drag.
      stopOnMouseEnter: true,
      stopOnInteraction: false,
    }),
  )
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: SCROLL_DURATION }, [
    autoplay,
  ])

  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeIndexRef = useRef(0)
  const [dotIndex, setDotIndex] = useState(0)

  /**
   * Move `data-active` to the newly selected slide.
   *
   * Written imperatively, against refs, rather than derived from `dotIndex` in render. The
   * animations are `forwards`-filled and do not replay when a class is re-added within the same
   * frame, and the carousel loops — slide 1 becomes active again on every cycle and must animate
   * again. Deriving the attribute from state usually survives that, because each Embla `select`
   * is its own commit with a paint between; but `reInit` (a resize, a breakpoint change) can
   * re-fire `select` for an unchanged index, and React's automatic batching can then coalesce
   * the off and on into a single commit that never paints the off state. The animations would
   * silently stop replaying.
   *
   * So the toggle happens outside React entirely, and the remove → reflow → add sequence runs
   * unconditionally. It costs one layout read on one element a few times a minute, and it turns
   * "should replay" into "does replay".
   */
  const setActive = useCallback((index: number) => {
    const previous = slideRefs.current[activeIndexRef.current]
    const next = slideRefs.current[index]

    if (previous && previous !== next) previous.removeAttribute('data-active')

    if (next) {
      next.removeAttribute('data-active')
      void next.offsetWidth // force a style flush so re-adding restarts the animations
      next.setAttribute('data-active', 'true')
    }

    activeIndexRef.current = index
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = (api: EmblaCarouselType) => {
      const index = api.selectedScrollSnap()
      setActive(index)
      setDotIndex(index)
    }

    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, setActive])

  // A media query cannot stop a timer, so the autoplay half of the preference lives here. The
  // decorative half is in carousel.module.css and applies without waiting for hydration.
  useEffect(() => {
    // Guarding on emblaApi is load-bearing, not defensive. This effect runs on the first
    // render, when emblaApi is still undefined and the plugin has not been attached to a
    // carousel — calling play()/stop() then throws on the missing internal engine.
    if (!emblaApi) return
    if (prefersReducedMotion) autoplay.stop()
    else autoplay.play()
  }, [emblaApi, autoplay, prefersReducedMotion])

  const scrollTo = useCallback(
    (index: number) => {
      // `jump` skips the eased transition — the right behaviour when motion is unwelcome.
      emblaApi?.scrollTo(index, prefersReducedMotion)
    },
    [emblaApi, prefersReducedMotion],
  )

  return (
    <section className={styles.hero} aria-roledescription="carousel" aria-label="Portfolio">
      <div className={styles.viewport} ref={emblaRef}>
        <div className={styles.container}>
          {slides.map((slide, index) => (
            <CarouselSlide
              key={slide.href}
              slide={slide}
              locale={locale}
              isInitiallyActive={index === 0}
              ref={(element) => {
                slideRefs.current[index] = element
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.dots}>
        {slides.map((slide, index) => (
          <button
            key={slide.href}
            type="button"
            className={styles.dot}
            aria-current={index === dotIndex}
            aria-label={slide.title[locale]}
            onClick={() => scrollTo(index)}
          />
        ))}
      </div>
    </section>
  )
}
