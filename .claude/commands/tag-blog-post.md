Add tags and categories to a blog post based on its content, matching existing conventions.

## Input

The argument is: $ARGUMENTS

Format: `<folder-name>` — the post's folder under `web/content/blog/`, e.g.
`2026-03-01-motherrockersvalentinesdaypart1`. A bare slug (`motherrockersvalentinesdaypart1`)
is also accepted: match it against the folder names and use the one that ends with it.

## Where tags live now

Tags and categories are on the post's **`meta.json`**, once, and serve both languages:

```
web/content/blog/<folder>/
├── meta.json   ← tags and categories live here, and only here
├── fr.mdx
└── en.mdx
```

There is no per-language copy to keep in sync any more. Editing `meta.json` is the whole job.

## Steps

### 1. Read the post

- Read `web/content/blog/<folder>/meta.json`, `fr.mdx` and `en.mdx`.
- If the folder does not exist, list the folders whose name contains the argument and stop.
- Extract the `title`, `description` and `## h2` header from both MDX files, plus every image `alt` and `caption`, and the existing `tags`/`categories` from `meta.json`.

### 2. Read the existing vocabulary

Taxonomy terms are not stored anywhere — they are derived from post membership at build time
(`web/lib/content/terms.ts`). The existing vocabulary is therefore whatever the other posts say
it is, and every term you invent creates a new taxonomy page. Enumerate it before choosing:

```powershell
$metas = Get-ChildItem web\content\blog\*\meta.json | ForEach-Object { Get-Content $_ -Raw | ConvertFrom-Json }
"=== CATEGORIES ==="
$metas | ForEach-Object { $_.categories } | Group-Object | Sort-Object Count -Descending | ForEach-Object { "{0,3}  {1}" -f $_.Count, $_.Name }
"=== TAGS ==="
$metas | ForEach-Object { $_.tags } | Group-Object | Sort-Object Count -Descending | ForEach-Object { "{0,3}  {1}" -f $_.Count, $_.Name }
```

Reuse an existing spelling whenever one fits. A near-miss (`rock music` next to `rock`,
`Quebec` next to `quebec`) splits one taxonomy page into two half-empty ones.

### 3. Assign categories

Analyze the post content (title, description, header, image alt/captions) and assign categories from the established patterns below. Pick the **best matching** pattern:

| Post type | Categories |
|---|---|
| Concert / live music | `["live", "event"]` |
| Concert with dance element | `["live", "event", "dance"]` |
| Band/group portrait (not live) | `["portrait", "groups"]` |
| Bird photography | `["bird", "wildlife"]` |
| Wildlife (non-bird) | `["wildlife"]` |
| Photo restoration / colorization | `["restoration", "colorization", "retouching"]` — add `"digitization"` if applicable |
| Portrait (corporate) | `["portrait", "corporate portrait"]` |
| Portrait (casting/creative) | `["portrait", "casting portrait"]` |
| Portrait (natural light) | `["portrait", "natural light"]` |
| Portrait (studio) | `["portrait", "studio portrait"]` |
| Portrait (general) | `["portrait"]` |
| Nature / landscape | `["nature", "tourism"]` |
| Architecture | `["architecture", "tourism"]` |
| Street photography | `["street", "low light"]` |
| Sport | `["sport"]` |
| Technical / coding | `["technical", "coding"]` |

If the post doesn't fit neatly, combine categories sensibly based on the content.

### 4. Generate tags

Tags should include a mix of the following, based on what's relevant to the post:

- **Subject name**: band name, person name, animal species, landmark (e.g., `"MotherRockers"`, `"Simon Gagnon"`, `"cedar waxwing"`)
- **Genre/style**: music genre, photography style (e.g., `"rock"`, `"metal"`, `"bnw"`, `"creative"`, `"moody"`)
- **Venue/location**: where the event or photo took place (e.g., `"Bateau de Nuit"`, `"Sonum Fest"`, `"quebec"`)
- **Mood/theme**: descriptive atmosphere tags (e.g., `"liminal"`, `"night"`, `"horror"`)
- **Historical context**: for restoration posts (e.g., `"history"`, `"family"`, `"women"`)

**Tag rules:**
- Use 3–6 tags per post.
- Keep tags lowercase or use the proper noun casing for names (e.g., `"MotherRockers"`, `"Mont-Sainte-Anne"`).
- Do NOT include camera gear tags — the user adds those manually if desired.
- Match existing tag values when possible (e.g., reuse `"rock"` not `"rock music"`).

### 5. Check the term against the slug rules before committing to it

Every term becomes a URL through `slugifyTerm` in `web/lib/permalink.ts`, and its rules are
odd enough to bite:

- **A `/` splits the term into two URL segments.** `LR/Mogrify 2` → `/tags/lr/mogrify-2/`. Only use a slash if you mean that.
- **An en-dash (`–`, U+2013) or non-breaking hyphen (U+2011) is deleted with no replacement**, merging whatever sits either side: `E 70–350mm` → `e-70350mm`. A plain `-` is kept. The three are indistinguishable in an editor, so type plain hyphens.
- **Apostrophes are deleted, not hyphenated**: `Île d'Orléans` → `île-dorléans`.
- **Accented letters are kept** in the slug, and the term page's heading is title-cased (`sonum fest` heads its page as "Sonum Fest"), so don't pre-capitalise for display.
- **Case folds together**: `Quebec` and `quebec` are one page. Pick the spelling the corpus already uses.
- **A term must never slugify to something ending in `page/<n>`** — the taxonomy routes read that as pagination and the build asserts against it.

### 6. Update `meta.json`

- Write the generated `tags` and `categories` into `web/content/blog/<folder>/meta.json`.
- Change nothing else in the file, and touch neither `fr.mdx` nor `en.mdx`.
- Keep the existing key order and the two-space indentation.

### 7. Validate

```bash
npm --prefix web run validate:content
```

### 8. Report results

Output:
- The assigned categories and tags
- Which of them already existed in the corpus and which are new (a new term means a new taxonomy page)
- A brief explanation of why these were chosen
- A reminder to review and adjust if needed (especially subject names and venue names)

## Important rules

- Tags and categories are written **once**, to `meta.json`. There is no second file to update.
- Never remove existing non-empty tags/categories without asking the user first.
- If tags/categories are already filled in (non-empty), ask the user before overwriting.
- Do NOT add camera gear tags — the user adds those manually.
- Reuse existing tag/category values from other posts whenever possible for consistency.
- Taxonomy URLs are indexed and load-bearing — see the redirect history in `netlify.toml`. Renaming an existing term across posts breaks its page; propose it, don't just do it.
