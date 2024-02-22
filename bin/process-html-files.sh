#!/bin/bash

cd ~/dev/devonzuegel.github.io

# Check if a directory path is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_directory>"
    exit 1
fi

DIRECTORY="$1"

# Check if the directory exists
if [ ! -d "$DIRECTORY" ]; then
    echo "Error: Directory '$DIRECTORY' does not exist."
    exit 1
fi

#############################################################################

bin/clean-urls.sh .

#############################################################################

echo "📸 Adding Twitter Open Graph image meta tags to: $FILE..."

# Path to the add_twitter_image.sh script
ADD_TWITTER_IMAGE_SCRIPT="./add_twitter_image.sh"

find "$DIRECTORY" -type f -name "*.html" -exec bash bin/add-twitter-opengraph-image.sh {} \;

echo "Processed all HTML files in '$DIRECTORY' and its subdirectories."
