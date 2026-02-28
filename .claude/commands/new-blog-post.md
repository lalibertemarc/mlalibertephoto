Create a new bilingual blog post for this Hugo photography portfolio.

## Input

The arguments are: $ARGUMENTS

Format: `<title> | <header text>`
- **title**: The blog post title (used for filename and frontmatter `title`).
- **header text**: A descriptive heading (in French) that appears as an `## h2` at the top of the content body. Also used to generate `banner_alt`, image `alt`, and `caption` values.

Example: `ButterButtButlerLive | ButterButtButler live à la Source de la Martinière`

If no `|` separator is present, use the entire argument as both the title and header text.

## Steps

### 1. Parse the title and generate a camelCase filename

- Split $ARGUMENTS on `|` to get the title (left side, trimmed) and header text (right side, trimmed).
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

### 3. Generate alt text and captions from the header text

Using the header text from step 1, generate:
- **banner_alt**: A concise descriptive variation of the header text.
- **image alt**: For each image, a unique descriptive variation of the header text. These should be straightforward and descriptive (good for accessibility).
- **image caption**: For each image, a unique **dramatic and engaging** variation of the header text. These should be vivid, evocative, and punchy — use action verbs, sensory language, and energy. Examples of good caption style:
  - "ButterButtButler enflamme la Source de la Martinière"
  - "L'énergie brute de ButterButtButler en plein set"
  - "Sous les projecteurs, ButterButtButler donne tout"
  - "La Martinière vibre au son de ButterButtButler"

Every alt and caption must be distinct — no two should be identical.

### 4. Create the French blog post file

Create `content/fr/blog/<camelCaseFilename>.md` with this exact structure:

```
+++
title = '<title from arguments>'
date = <current datetime in ISO 8601 format with timezone offset, e.g. 2026-02-27T14:30:00-05:00>
draft = true
description = ""
tags = []
categories = []
external_banner = true
banner = "<first Cloudinary URL from step 2>"
banner_alt = "<generated banner_alt from step 3>"
banner_width = 600
banner_height = 600
authors = ["Marc Laliberté"]
+++

## <header text from arguments>

{{< fleximages >}}
{{< image-modal
    src="<cloudinary URL 1>"
    width="500px"
    alt="<generated alt 1>"
    caption="<generated caption 1>"
>}}
{{< image-modal
    src="<cloudinary URL 2>"
    width="500px"
    alt="<generated alt 2>"
    caption="<generated caption 2>"
>}}
... (one image-modal block per uploaded image) ...
{{< /fleximages >}}
```

### 5. Create the English blog post file

Create `content/en/blog/<camelCaseFilename>.md` with the identical structure as the French file. Use the same French title and header text as placeholders (the user will translate them manually).

### 6. Report results

After creating both files, output:
- The paths of both created files
- The number of images uploaded and included
- All the Cloudinary URLs
- A reminder that the user should:
  - Translate the English title and header
  - Add `description`, `tags`, `categories` to both files
  - Review and adjust `alt` and `caption` for each image in both languages
  - Add any body text between the `## h2` header and the `{{< fleximages >}}` block
  - Set `draft = false` when ready to publish

## Important rules

- Always add the header text as an `## h2` before the `{{< fleximages >}}` block.
- Always set `draft = true`.
- Always set `external_banner = true`.
- Always set `banner_width = 600` and `banner_height = 600`.
- Always set `authors = ["Marc Laliberté"]` (note the accent on the e).
- Use `width="500px"` for every `image-modal` shortcode.
- Fill in `banner_alt`, `alt`, and `caption` with generated variations — never leave them empty.
- Image `alt` values should be descriptive and accessible. Image `caption` values should be dramatic and engaging.
- Leave `description=""`, `tags=[]`, and `categories=[]` empty.
- Use TOML frontmatter delimiters (`+++`), not YAML (`---`).
- The filename must use camelCase to match existing conventions.
- Include ALL uploaded images in the gallery, and use the FIRST one as the banner.
