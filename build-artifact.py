#!/usr/bin/env python3
"""
Bundle the site into ONE self-contained HTML file for publishing as an Artifact.

The artifact host supplies <!doctype>/<html>/<head>/<body>, so this emits page
content only. Every local asset becomes a data: URI, and all non-ASCII is escaped
so the file survives regardless of what charset the host declares.
"""
import base64, os, re, sys

ROOT  = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(ROOT, '.build')
OUT   = os.path.join(BUILD, 'graama-artifact.html')

MIME = {'.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png',
        '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4'}

# lighter re-encodes stand in for the originals inside the bundle
SUBS = {'assets/hero.mp4':         os.path.join(BUILD, 'hero-web.mp4'),
        'assets/location-map.mp4': os.path.join(BUILD, 'map-web.mp4')}

TITLE = 'Graama, Vedic City'


def datauri(rel):
    path = SUBS.get(rel, os.path.join(ROOT, rel))
    with open(path, 'rb') as f:
        blob = f.read()
    ext = os.path.splitext(rel)[1].lower()
    return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(blob).decode()), len(blob)


def strip_comments_nonascii(text):
    """Comments can't carry escapes, so fold their non-ASCII down to ASCII."""
    for bad, good in [('—', '-'), ('–', '-'), ('→', '->'), ('⇄', '<->'),
                      ('·', '.'), ('‘', "'"), ('’', "'"),
                      ('“', '"'), ('”', '"'), ('₹', 'INR ')]:
        text = text.replace(bad, good)
    return text


def esc_html(text):
    """Numeric entities — decoded by the HTML parser under any charset."""
    return ''.join(ch if ord(ch) < 128 else '&#%d;' % ord(ch) for ch in text)


def esc_js(text):
    """\\uXXXX — read identically under any charset."""
    return ''.join(ch if ord(ch) < 128 else '\\u%04x' % ord(ch) for ch in text)


def main():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    css  = open(os.path.join(ROOT, 'css/styles.css'), encoding='utf-8').read()
    js   = open(os.path.join(ROOT, 'js/main.js'), encoding='utf-8').read()

    raw = 0
    for rel in sorted(set(re.findall(r'assets/[A-Za-z0-9._-]+', html + css)), key=len, reverse=True):
        uri, n = datauri(rel)
        raw += n
        html = html.replace(rel, uri)
        css  = css.replace(rel, uri)

    html = re.sub(r'(css/styles\.css|js/[a-z-]+\.js)\?v=[0-9a-f]+', r'\1', html)  # strip the ?v= stamp
    fonts = re.search(r'(<link href="https://fonts\.googleapis\.com[^>]*>)', html).group(1)
    body  = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
    body  = re.sub(r'<script src="js/main\.js" defer></script>', '', body).strip()

    css = strip_comments_nonascii(css)          # CSS comments hold no escapes
    js  = esc_js(strip_comments_nonascii(js))   # JS strings become \uXXXX
    body = esc_html(body)                       # HTML body becomes &#NNNN;

    parts = [
        '<meta charset="utf-8">',               # belt, in the first 1024 bytes
        '<title>%s</title>' % TITLE,
        fonts,
        '<style>\n%s\n</style>' % css,
        body,
        '<script>\n%s\n</script>' % js,
    ]
    out = '\n'.join(parts)

    os.makedirs(BUILD, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(out)

    nonascii = sum(1 for ch in out if ord(ch) > 127)
    print('assets inlined : %.2f MB raw' % (raw / 1024 / 1024))
    print('bundle         : %.2f MB' % (len(out.encode()) / 1024 / 1024))
    print('non-ASCII left : %d  (comments only, harmless)' % nonascii)
    print('written        : %s' % OUT)


if __name__ == '__main__':
    sys.exit(main())
