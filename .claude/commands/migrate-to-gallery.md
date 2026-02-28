Migrate a blog post from the `fleximages` shortcode to the `gallery` shortcode.

## Input

The argument is: $ARGUMENTS

Format: `<post-filename>` (without `.md` extension)

Example: `mayagreenset`

## Steps

### 1. Locate the blog post files

Find both language versions:
- `content/fr/blog/<post-filename>.md`
- `content/en/blog/<post-filename>.md`

If either file does not exist, report which file(s) are missing and stop.

### 2. Check for fleximages usage

Read both files and verify they contain `{{< fleximages >}}` and `{{< /fleximages >}}`. If a file does not use the fleximages shortcode, skip it and inform the user.

### 3. Replace the shortcode

In each file that uses fleximages:
- Replace `{{< fleximages >}}` with `{{< gallery >}}`
- Replace `{{< /fleximages >}}` with `{{< /gallery >}}`

Do not modify anything else in the files — leave all `image-modal` shortcodes, frontmatter, and body text unchanged.

### 4. Report results

Output:
- Which files were updated
- Which files were skipped (if any)
