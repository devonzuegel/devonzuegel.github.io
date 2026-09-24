#!/usr/bin/env python3
"""Install the shared appearance control on pages using the main site stylesheet."""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
updated = 0
for path in root.rglob('*.html'):
    original = path.read_text()
    stylesheet = re.search(r'<link\b[^>]*href="([^"]*postachio-style\.css)"[^>]*>', original)
    if not stylesheet:
        continue
    content = re.sub(r'\s*<script id="dark-mode-early">.*?</script>', '', original, flags=re.S)
    content = re.sub(r'\s*<script>\s*;?\(function\s*\(\)\s*\{\s*var SUN = .*?</script>', '', content, flags=re.S)
    # Load before the stylesheet, using its relative path for nested tag pages.
    source = stylesheet.group(1).replace('postachio-style.css', 'theme.js')
    if not re.search(r'<script\b[^>]*src="[^"]*theme\.js"', content):
        content = content.replace(stylesheet.group(0), f'<script src="{source}"></script>\n        ' + stylesheet.group(0), 1)
    if content != original:
        path.write_text(content)
        updated += 1
print(f'Updated theme controls on {updated} pages.')
