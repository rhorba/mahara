#!/bin/bash
# Merge all Playwright test videos into a single recording
# Usage: bash merge-videos.sh

set -e

FFMPEG="/c/Users/moham/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg"
TEST_RESULTS_DIR="$(dirname "$0")/test-results"
OUTPUT="$(dirname "$0")/mahara-e2e-full-recording.mp4"
CONCAT_LIST="$(dirname "$0")/concat-list.txt"

echo "📹 Collecting video files..."

# Collect all videos sorted by test order (directory name contains test number)
find "$TEST_RESULTS_DIR" -name "video.webm" | sort > /tmp/video-files.txt

count=$(wc -l < /tmp/video-files.txt)
echo "Found $count video files"

# Create concat list for ffmpeg
> "$CONCAT_LIST"
while IFS= read -r f; do
  echo "file '$f'" >> "$CONCAT_LIST"
done < /tmp/video-files.txt

echo "🔗 Merging videos with ffmpeg..."
"$FFMPEG" -y -f concat -safe 0 -i "$CONCAT_LIST" \
  -c:v libx264 -crf 23 -preset fast \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" \
  "$OUTPUT" 2>&1

echo ""
echo "✅ Done! Merged video saved to:"
echo "   $OUTPUT"
echo ""
du -sh "$OUTPUT"
