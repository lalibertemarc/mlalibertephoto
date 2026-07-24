# Bilingual Content Audit

How the FR/EN content tree is swept for fields carrying the *other* language's text, what
the sweep found, and — just as important — the register of values that look wrong to an
automated check but are correct and must not be "fixed". Board item #13.

## Why an identity check is not enough

The cheap signal is byte-identity: pair every `content/fr/**/*.md` with its `content/en/`
twin by relative path and flag fields whose values match exactly, since a genuinely
translated string almost never does. That is how `alanTuringRestored.md` was originally
spotted.

It is also insufficient in both directions:

- **It over-reports.** 26 of the identical values were proper nouns, brand names, or words
  spelled the same in both languages. Only 3 were real.
- **It under-reports.** A field can be in the wrong language *without* matching its twin.
  `hauntedmanor.md`'s English body is untranslated French, but the FR and EN files are not
  byte-identical (the frontmatter `description` *was* translated), so identity never fires.

So the sweep runs four passes, and the last three score text for French vs English marker
words rather than comparing it to anything:

| Pass | Scope | Real finds |
|---|---|---|
| 1. Identity | `title`, `description`, `meta_title`, `keywords` across 85 pairs | 3 |
| 2. Frontmatter language | same four fields, scored per language | 0 new |
| 3. Shortcode attributes | `alt`, `caption`, `title`, `text` inside `{{< … >}}` | 4 |
| 4. Body prose | paragraphs, with fences/shortcodes/HTML stripped | 1 |

**Pass 3 is the one that earns its keep.** The item's brief stated that a French-marker
sweep of every English body had already found nothing, and pass 4 largely confirms that.
But shortcode attributes are user-visible text that a *paragraph*-level sweep skips
entirely, because `{{< image-modal … >}}` is not prose. Two posts had their `alt` and
`caption` values **swapped wholesale** between the language files.

The scripts are throwaway; they live in the session scratchpad, not the repo. The method,
not the code, is the artifact — rerun it by re-deriving the four passes above.

## Which fields are translatable

Only `title`, `description`, `meta_title` and `keywords`. Everything else in the
frontmatter — `date`, `tags`, `categories`, `banner`, `banner_width`, `authors`, `draft`,
`page_class`, `noindex` — is shared by design and identical on purpose. Flagging those
produces pure noise.

`banner_alt` is *not* on the translatable list above but is in practice translated
(`"Moineau caché dans les buissons"` / `"Song sparrow hidden in the bushes"`). It happens
to be correct throughout, so the sweep never needed to cover it — but a future audit
should include it.

## What was wrong (all fixed)

| File(s) | Field | Defect |
|---|---|---|
| `fr/blog/alanTuringRestored.md` | `description`, `keywords` | English text in the French post |
| `en/photos.md` | link label | `[Évènements]` where `[Events]` belongs |
| `blog/hiddenSparrow.md` **both** | `alt`, `caption` | Exactly swapped between FR and EN |
| `blog/sunset2.md` **both** | `caption` | Exactly swapped between FR and EN |
| `en/blog/jardinBotaniqueRogerVandenHende.md` | 3 × `caption` | Left in French; the 1st caption in the same file was already translated and supplied the wording |
| `en/blog/hauntedmanor.md` | body | Entire body paragraph still French |
| `fr/blog/krista.md` | `keywords` | `"Live in Quebec City"`, `"vocalist"` |
| `fr/blog/LRMogrifyManualFix.md` | `keywords` | `"coding"`, `"workaround"` |
| `fr/videos.md` | `title` | `'Videos'` → `'Vidéos'` |

### The keywords convention

Only 5 posts carry `keywords` at all. Two of them (`canadaGoose`,
`imagemagickScriptsRelease`) establish the rule the other three now follow: **translate the
descriptive terms, keep product names and search-term variants in English.**
`imagemagickScriptsRelease` is the model — `watermark`→`filigrane`, `wallpaper`→`fond
d'écran`, while `ImageMagick`, `LR/Mogrify 2`, `Magick.NET` and the lowercase
`lr/mogrify` search variants stay put. `"hack"` was left as-is: it is current French tech
usage.

## False-positive register

These trip an automated check and are **correct**. Do not change them.

**Brand and proper nouns, identical in both files by design**
`Prohibition5` · `chevyMaster` · `ebjmDanse` · `kitesurf` · `Mont-Sainte-Anne` ·
`pigeons` · `savkaDesign` · `That IT Lawyer` · `Butterbuttbutler` ·
`Manoir Montmorency` (the FR title of `hauntedmanor.md` — the *body* was wrong, the title
never was) · `Krista Shipperbottom` · `Lutharo` · `Maya Therienne Peña` ·
`The Mother Rockers` · `Sleeping Mexican Studio`

**Words spelled the same in French and English**
`Photos` · `Portraits` · `Portfolio` · `metal`

**French proper nouns correctly embedded in English text**
`la Source de la Martinière` (venue) · `Ste-Pétronille` · `Parc de la Chute` ·
`Marc Laliberté`. These make an English string score as French because of the accents and
the French articles inside the name. `butterButtButlerLive.md` alone accounts for nine
such hits.

**English words that are also French**
`portrait`, `nature`, `restauration`-adjacent vocabulary. `'Toad portrait'` scores as
French purely on `portrait`.

**Not prose at all**
The `gtag_report_conversion` script in `contact.md`; the Lua stack trace quoted as a
caption in `LRMogrifyManualFix.md`.

## Typos found alongside (fixed)

Not translation defects, but caught by the same sweep and corrected in the same pass:

- `Portolio` → `Portfolio` in `photos/portraits.md` and `photos/events.md`, **both
  languages** (`photos/wildlife.md` already spelled it correctly).
- `Digitization old photostos` → `old photos` in `en/restoration.md`'s `meta_title`.
- `ButtButtButler` → `ButterButtButler` in `butterButtButlerLive.md`, both languages.

## Verification after any content edit

Two checks, both required:

```bash
hugo list all                    # permalinks must be unchanged
cd web && npm run migrate:content
```

Extract the permalink column with a URL regex, **not** by CSV field index — titles are the
third column and several contain `|` and commas, which shifts `$NF` onto the `section`
column and makes the diff silently compare the wrong thing. Also note the first line of
`hugo list all` output is currently a `:filename` deprecation warning, not the CSV header.

For this item: 170 URLs before, 170 after, byte-identical. The five title changes move rows
in the output because `hugo list all` sorts by title — that is presentation, not drift.

`migrate:content` reports 7 warnings (2 date-divergence, 1 locale-divergence, 4
missing-banner). All are the pre-existing quirks catalogued in
[`content-migration.md`](content-migration.md); a clean run is not a silent run.
