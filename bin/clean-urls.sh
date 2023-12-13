#!/bin/bash

# ABOUT THIS SCRIPT:
#    This script replaces all instances of `/post/` → `/` and `"post/` → `"./` in all .html files in a given directory.
#    It also removes '.html' from URLs in index.html so that the URLs people see are prettier.
#    This is useful for converting a Postachio Evernote-based site to a static site with nice URLs.
#
#    Test this script by running adding the following lines to a random .html file in this directory:
#       `/post/` → `/`
#       <br />
#       `"post/` → `"./`
#    Then run this script and check the file again. It should be converted to:
#       `/` → `/`
#       <br />
#       `"./` → `"./`
#    Also check index.html to make sure the URLs are prettier (i.e. don't have .html at the end)

##################################################################################################################################
#### PART 1: Replace /post/ → / & "post/ → "./  in all .html files ###############################################################
##################################################################################################################################

echo "Replacing /post/ → / and "post/ → "./ in all .html files..."

# Check if a directory argument is provided
if [ -z "$1" ]; then
    echo "Error: No directory provided."
    echo "Usage: $0 <directory>"
    exit 1
fi

# Directory provided by the user
directory="$1"

# Check if the provided directory exists
if [ ! -d "$directory" ]; then
    echo "Error: Directory does not exist."
    exit 1
fi

# Set LANG and LC_ALL to C for standard POSIX locale
export LANG=C
export LC_ALL=C

# Find all HTML files in the directory and apply the sed command
find "$directory" -type f -name "*.html" -exec sed -i '' 's/\/post\//\//g;s/"post\//".\//g' {} +

##################################################################################################################################
#### PART 2: Remove '.html' from URLs in index.html ##############################################################################
##################################################################################################################################

echo "Removing '.html' from URLs in index.html..."

# File to modify
index_file="index.html"

# Check if the index.html file exists
if [ ! -f "$index_file" ]; then
    echo "Error: $index_file does not exist."
    exit 1
fi

# Use sed to remove '.html' from URLs in index.html
# This targets '.html' preceded by 'href="' to avoid modifying other '.html' occurrences
sed -i '' 's/href="\([^"]*\)\.html"/href="\1"/g' "$index_file"

echo "Modifications complete!"

# Unset the variables if desired
unset LANG
unset LC_ALL
