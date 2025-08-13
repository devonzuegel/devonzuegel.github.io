from bs4 import BeautifulSoup
import os
import glob

output = ""

# Find all HTML files in the current directory.
for html_file in glob.glob("*.html"):
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
        text = soup.get_text() # Parse the HTML and strip out all HTML tags.
        output += f"=== {html_file} ===\n{text}\n\n"

# Create a consolidated file containing all the extracted text content from every HTML,
# separated by filename headers like `=== filename.html ===`.
with open("all_posts.txt", "w", encoding='utf-8') as f:
    f.write(output)