Generate a photography trends report for the current month/year and save it to the `trends-reports/` directory.

## Steps

### 1. Understand the site's existing content

Before researching trends, scan the blog to understand what content already exists. Each post is
a folder under `web/content/blog/<YYYY-MM-DD>-<slug>/` holding `meta.json` (date, tags,
categories, authors, banner) plus `fr.mdx` and `en.mdx` (title and description in frontmatter).
Read a sample of the most recent folders — the folder names sort chronologically, so the tail of
the listing is the newest work.

The tags and categories already in use are the fastest read on what the site covers:

```powershell
$metas = Get-ChildItem web\content\blog\*\meta.json | ForEach-Object { Get-Content $_ -Raw | ConvertFrom-Json }
$metas | ForEach-Object { $_.categories } | Group-Object | Sort-Object Count -Descending | ForEach-Object { "{0,3}  {1}" -f $_.Count, $_.Name }
```

Also check the gallery pages under `web/content/pages/photos/` (`events`, `portraits`,
`wildlife`) and `web/content/pages/restoration/`.

The site covers these genres: **concert/event photography, wildlife/nature, portraits, photo restoration/colorization, landscapes, and street photography**. Blog posts are bilingual (FR/EN) photo galleries with short descriptions. Keep this content profile in mind when evaluating trends and generating blog ideas.

### 2. Research current photography trends

Use WebSearch to scan recent photography blogs and publications for current trends. Search for queries like:
- "photography trends [current year]"
- "photography trends [current month] [current year]"
- "photography industry predictions [current year]"
- "film photography trends [current year]"
- "AI photography [current year]"
- "wedding photography trends [current year]"
- "portrait photography trends [current year]"
- "concert photography trends [current year]"
- "wildlife photography trends [current year]"

Target sources like: PetaPixel, Fstoppers, Digital Camera World, Envato, Photo Contest Insider, DIY Photography, Analog.Cafe, Blind Magazine, SANDMARC, Pixpa, and similar photography publications.

For each promising result, use WebFetch to read the article and extract key trend information.

### 3. Identify the top 5 trends

From your research, identify the **5 most significant and well-sourced trends**. Prioritize trends that:
- Appear across multiple independent sources
- Have concrete evidence (surveys, data, market movements)
- Are relevant to a working photographer's practice and blog content
- Represent genuine shifts, not just recycled listicle filler

### 4. Write the report

Create the file `trends-reports/photography-trends-report.md` (overwriting any existing report) with this exact structure:

```markdown
# Photography Trend Report — <Month> <Year>

> Generated on <full date>. Based on a scan of recent photography blogs and publications.

## Summary

<2-3 paragraph executive summary of the overall photography landscape right now. Identify the defining themes, tensions, and movements. Write in a confident editorial voice.>

---

## 1. <Trend Name>

**What's happening:** <Detailed paragraph explaining the trend — what it is, why it's happening, where it's showing up, and how widespread it is. Include specific data points or quotes when available.>

**Blog post angle:** <1-2 sentences suggesting a concrete blog post idea that Marc could write about this trend, tied to his photography practice. Make it actionable and specific.>

**Blog opportunities for marclaliberte.photos:**

For each trend, analyze how it connects to the site's existing content and genres, then suggest **2-4 specific, actionable blog post ideas**. Each idea should include:

- **Title (FR / EN):** A bilingual title pair ready to use.
- **Type:** One of: photo gallery post, behind-the-scenes / tutorial, opinion / essay, before-and-after showcase, or gear / technique post.
- **Concept:** 2-3 sentences describing the post — what photos to include or shoot, what angle to take, what makes it compelling. Reference existing content on the site when a post could build on or complement something already published.
- **SEO keywords (FR / EN):** 3-5 target keywords per language.
- **Effort:** Low (curate existing photos + write), Medium (reshoot or edit existing photos + write), or High (plan and shoot new content).

Prioritize ideas that:
- Leverage Marc's existing photo library (concerts, wildlife, portraits, restorations, landscapes)
- Can be cross-linked to existing blog posts or gallery pages on the site
- Target search queries with clear intent (tutorials, comparisons, local photography spots)
- Would perform well on social media (visual impact, shareability, trending topics)

**Sources:**
- [<Source Name> — <Article Title>](<URL>) — <One-line summary of what this source contributes>
- ...

---

## 2. <Trend Name>
...

(repeat for all 5 trends)

---

## Honorable Mentions

- **<Trend>:** <2-3 sentences covering notable trends that didn't make the top 5 but are worth watching. Include source links inline.>
- ...

---

## Gear Buzz (if notable)

<1 paragraph covering any significant gear developments, camera releases, or equipment trends. If nothing notable, write a short paragraph about the general state of the gear conversation.>

---

## Content Calendar Summary

At the end of the report, compile a prioritized list of all blog post ideas from every trend section above, sorted by **effort level** (Low first, then Medium, then High). Format as a table:

| Priority | Title (FR) | Title (EN) | Trend | Type | Effort | Target Keywords (FR) |
|----------|-----------|------------|-------|------|--------|---------------------|
| 1 | ... | ... | ... | ... | Low | ... |
| 2 | ... | ... | ... | ... | Low | ... |
| ... | ... | ... | ... | ... | Medium | ... |

This gives Marc a ready-to-use content pipeline he can work through.

---

*Sources scanned: <comma-separated list of all publications checked>*
```

### 5. Report results

After creating the file, output:
- The path of the created file
- A brief summary of the top 5 trends identified
- The total number of blog post ideas generated
- The number of sources consulted

## Important rules

- Every trend section MUST include at least 2 sources with working URLs.
- Sources must be real articles you actually fetched and read — never fabricate URLs or article titles.
- Blog post ideas must be tailored to Marc's actual photography practice: concerts, events, wildlife, nature, portraits, photo restoration, landscapes, and street photography.
- Blog post titles should feel natural and SEO-friendly — not generic or clickbaity.
- When suggesting posts that leverage existing content, reference specific blog post folder names (e.g. `2026-03-01-motherrockersvalentinesdaypart1`) or gallery pages from the site.
- Write in a confident, editorial voice — not a bland listicle tone.
- The summary should identify tensions and contradictions in the current landscape, not just list trends.
- Overwrite the existing report file each time — this is a periodic refresh, not an archive.
- Use the current date from the system clock for the report header.
