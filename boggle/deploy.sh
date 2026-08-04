#!/bin/bash
# Usage: ./boggle/deploy.sh "commit message"
# Updates the BUILD timestamp in index.html, bumps the SW cache version, commits, and pushes.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VER=$(date -u +"%Y%m%d%H%M%S")

# Bump BUILD timestamp in index.html
sed -i '' "s|var BUILD = \"[^\"]*\";|var BUILD = \"$TS\";|" "$DIR/index.html"

# Bump SW cache version so iOS picks up the new shell
sed -i '' "s|const CACHE = \"boggle-trainer-[^\"]*\";|const CACHE = \"boggle-trainer-$VER\";|" "$DIR/sw.js"

git add "$DIR/index.html" "$DIR/sw.js"
git commit -m "${1:-boggle: deploy $TS}"
git push
echo "Deployed at $TS (cache: boggle-trainer-$VER)"
