Create a new bilingual blog post for this Hugo photography portfolio.

## Input

The arguments are: $ARGUMENTS

Format: `<title> | <header text FR> | <header text EN>`
- **title**: The blog post title (used for filename and frontmatter `title`).
- **header text FR**: A descriptive heading in French that appears as the `## h2` in the French post. Also used to generate French `banner_alt`, `description`, image `alt`, and `caption` values.
- **header text EN**: A descriptive heading in English that appears as the `## h2` in the English post. Also used to generate English `banner_alt`, `description`, image `alt`, and `caption` values.

Example: `ButterButtButlerLive | ButterButtButler live à la Source de la Martinière | ButterButtButler live at the Source de la Martinière`

If only one `|` separator is present, the left side is the title and the right side is the French header text — translate it to English for the English header text.
If no `|` separator is present, use the entire argument as both the title and French header text, and translate it to English.

## Steps

### 1. Parse the title and generate a camelCase filename

- Split $ARGUMENTS on `|` to get the title (first part, trimmed), French header text (second part, trimmed), and English header text (third part, trimmed).
- Use the title as the French title in frontmatter.
- Generate a camelCase filename from the title: remove accents/diacritics, remove special characters (apostrophes, punctuation), convert to camelCase. For example:
  - "Mon nouveau post de photos" → `monNouveauPostDePhotos`
  - "L'été à Québec" → `lEteAQuebec`
  - "Hommage à Krista" → `hommageAKrista`
- This matches the existing naming convention in `content/fr/blog/` (e.g., `bateauDeNuitMotherRockers.md`, `cedarWaxwing2.md`, `jardinBotaniqueRogerVandenHende.md`).

### 2. Upload images via uploadBlogImages.sh

- Run `./uploadBlogImages.sh` from the project root directory.
- This script reads images from `P:\Images\blog\source`, resizes them for web, outputs them to `P:\Images\blog\output`, uploads to Cloudinary, and prints URLs.
- Capture the full output. Parse all Cloudinary URLs from lines matching the pattern `[imagename] OK: https://res.cloudinary.com/...`. Extract only the URLs.
- If the script fails or returns no URLs, stop and report the error to the user.
- Print all captured URLs to the console so the user can see them.

### 3. Generate descriptions, alt text, and captions in both languages

Using the French header text and English header text from step 1, generate **separate French and English versions** of all text fields:

**French (for the FR blog post):**
- **description (FR)**: A concise French summary sentence derived from the French header text, suitable for SEO/meta description.
- **banner_alt (FR)**: A concise descriptive variation of the French header text.
- **image alt (FR)**: For each image, a unique descriptive variation of the French header text. Straightforward and descriptive (good for accessibility).
- **image caption (FR)**: For each image, a unique **dramatic and engaging** variation of the French header text. Vivid, evocative, and punchy — use action verbs, sensory language, and energy. Examples:
  - "ButterButtButler enflamme la Source de la Martinière"
  - "L'énergie brute de ButterButtButler en plein set"
  - "Sous les projecteurs, ButterButtButler donne tout"

**English (for the EN blog post):**
- **description (EN)**: A concise English summary sentence derived from the English header text, suitable for SEO/meta description.
- **banner_alt (EN)**: A concise descriptive variation of the English header text.
- **image alt (EN)**: For each image, a unique descriptive variation of the English header text. Straightforward and descriptive (good for accessibility).
- **image caption (EN)**: For each image, a unique **dramatic and engaging** variation of the English header text. Vivid, evocative, and punchy — use action verbs, sensory language, and energy. Examples:
  - "ButterButtButler sets the Source de la Martinière ablaze"
  - "The raw energy of ButterButtButler mid-set"
  - "Under the spotlights, ButterButtButler gives it all"

Every alt and caption must be distinct — no two should be identical, within each language or across languages.

### 4. Create the French blog post file

Create `content/fr/blog/<camelCaseFilename>.md` with this exact structure, using all **French (FR)** generated text from step 3:

```
+++
title = '<title from arguments>'
date = <current LOCAL datetime from the system clock in ISO 8601 format with timezone offset — run `date +%Y-%m-%dT%H:%M:%S%:z` to get it>
draft = false
description = "<generated description (FR)>"
tags = []
categories = []
external_banner = true
banner = "<first Cloudinary URL from step 2>"
banner_alt = "<generated banner_alt (FR)>"
banner_width = 600
banner_height = 600
authors = ["Marc Laliberté"]
+++

## <French header text from arguments>

{{< gallery >}}
{{< image-modal
    src="<cloudinary URL 1>"
    width="500px"
    alt="<generated alt (FR) 1>"
    caption="<generated caption (FR) 1>"
>}}
{{< image-modal
    src="<cloudinary URL 2>"
    width="500px"
    alt="<generated alt (FR) 2>"
    caption="<generated caption (FR) 2>"
>}}
... (one image-modal block per uploaded image) ...
{{< /gallery >}}
```

### 5. Create the English blog post file

Create `content/en/blog/<camelCaseFilename>.md` with the same structure as the French file, but use all **English (EN)** generated text from step 3:
- `description` → description (EN)
- `banner_alt` → banner_alt (EN)
- `## h2` header → English header text from arguments
- Each image `alt` → alt (EN)
- Each image `caption` → caption (EN)

The `title`, `date`, `banner`, `tags`, `categories`, and other frontmatter fields remain the same as the French file.

### 6. Report results

After creating both files, output:
- The paths of both created files
- The number of images uploaded and included
- All the Cloudinary URLs
- A reminder that the user should:
  - Review the English title (update if needed)
  - Add `tags`, `categories` to both files
  - Review and adjust `alt` and `caption` for each image in both languages
  - Add any body text between the `## h2` header and the `{{< gallery >}}` block

## Important rules

- Always add the header text as an `## h2` before the `{{< gallery >}}` block.
- Always set `draft = false`.
- Always set `external_banner = true`.
- Always set `banner_width = 600` and `banner_height = 600`.
- Always set `authors = ["Marc Laliberté"]` (note the accent on the e).
- Use `width="500px"` for every `image-modal` shortcode.
- Fill in `banner_alt`, `alt`, and `caption` with generated variations — never leave them empty.
- Image `alt` values should be descriptive and accessible. Image `caption` values should be dramatic and engaging.
- Leave `tags=[]` and `categories=[]` empty.
- Use TOML frontmatter delimiters (`+++`), not YAML (`---`).
- The filename must use camelCase to match existing conventions.
- Include ALL uploaded images in the gallery, and use the FIRST one as the banner.
