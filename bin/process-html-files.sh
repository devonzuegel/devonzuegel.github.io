#!/bin/bash

cd ~/dev/devonzuegel.github.io


##################################################################################################################################
### Step 1: Check that the directory is valid ####################################################################################
##################################################################################################################################

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


##################################################################################################################################
### Step 2: Clean up the URLS in the HTML files to remove the .html extension ####################################################
##################################################################################################################################

bin/clean-urls.sh .


##################################################################################################################################
### Step 3: Add Twitter Open Graph image meta tags to the HTML files #############################################################
##################################################################################################################################

echo "📸 Adding Twitter Open Graph image meta tags to: $FILE..."

# Path to the add_twitter_image.sh script
ADD_TWITTER_IMAGE_SCRIPT="./add_twitter_image.sh"

find "$DIRECTORY" -type f -name "*.html" -exec bash bin/add-twitter-opengraph-image.sh {} \;

echo "Processed all HTML files in '$DIRECTORY' and its subdirectories."


##################################################################################################################################
### Step 4: The posts get messed up for some unknown reason and the doctype tag gets made into <meta<!DOCTYPE html> ##############
##################################################################################################################################

find . -type f -name '*.html' -exec sed -i '' 's/<meta<!DOCTYPE html>/<!DOCTYPE html>/' {} \;
