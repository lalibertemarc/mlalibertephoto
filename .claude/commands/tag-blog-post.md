Add tags and categories to a blog post based on its content, matching existing conventions.

## Input

The argument is: $ARGUMENTS

Format: `<filename>` — the blog post filename without `.md` extension (e.g., `motherRockersValentinesDayPart1`).

## Steps

### 1. Read both blog post files

- Read `content/fr/blog/<filename>.md` and `content/en/blog/<filename>.md`.
- If either file doesn't exist, stop and report the error.
- Extract the `title`, `description`, `## h2` header text, and any existing `tags`/`categories` from both files.

### 2. Determine the blog post type and assign categories

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

### 3. Generate tags

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

### 4. Update both files

- Replace `tags = []` (or existing tags) with the generated tags in both `content/fr/blog/<filename>.md` and `content/en/blog/<filename>.md`.
- Replace `categories = []` (or existing categories) with the generated categories in both files.
- Tags and categories should be identical in both language files.

### 5. Report results

Output:
- The assigned categories and tags
- A brief explanation of why these were chosen
- A reminder to review and adjust if needed (especially subject names and venue names)

## Important rules

- Tags and categories must be the same in both FR and EN files.
- Never remove existing non-empty tags/categories without asking the user first.
- If tags/categories are already filled in (non-empty), ask the user before overwriting.
- Do NOT add camera gear tags — the user adds those manually.
- Reuse existing tag/category values from other posts whenever possible for consistency.
