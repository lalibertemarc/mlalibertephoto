# The authoring workflow

How a blog post gets written on this site, and the contract the `.claude/commands/` skills have
to satisfy to produce one that builds. Board item #11.

The migration is not finished when the site renders — it is finished when a post can be
published again. These five skills are that last mile.

## The five commands

| Command | Writes | Reads |
|---|---|---|
| `/new-blog-post` | `web/content/blog/<YYYY-MM-DD>-<slug>/{meta.json,fr.mdx,en.mdx}`, `web/lib/image-dimensions.json` | `uploadBlogImages.sh` output, the photos themselves |
| `/tag-blog-post` | the post's `meta.json` | every other post's `meta.json` (the vocabulary) |
| `/add-to-events` | `web/content/pages/photos/events/{fr,en}.mdx` | the post's three files |
| `/migrate-to-gallery` | the post's `fr.mdx` and `en.mdx` | — |
| `/photography-trends-report` | `trends-reports/photography-trends-report.md` | the corpus, then the web |

`uploadBlogImages.sh` survived the migration untouched: it resizes to 1920px, uploads to
Cloudinary and prints `[name] OK: <url>` lines, none of which the site generator was ever
involved in. `newBlog.sh` and `newPage.sh` were deleted — both were two-line `hugo new`
wrappers with nothing to point at any more.

## What changed from Hugo

Everything the old skills hardcoded:

| | Hugo | Next |
|---|---|---|
| Unit of content | two files, `content/{fr,en}/blog/name.md` | one folder, `web/content/blog/<date>-<slug>/` |
| Frontmatter | TOML, `+++`, every field in both files | YAML, `---`, only `title`/`description`/`meta_title`/`keywords`; the rest in `meta.json` once |
| Shared fields | duplicated per language, drift-prone | `meta.json`, single copy |
| Photo grid | `{{< gallery >}}` / `{{< image-modal src="…" >}}` | `<Gallery>` / `<ImageModal src={"…"} />` |
| Slug | Hugo lowercased the camelCase filename | explicit `slug` field, kebab-case for new posts |
| Banner size | hardcoded `600`×`600` | real pixels, from the dimension manifest |
| Tagging | edit two frontmatter blocks | edit one `meta.json` |

## The contract

`web/lib/schema.ts` is the authority, `npm --prefix web run validate:content` is the gate, and
every schema is a **`strictObject`** — an unrecognised key fails the build rather than being
dropped. That is deliberate: content authored by a model is exactly where a silently-ignored
field would go unnoticed. There is no `draft`, no `external_banner`, no `banner_width`.

Four things a skill can get wrong that validation will *not* catch:

**The date offset.** `date` carries an offset (`-04:00` / `-05:00`) and the URL's Y/M/D is the
date *as written in that offset*. `motherRockersValentinesDayPart2` is `2026-03-02T19:38:35-05:00`,
whose UTC date is the 3rd and whose live URL is `/2026/03/02/`. Any round-trip through a `Date`
— `new Date(raw).toISOString().slice(0,10)` being the obvious one — silently moves the post to a
URL that has never existed. Skills take the `YYYY-MM-DD` prefix as literal text. `RawDateSchema`
enforces the shape but cannot enforce the arithmetic, and `urlDate` is stored, not derived, so
the two agreeing is the author's job.

**The JSX prop form.** Props are emitted as `src={"…"}` — a JSX expression wrapping a
double-quoted string — not `src="…"`. Both compile and render identically, so nothing fails.
But `web/scripts/fetch-image-dimensions.ts` harvests image URLs with a regex matching the braced
form literally, so a plain string attribute means the image never enters
`web/lib/image-dimensions.json`, and `getDimensions` returning `undefined` degrades to an
unsized image rather than an error. The symptom is layout shift on one image, months later.

**Straight quotes in generated text.** An `alt` or `caption` containing `"` terminates the prop
string; a `{` or `}` in body text is read as an MDX expression. Both break the compile, which
surfaces at `next build` rather than at `validate:content` — the validator deliberately does not
compile bodies (`migrate-content.ts` gated on that once and `next build` does it again; a third
pass would be the slowest check in the chain and the least likely to find anything).

**Locale-crossed links.** `/add-to-events` writes `buttonUrl` twice, and the English gallery
must point at `permalink.en`. Nothing downstream checks that a link's locale matches its page's.

## Taxonomy

Terms are derived from post membership at build time (`web/lib/content/terms.ts`), never stored,
so the vocabulary is whatever the other posts' `meta.json` files say it is — and every new term
silently creates a new taxonomy page. `/tag-blog-post` enumerates the existing vocabulary before
choosing, because a near-miss (`rock music` beside `rock`) splits one page into two half-empty
ones.

The slug rules in `slugifyTerm` are worth re-reading before inventing a term. The one that
actually bites: an en-dash (U+2013) or non-breaking hyphen (U+2011) is deleted with no
replacement, merging the digits either side — `E 70–350mm` becomes `e-70350mm` — while a plain
hyphen is kept, and the three are indistinguishable in an editor. Taxonomy URLs are indexed;
see the redirect history in `netlify.toml`.

## `FlexImages` is not legacy

`/migrate-to-gallery` converts a post's photo layout from `FlexImages` to the `Gallery` grid, and
survived the migration because ~29 posts still use `FlexImages` for photos and converting one is
still an editorial choice.

What makes it more than a find-and-replace: `FlexImages` is *also* the wrapper around the
standalone `<NavButton>` CTA on the restoration, videos, smsPrices and photos pages and on
several blog posts, and `2025-10-08-butterbuttbutler` nests a `FlexImages` inside a `FlexImages`.
So the skill classifies each block by whether it contains an `ImageModal` before touching it, and
drops the `<br />` spacers on conversion — they separated flex-row items and would become empty
cells in a grid.

## Verified end to end

A post authored to this spec was built on 2026-07-24: `validate:content` passed first try (78
posts), `next build` generated 453 pages, and the kebab-case slug produced
`/blog/2026/07/24/post-de-test-migration/` plus its `/en/` twin with a correct hreflang pair and
the offset intact in `lastmod`. The banner's real dimensions reached the head as
`og:image:width` 1920 / `og:image:height` 1536. The link checker's only warnings were the 14
pre-existing dot-in-slug taxonomy hops (board item #17). The test post was then removed and the
SEO artifacts regenerated.
