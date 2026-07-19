/**
 * The three homepage data sets, from the JSON the migration writes.
 *
 * Static imports rather than `fs` reads: these are three small, checked-in, flat arrays, which
 * is the `lib/messages.ts` case, not the `lib/content/blog-posts.ts` one. That module is async
 * because it enumerates 77 unknown directories; there is nothing to enumerate here.
 *
 * Validated again at module load even though `scripts/migrate-content.ts` already ran these
 * schemas. That parse happened once, against the source YAML, at generation time — the JSON
 * read here is a separate checked-in artefact that can be hand-edited, half-regenerated, or
 * left behind by a change to `lib/schema.ts`. For 16 objects the cost is unmeasurable, and it
 * makes this module's correctness independent of whether the general build-time validation
 * item ever lands. `strictObject` means an unrecognised key fails the build rather than being
 * dropped quietly, matching how the migration treats the same data.
 *
 * Locale-agnostic on purpose: every record carries both languages per field, so slicing by
 * locale here would mean re-validating and re-sorting identical data twice per page. The
 * sections take `locale` and index `[locale]` at render.
 */

import carouselRaw from '@/content/data/carousel.json'
import featuresRaw from '@/content/data/features.json'
import testimonialsRaw from '@/content/data/testimonials.json'
import {
  CarouselSlideSchema,
  FeatureSchema,
  TestimonialSchema,
  type CarouselSlide,
  type Feature,
  type Testimonial,
} from '@/lib/schema'

/**
 * Both of these are written in source-filename order, which is not display order — carousel.json
 * is weight 2,1,3,4, so unsorted the hero would open on Events instead of Portraits. Hugo sorts
 * at render time (`sort .Site.Data.carousel "weight"`); this sorts once, at load.
 */
const carouselSlides: CarouselSlide[] = CarouselSlideSchema.array()
  .parse(carouselRaw)
  .sort((a, b) => a.weight - b.weight)

const features: Feature[] = FeatureSchema.array()
  .parse(featuresRaw)
  .sort((a, b) => a.weight - b.weight)

/**
 * No sort. `TestimonialSchema` has no `weight`, and the array order already is production's
 * order: Hugo ranges a `.Site.Data` map, which iterates by key — the source filename — and the
 * migration wrote the array in that same sorted-filename order. Re-sorting by anything else
 * would diverge from the live site rather than match it.
 */
const testimonials: Testimonial[] = TestimonialSchema.array().parse(testimonialsRaw)

/** The four hero slides, ascending by `weight`. */
export function getCarouselSlides(): CarouselSlide[] {
  return carouselSlides
}

/** The six feature cards, ascending by `weight`. */
export function getFeatures(): Feature[] {
  return features
}

/** The six testimonials, in the order the live site renders them. */
export function getTestimonials(): Testimonial[] {
  return testimonials
}
