Create a new bilingual blog post for this Next.js photography portfolio.

## Input

The arguments are: $ARGUMENTS

Format: `<title> | <header text FR> | <header text EN>`
- **title**: The blog post title (used for the slug and the French `title` in frontmatter).
- **header text FR**: A descriptive heading in French that appears as the `## h2` in the French post. Also used to generate French banner alt, description, image `alt`, and `caption` values.
- **header text EN**: A descriptive heading in English that appears as the `## h2` in the English post. Also used to generate English banner alt, description, image `alt`, and `caption` values.

Example: `ButterButtButlerLive | ButterButtButler live à la Source de la Martinière | ButterButtButler live at the Source de la Martinière`

If only one `|` separator is present, the left side is the title and the right side is the French header text — translate it to English for the English header text.
If no `|` separator is present, use the entire argument as both the title and French header text, and translate it to English.

## The content model

A post is a **folder**, not a pair of files:

```
web/content/blog/<YYYY-MM-DD>-<slug>/
├── meta.json   # everything both languages share
├── fr.mdx      # French title/description + body
└── en.mdx      # English title/description + body
```

`web/lib/schema.ts` is the authority on the shape of all three, and every schema there is a
`strictObject`: **an unrecognised key fails the build**, it is not dropped quietly. There is no
`draft`, no `external_banner`, no `banner_width`/`banner_height` — those were Hugo keys and
they are gone. Do not invent fields.

## Steps

### 1. Parse the title and generate a kebab-case slug

- Split $ARGUMENTS on `|` to get the title (first part, trimmed), French header text (second part, trimmed), and English header text (third part, trimmed).
- Use the title as the French title in `fr.mdx`.
- Generate a **kebab-case** slug from the title: strip accents/diacritics, split on camelCase boundaries, replace every run of non-alphanumeric characters (spaces, apostrophes, punctuation) with a single `-`, lowercase, and trim leading/trailing hyphens. Note that an apostrophe becomes a word boundary, not a deletion. For example:
  - "Mon nouveau post de photos" → `mon-nouveau-post-de-photos`
  - "L'été à Québec" → `l-ete-a-quebec`
  - "ButterButtButlerLive" → `butter-butt-butler-live`
  - "Mother Rockers Valentines Day Part 2" → `mother-rockers-valentines-day-part-2`
- The slug must match `^[a-z0-9]+(-[a-z0-9]+)*$` — lowercase letters, digits and single hyphens only.

The 77 migrated posts use run-together lowercase slugs (`motherrockersvalentinesdaypart2`)
because Hugo derived the slug by lowercasing a camelCase filename. That rule no longer exists —
the slug is now an explicit field — so new posts use readable kebab-case. Do not "fix" the old
posts to match: their URLs are indexed.

### 2. Get the current local datetime

Run this and use the result verbatim:

```powershell
Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
```

It produces e.g. `2026-07-24T14:30:00-04:00`. The offset is **load-bearing**: the post's URL uses
the Y/M/D as written in that offset, not its UTC equivalent. Never round-trip this string through
a `Date` object or `toISOString()` — a post written at 19:38 on the 2nd in `-05:00` is
`2026-03-02` in its URL and `2026-03-03` in UTC, and the wrong one is a URL that never existed.

Take `YYYY`, `MM` and `DD` for the folder name and `urlDate` straight off the front of this
string as literal text.

### 3. Upload images via uploadBlogImages.sh

- Run `./uploadBlogImages.sh` from the repo root.
- This script reads images from `P:\Images\blog\source`, resizes them for web, outputs them to `P:\Images\blog\output`, uploads to Cloudinary, and prints URLs.
- Capture the full output. Parse all Cloudinary URLs from lines matching the pattern `[imagename] OK: https://res.cloudinary.com/...`. Extract only the URLs, keeping their order.
- If the script fails or returns no URLs, stop and report the error to the user.
- Print all captured URLs to the console so the user can see them.

### 4. Visually inspect each photo and generate descriptions, alt text, and captions

