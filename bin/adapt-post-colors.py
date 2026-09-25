#!/usr/bin/env python3
"""Give imported light post surfaces and neutral ink theme-aware fallbacks."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


def rgb(value):
    value = value.strip().lower()
    if value in {'white', 'black', 'gray', 'grey'}:
        return {'white': (255, 255, 255), 'black': (0, 0, 0), 'gray': (128, 128, 128), 'grey': (128, 128, 128)}[value]
    if re.fullmatch(r'#[0-9a-f]{3}(?:[0-9a-f]{3})?', value):
        digits = value[1:]
        if len(digits) == 3:
            digits = ''.join(c * 2 for c in digits)
        return tuple(int(digits[i:i+2], 16) for i in (0, 2, 4))
    match = re.fullmatch(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', value)
    return tuple(map(int, match.groups())) if match else None


def adapt_style(style):
    def replace(match):
        prefix, prop, value, important = match.groups()
        important = important or ''
        channels = rgb(value)
        if not channels:
            return match.group(0)
        low, high = min(channels), max(channels)
        token = None
        if prop.lower() in {'background', 'background-color'} and low >= 150:
            token = '--post-inline-highlight' if high - low > 30 else '--post-inline-surface'
        elif prop.lower() == 'color' and high - low <= 35:
            token = '--post-inline-ink'
        if not token:
            return match.group(0)
        return f'{prefix}{prop}: var({token}, {value.strip()}){important}'
    return re.sub(r'(^|;\s*)(background(?:-color)?|color)\s*:\s*([^;!]+)(\s*!important)?',
                  replace, style, flags=re.I)


class PostColors(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.stack = []
        self.edits = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        inside = any(entry[1] for entry in self.stack) or 'post-content' in attrs.get('class', '').split()
        if inside and 'style' in attrs and tag not in {'img', 'iframe', 'svg', 'canvas'}:
            raw = self.get_starttag_text()
            def rewrite(match):
                return match.group(1) + match.group(2) + adapt_style(match.group(3)) + match.group(2)
            new = re.sub(r'(\bstyle\s*=\s*)([\"\'])(.*?)\2', rewrite, raw, flags=re.S | re.I)
            if new != raw:
                line, col = self.getpos()
                start = self.offsets[line - 1] + col
                self.edits.append((start, start + len(raw), new))
        if tag not in VOID:
            self.stack.append((tag, inside))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)


def adapt(source):
    parser = PostColors(source)
    parser.feed(source)
    for start, end, replacement in reversed(parser.edits):
        source = source[:start] + replacement + source[end:]
    return source


if __name__ == '__main__':
    count = 0
    for path in Path(sys.argv[1] if len(sys.argv) > 1 else '.').rglob('*.html'):
        source = path.read_text()
        if 'postachio-style.css' not in source:
            continue
        updated = adapt(source)
        if source != updated:
            path.write_text(updated)
            count += 1
    print(f'Adapted inline post colors on {count} pages.')
