#!/usr/bin/env python3
"""Stamp css/js links in index.html with a content hash.

GitHub Pages caches assets, so a returning visitor can otherwise get new HTML
against an old stylesheet. Run before deploying.
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).parent
html = root / 'index.html'
s = html.read_text()

def digest(rel):
    return hashlib.sha1((root / rel).read_bytes()).hexdigest()[:8]

for rel, pat in [
    ('css/styles.css',  r'(href=")css/styles\.css(?:\?v=[0-9a-f]+)?(")'),
    ('js/plan-units.js', r'(src=")js/plan-units\.js(?:\?v=[0-9a-f]+)?(")'),
    ('js/main.js',      r'(src=")js/main\.js(?:\?v=[0-9a-f]+)?(")'),
]:
    v = digest(rel)
    s = re.sub(pat, lambda m, r=rel, v=v: '%s%s?v=%s%s' % (m.group(1), r, v, m.group(2)), s)
    print('%-18s v=%s' % (rel, v))

html.write_text(s)
