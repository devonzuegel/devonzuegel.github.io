#!/bin/bash

# ABOUT THIS SCRIPT:
#   This script adds a Twitter Open Graph image meta tag to HTML files that have an existing Open Graph image meta tag
#   Usage: ./script.sh <directory>

# Check if a file path is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_html_file>"
    exit 1
fi

FILE="$1"

# Check if the file exists
if [ ! -f "$FILE" ]; then
    echo "Error: File '$FILE' does not exist."
    exit 1
fi

# Process the file to add twitter:image tag if og:image is present
# and only rewrite the file if a change was made
awk '
    BEGIN { RS="</?meta"; FS=">"; OFS=">"; printContent=1 }
    /property="og:image"/ {
        print "<meta" $0
        sub(/property="og:image"/, "property=\"twitter:image\"")
        print "<meta" $0
        printContent=0
        changed=1
    }
    { if(printContent) print "<meta" $0; printContent=1 }
    END { exit !changed }
' "$FILE" > tmp_file

# Check if awk indicated a change was made
if [ $? -eq 0 ]; then
    # Use tail to remove the last unwanted "<meta" introduced by awk
    mv tmp_file "$FILE.tmp" && tail -r "$FILE.tmp" | tail +2 | tail -r > "$FILE"
    rm "$FILE.tmp"
else
    rm tmp_file
fi

echo "Processed '$FILE'"
