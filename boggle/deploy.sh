#!/bin/bash
# Usage: ./boggle/deploy.sh "commit message"
# Updates the BUILD timestamp in index.html, commits, and pushes.
set -e
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s|var BUILD = \"[^\"]*\";|var BUILD = \"$TS\";|" "$(dirname "$0")/index.html"
git add "$(dirname "$0")/index.html"
git commit -m "${1:-boggle: update build timestamp}"
git push
echo "Deployed at $TS"
