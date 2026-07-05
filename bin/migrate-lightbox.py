#!/usr/bin/env python3
"""
Replace inlined lightbox CSS and JS in all HTML pages with references to
shared lightbox.css and lightbox.js files.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The old inlined CSS block (exact text present in all non-miami pages)
OLD_CSS = """          img.full-sized-image-from-click {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            height: 100%;
            width: 100%;
            max-height: calc(100vh - 16px);
            max-width: calc(100vw - 16px);
            position: fixed;
            box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
            border-radius: 8px;
          }

          img.full-sized-image-from-click:hover {
            cursor: pointer;
          }

          .full-sized-image-from-click--wrapper {
            /* Provides the background */
            width: 100vw;
            background: white;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }

          .full-sized-image-from-click--wrapper:hover {
            cursor: pointer;
          }"""

# Replacement: a link tag (inserted via the surrounding context below)
CSS_LINK = '          <link rel="stylesheet" href="lightbox.css" />'

# The old inlined JS block
OLD_JS = """      window.onload = function () {
        function remove(me) {
          document.getElementById(me).outerHTML = ''
        }

        // Wait for the images to load
        var images = document.getElementsByTagName('img')
        for (var i = 0; i < images.length; i++) {
          var image = images[i]

          image.addEventListener(
            'click',
            function () {
              var fullSizedImg = this.cloneNode(true)
              fullSizedImg.className = 'full-sized-image-from-click'

              var wrapperWithBkgd = document.createElement('div')
              wrapperWithBkgd.className = 'full-sized-image-from-click--wrapper'
              wrapperWithBkgd.onclick = function () {
                this.parentNode.removeChild(this)
              }

              wrapperWithBkgd.appendChild(fullSizedImg)
              document.body.appendChild(wrapperWithBkgd)
            },
            false
          )
        }
      }"""

JS_SCRIPT = '      window.lightboxExternal = true'  # placeholder replaced below

def migrate_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'full-sized-image-from-click' not in content:
        return False, 'no lightbox code found'

    original = content
    changed = False

    # --- Replace CSS block ---
    if OLD_CSS in content:
        content = content.replace(OLD_CSS, CSS_LINK)
        changed = True
    elif 'lightbox.css' in content:
        pass  # already migrated
    else:
        return False, 'CSS block not matched (may be a variant)'

    # --- Replace JS block ---
    if OLD_JS in content:
        content = content.replace(
            OLD_JS,
            '      // lightbox logic moved to lightbox.js'
        )
        # Insert <script src="lightbox.js"> before </script> that closes this block
        content = content.replace(
            '      // lightbox logic moved to lightbox.js\n    </script>',
            '    </script>\n    <script src="lightbox.js"></script>'
        )
        changed = True
    elif 'lightbox.js' in content:
        pass  # already migrated
    else:
        return False, 'JS block not matched (may be a variant)'

    if changed and content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, 'migrated'

    return False, 'no changes needed'


def main():
    html_files = [
        os.path.join(ROOT, f)
        for f in os.listdir(ROOT)
        if f.endswith('.html')
    ]
    html_files.sort()

    migrated = []
    skipped = []
    failed = []

    for path in html_files:
        fname = os.path.basename(path)
        if fname == 'field-notes-miami.html':
            # Handle separately — has the new inlined code, not old
            skipped.append((fname, 'field-notes-miami (handled separately)'))
            continue

        ok, reason = migrate_file(path)
        if ok:
            migrated.append(fname)
        elif 'no lightbox' in reason or 'no changes' in reason:
            skipped.append((fname, reason))
        else:
            failed.append((fname, reason))

    print(f'\nMigrated: {len(migrated)}')
    for f in migrated:
        print(f'  ✓ {f}')

    print(f'\nSkipped: {len(skipped)}')
    for f, r in skipped:
        print(f'  - {f}: {r}')

    if failed:
        print(f'\nFailed: {len(failed)}')
        for f, r in failed:
            print(f'  ✗ {f}: {r}')
        sys.exit(1)

if __name__ == '__main__':
    main()
