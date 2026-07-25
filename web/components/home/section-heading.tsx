/**
 * The centred label-and-subtitle block that opens three of the four sections.
 *
 * The label is an `h2` in the source even though it reads as an eyebrow, and that is kept: the
 * homepage's only `h1` is the carousel slide's title, so these are the page's real second-level
 * headings and demoting them to a `p` would flatten the document outline.
 *
 * **Measured, not read off custom.css.** Hugo's `.hp-section-label` rules lose to the theme's
 * `.heading h2` (`style.marsala.css`), which is a class-plus-element selector and therefore more
 * specific than a class alone. Three properties differ from what custom.css appears to say, and
 * porting the declared values got all three wrong:
 *
 * | property        | custom.css says | actually renders          |
 * |-----------------|-----------------|---------------------------|
 * | letter-spacing  | 0.18em          | 0.06em  (--tracking-label)|
 * | margin          | margin-bottom .6em | 20px 0 0               |
 * | border-bottom   | —               | 5px solid the gold accent |
 *
 * That gold rule under each section label is a prominent piece of the design, and it exists
 * nowhere in custom.css. Where declaration and computed value disagree, computed wins — the same
 * rule docs/routing-and-chrome.md records for the footer contact button.
 *
 * The subtitle is omitted entirely when absent rather than rendered empty — Hugo's
 * `{{ with .Site.Params.recent_posts.subtitle }}` does the same, and both locales set it to ""
 * today, so the recent-posts section legitimately has no subtitle.
 */

export function SectionHeading({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    // mb-2 reproduces `.heading { margin-bottom: 0.5rem }`. With a subtitle it collapses into
    // the subtitle's own 25px; without one it is the whole gap, which is the recent-posts case.
    <div className="mb-2 text-center">
      {/* inline-block so the gold rule spans the text, not the full container width. */}
      {/* mt-8 is 2rem = 20px and pb-4 is 1rem = 10px at this 10px root. */}
      <h2 className="mt-8 mb-0 inline-block border-b-[5px] border-accent pb-4 text-section-label font-light tracking-label text-white/45 uppercase">
        {label}
      </h2>
      {subtitle ? (
        <p className="mx-auto mb-10 max-w-subtitle text-section-subtitle leading-body font-light tracking-body text-white/60 max-sm:mb-[1.8rem] max-sm:text-section-subtitle-sm">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
