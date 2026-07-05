#!/usr/bin/env python3
"""Fix lightbox.js placement: move it from after </body> to before </body>."""

import os
import glob
import sys

ROOT = "/Users/devonzuegel/dev/devonzuegel.github.io"
SKIP = {"field-notes-miami.html"}

# The trailing suffix to remove (exact bytes from the files)
TRAILING_SUFFIXES = [
    '    <script src="lightbox.js"></script>\n  </head>\n</html>\n',
    '    <script src="lightbox.js"></script>\n  </head>\n',
]
LIGHTBOX_TAG = '<script src="lightbox.js"></script>\n'
BODY_CLOSE = '</body>'

fixed = []
skipped_already_ok = []
skipped_explicit = []
errors = []

html_files = sorted(glob.glob(os.path.join(ROOT, "*.html")))

for filepath in html_files:
    filename = os.path.basename(filepath)

    if filename in SKIP:
        skipped_explicit.append(filename)
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "lightbox.js" not in content:
        continue

    # Check if lightbox.js appears after </body>
    body_pos = content.find(BODY_CLOSE)
    lightbox_pos = content.find('<script src="lightbox.js"></script>')

    if body_pos == -1 or lightbox_pos == -1:
        errors.append(f"{filename}: could not find </body> or lightbox tag")
        continue

    if lightbox_pos < body_pos:
        # Already correctly placed before </body>
        skipped_already_ok.append(filename)
        continue

    # Broken: lightbox.js is after </body>
    # Step 1: Remove the trailing suffix (try both known variants)
    matched_suffix = None
    for suffix in TRAILING_SUFFIXES:
        if content.endswith(suffix):
            matched_suffix = suffix
            break

    if matched_suffix is None:
        errors.append(f"{filename}: unexpected trailing pattern, skipping")
        print(f"  ERROR: {filename} - end of file:")
        print(repr(content[-200:]))
        continue

    new_content = content[: -len(matched_suffix)]

    # Step 2: Insert lightbox tag before first </body>
    body_pos_new = new_content.find(BODY_CLOSE)
    if body_pos_new == -1:
        errors.append(f"{filename}: no </body> found after trimming")
        continue

    new_content = (
        new_content[:body_pos_new]
        + LIGHTBOX_TAG
        + new_content[body_pos_new:]
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    fixed.append(filename)

# Summary
print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
print(f"Fixed:              {len(fixed)} files")
print(f"Already correct:    {len(skipped_already_ok)} files")
print(f"Explicitly skipped: {len(skipped_explicit)} files")
print(f"Errors:             {len(errors)} files")

if fixed:
    print(f"\nFixed files:")
    for f in fixed:
        print(f"  + {f}")

if errors:
    print(f"\nErrors:")
    for e in errors:
        print(f"  ! {e}")

if skipped_already_ok:
    print(f"\nAlready correct (skipped):")
    for f in skipped_already_ok:
        print(f"  - {f}")
