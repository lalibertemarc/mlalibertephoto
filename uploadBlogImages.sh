#!/bin/bash
# uploadBlogImages.sh
# Resizes high-res images for web, uploads them to Cloudinary,
# and prints the resulting URLs.
#
# Prerequisites:
#   - ImageMagick (magick) installed and on PATH
#   - Cloudinary CLI (cld) installed: pip install cloudinary-cli
#   - CLOUDINARY_URL env var set: export CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
#   - jq installed for JSON parsing

SOURCE_DIR="/p/Images/blog/source"
OUTPUT_DIR="/p/Images/blog/output"
CLOUDINARY_FOLDER="blog"
MAX_WIDTH=1920
QUALITY=82

# --- Preflight checks ---

if ! command -v magick &>/dev/null; then
  echo "Error: ImageMagick (magick) is not installed or not on PATH."
  exit 1
fi

if ! command -v cld &>/dev/null; then
  echo "Error: Cloudinary CLI (cld) is not installed. Run: pip install cloudinary-cli"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  if ! command -v python &>/dev/null && ! command -v python3 &>/dev/null; then
    echo "Error: Neither jq nor python is installed. Install one of them."
    exit 1
  fi
  # Use python as jq fallback
  parse_secure_url() {
    python -c "import sys,json; d=json.load(sys.stdin); print(d.get('secure_url',''))" 2>/dev/null \
    || python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secure_url',''))" 2>/dev/null
  }
else
  parse_secure_url() {
    jq -r '.secure_url // empty'
  }
fi

if [ -z "$CLOUDINARY_URL" ]; then
  echo "Error: CLOUDINARY_URL environment variable is not set."
  echo "Set it with: export CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
  exit 1
fi

# Check source directory
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory not found: $SOURCE_DIR"
  exit 1
fi

# Create output directory if needed
mkdir -p "$OUTPUT_DIR"

# Find image files in source
shopt -s nullglob nocaseglob
images=("$SOURCE_DIR"/*.{jpg,jpeg,png,webp,tiff,tif})
shopt -u nullglob nocaseglob

if [ ${#images[@]} -eq 0 ]; then
  echo "No images found in $SOURCE_DIR"
  exit 0
fi

echo "Found ${#images[@]} image(s) in $SOURCE_DIR"
echo "Resizing to max ${MAX_WIDTH}px wide, quality ${QUALITY}%, outputting as JPEG..."
echo "-------------------------------------------"

# --- Process each image ---

for img in "${images[@]}"; do
  filename=$(basename "$img")
  name="${filename%.*}"
  output_file="$OUTPUT_DIR/${name}.jpg"

  # Step 1: Resize with ImageMagick
  echo ""
  echo "[$name] Resizing..."
  magick "$img" \
    -resize "${MAX_WIDTH}x>" \
    -strip \
    -quality "$QUALITY" \
    -sampling-factor 4:2:0 \
    -interlace JPEG \
    "$output_file"

  if [ $? -ne 0 ]; then
    echo "[$name] ERROR: ImageMagick resize failed. Skipping."
    continue
  fi

  # Show size reduction
  orig_size=$(stat --printf="%s" "$img" 2>/dev/null || stat -f "%z" "$img" 2>/dev/null)
  new_size=$(stat --printf="%s" "$output_file" 2>/dev/null || stat -f "%z" "$output_file" 2>/dev/null)
  if [ -n "$orig_size" ] && [ -n "$new_size" ]; then
    orig_kb=$((orig_size / 1024))
    new_kb=$((new_size / 1024))
    echo "[$name] Resized: ${orig_kb}KB -> ${new_kb}KB"
  fi

  # Step 2: Upload to Cloudinary
  echo "[$name] Uploading to Cloudinary (folder: $CLOUDINARY_FOLDER)..."
  response=$(cld uploader upload "$output_file" folder="$CLOUDINARY_FOLDER" 2>&1)

  if [ $? -ne 0 ]; then
    echo "[$name] ERROR: Cloudinary upload failed."
    echo "$response"
    continue
  fi

  # Step 3: Extract and display the URL
  url=$(echo "$response" | parse_secure_url)

  if [ -z "$url" ]; then
    echo "[$name] WARNING: Could not parse secure_url from response."
    echo "$response"
  else
    echo "[$name] OK: $url"
  fi
done

echo ""
echo "==========================================="
echo "Done! All processed images are in: $OUTPUT_DIR"
echo "==========================================="
