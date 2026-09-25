#!/bin/bash
# Usage: ./meditate/deploy.sh "optional commit message"
# Updates BUILD_TIME in index.html, bumps the SW cache version, commits, and pushes.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VER=$(date -u +"%Y%m%d%H%M%S")

# Bump BUILD_TIME in index.html
sed -i '' "s|const BUILD_TIME = '[^']*';|const BUILD_TIME = '$TS';|" "$DIR/index.html"

# Bump SW cache version so iOS picks up the new shell
sed -i '' "s|const SHELL_CACHE = 'meditation-shell-[^']*';|const SHELL_CACHE = 'meditation-shell-$VER';|" "$DIR/sw.js"

# Stage the app and production library assets, but leave local audition files
# (for example audio/voice-comparison) out of deployments.
git add \
  "$DIR/index.html" \
  "$DIR/sw.js" \
  "$DIR/manifest.json" \
  "$DIR/favicon.svg" \
  "$DIR/apple-touch-icon.png" \
  "$DIR/README.md" \
  "$DIR/audio/unclenching" \
  "$DIR/audio/stretching" \
  "$DIR/audio/brew-walks" \
  "$DIR/deploy.sh"
git commit -m "${1:-meditate: deploy $TS}"
git push
echo "Deployed at $TS (cache: meditation-shell-$VER)"