**First, view every uploaded photo** using the Read tool on each image file in `P:\Images\blog\output\`. This lets you see what is actually depicted in each photo.

Then, using **both the visual content of each photo AND the header text** from step 1, generate **separate French and English versions** of all text fields. The alt and caption for each image must reflect what is actually visible in that specific photo — not just be generic variations of the header text.

**French (for `fr.mdx`):**
- **description (FR)**: A concise French summary sentence derived from the French header text, suitable for SEO/meta description.
- **banner alt (FR)**: A concise descriptive variation of the French header text.
- **image alt (FR)**: For each image, a unique descriptive sentence based on **what you see in the photo**, using the French header text for thematic context. Straightforward and descriptive (good for accessibility). Example: if the photo shows a guitarist mid-solo under red lighting, write that — don't just paraphrase the header.
- **image caption (FR)**: For each image, a unique **dramatic and engaging** caption inspired by **what you see in the photo** and the French header text. Vivid, evocative, and punchy — use action verbs, sensory language, and energy. Examples:
  - "ButterButtButler enflamme la Source de la Martinière"
  - "L'énergie brute de ButterButtButler en plein set"
  - "Sous les projecteurs, ButterButtButler donne tout"

**English (for `en.mdx`):**
- **description (EN)**: A concise English summary sentence derived from the English header text, suitable for SEO/meta description.
- **banner alt (EN)**: A concise descriptive variation of the English header text.
- **image alt (EN)**: For each image, a unique descriptive sentence based on **what you see in the photo**, using the English header text for thematic context. Straightforward and descriptive (good for accessibility).
- **image caption (EN)**: For each image, a unique **dramatic and engaging** caption inspired by **what you see in the photo** and the English header text. Vivid, evocative, and punchy — use action verbs, sensory language, and energy. Examples:
  - "ButterButtButler sets the Source de la Martinière ablaze"
  - "The raw energy of ButterButtButler mid-set"
  - "Under the spotlights, ButterButtButler gives it all"

Every alt and caption must be distinct — no two should be identical, within each language or across languages. Each must describe the specific photo it belongs to.

**Never use a straight double quote (`"`) inside any of these values.** They are emitted into
JSX props as `alt={"…"}`, and a `"` in the text terminates the string and breaks the MDX
compile. Use typographic quotes (`«  »`, `“ ”`) or an apostrophe instead. Curly braces `{` `}`
are likewise forbidden in body text — MDX reads them as an expression.

### 5. Create `fr.mdx`

Create `web/content/blog/<YYYY-MM-DD>-<slug>/fr.mdx` using the **French** text from step 4:

```mdx
---
title: "<title from arguments>"
description: "<generated description (FR)>"
---

## <French header text from arguments>

<Gallery>
<ImageModal src={"<cloudinary URL 1>"} width={"500px"} alt={"<generated alt (FR) 1>"} caption={"<generated caption (FR) 1>"} />
<ImageModal src={"<cloudinary URL 2>"} width={"500px"} alt={"<generated alt (FR) 2>"} caption={"<generated caption (FR) 2>"} />
... (one ImageModal per uploaded image, in upload order) ...
</Gallery>
```

Frontmatter is **YAML between `---` fences**, not TOML between `+++`. Only `title`,
`description`, `meta_title` and `keywords` are accepted keys; the first two are required. Every
shared field — date, tags, categories, authors, banner — lives in `meta.json` and must not be
repeated here.

Every `ImageModal` prop is a **JSX expression containing a double-quoted string**:
`src={"https://…"}`, not `src="https://…"`. This is not cosmetic. `web/scripts/fetch-image-dimensions.ts`
harvests image URLs with a regex that matches `src={"…"}` literally, so a plain string attribute
means the image never enters the dimension manifest and ships unsized.

One `ImageModal` per line, no blank lines and no `<br />` between them — `Gallery` is a CSS grid
and lays the images out itself.

### 6. Create `en.mdx`

Same structure as `fr.mdx`, with the **English** text from step 4:
- `title` → translate the French title to English
- `description` → description (EN)
- `## h2` header → English header text from arguments
- each `alt` → alt (EN)
- each `caption` → caption (EN)

The `src` and `width` of every image are identical to the French file — only the human-readable
text differs.

### 7. Resolve the real image dimensions

```bash
npm --prefix web run images:dimensions
```

This scrapes the MDX files you just wrote for image URLs, fetches the intrinsic pixel size of
every one that is new to `web/lib/image-dimensions.json`, and rewrites the manifest.
`next/image` needs real dimensions to reserve a box before the bytes arrive; without an entry
the image renders unsized and the page reflows as it loads.

This runs **after** the MDX files exist and **before** `meta.json`, because it reads the former
and supplies a value the latter needs. If the script reports a failure for any URL, stop and
report it — the upload may not have completed.

### 8. Create `meta.json`

Read the banner image's entry out of `web/lib/image-dimensions.json` and use its real `w`/`h`.
The SEO layer publishes these as `og:image:width`/`og:image:height`, so a wrong value is a wrong
social card. Hugo hardcoded every banner as 600×600, which was a fiction — the uploaded images
are 1920px wide. Never write a placeholder here and never guess.

Create `web/content/blog/<YYYY-MM-DD>-<slug>/meta.json`:

```json
{
  "slug": "<slug from step 1>",
  "date": "<datetime from step 2>",
  "urlDate": {
    "year": "<YYYY>",
    "month": "<MM>",
    "day": "<DD>"
  },
  "permalink": {
    "fr": "/blog/<YYYY>/<MM>/<DD>/<slug>/",
    "en": "/en/blog/<YYYY>/<MM>/<DD>/<slug>/"
  },
  "tags": [],
  "categories": [],
  "authors": ["Marc Laliberté"],
  "banner": {
    "src": "<first Cloudinary URL from step 3>",
    "alt": "<generated banner alt (FR)>",
    "width": <w from the manifest>,
    "height": <h from the manifest>
  }
}
```

Both permalinks carry a leading **and** trailing slash; French has no locale prefix (it is the
default language), English is prefixed with `/en`. The Y/M/D in the folder name, in `urlDate`
and in both permalinks must all be the same three values from step 2.

### 9. Validate

```bash
npm --prefix web run validate:content
```

Every file must pass. A schema error names the file and the offending key; fix it and re-run
until the run is clean. Do not report success on a post that has not validated.

### 10. Report results

Output:
- The folder created and the three files in it
- The post's French and English URLs
- The number of images uploaded and included
- All the Cloudinary URLs
- The banner's resolved dimensions
- A reminder that the user should:
  - Review the English title (auto-translated — update if needed)
  - Run `/tag-blog-post <folder-name>` to fill in `tags` and `categories`
  - Run `/add-to-events <folder-name>` if the post belongs in the events gallery
  - Review and adjust `alt` and `caption` for each image in both languages
  - Add any body text between the `## h2` header and the `<Gallery>` block

## Important rules

- The post is a **folder** under `web/content/blog/`, named `<YYYY-MM-DD>-<slug>`. The date in the folder name, the `urlDate` and both permalinks must all agree.
- Do **not** write into the Hugo `content/fr/` and `content/en/` trees. They are frozen — `web/content/` is the source of truth.
- Always set `authors` to `["Marc Laliberté"]` (note the accent on the e).
- Leave `tags` and `categories` as empty arrays; `/tag-blog-post` fills them.
- Use `width={"500px"}` for every `ImageModal`.
- Fill in banner alt, `alt` and `caption` with generated variations — never leave them empty.
- Image `alt` values should be descriptive and accessible. Image `caption` values should be dramatic and engaging.
- Include ALL uploaded images in the gallery, and use the FIRST one as the banner.
- Never put a straight `"`, a `{` or a `}` in any generated text.
- The post is not done until `validate:content` passes.
