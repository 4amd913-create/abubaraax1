#!/usr/bin/env python3
"""Dependency-free checks for FAR3ON VPS static site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    'index.html', 'request.html', 'privacy.html', 'terms.html', '404.html',
    '500.html', 'admin-disabled.html', '_headers', '_redirects', 'robots.txt',
    'assets/site.css', 'assets/app.js', 'assets/config.js', 'assets/favicon.svg'
]
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.paths = []; self.ids = set(); self.fragments = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'): self.ids.add(attrs['id'])
        if attrs.get('href', '').startswith('#') and len(attrs.get('href', '')) > 1:
            self.fragments.append(attrs['href'][1:])
        for key in ('href', 'src'):
            value = attrs.get(key, '')
            if value: self.paths.append(value)

def fail(msg):
    print('ERROR:', msg); return False

ok = True
for item in REQUIRED:
    if not (ROOT/item).is_file(): ok = fail(f'Missing required file: {item}') and ok

for html in ROOT.glob('*.html'):
    parser = Links(); parser.feed(html.read_text(encoding='utf-8'))
    for fragment in parser.fragments:
        if unquote(fragment) not in parser.ids:
            ok = fail(f'{html.name}: broken in-page anchor #{fragment}') and ok
    for raw in parser.paths:
        u = urlsplit(raw)
        if u.scheme or u.netloc or raw.startswith(('#', 'data:')): continue
        path = u.path
        if not path: continue
        target = (ROOT/path.lstrip('/')) if path.startswith('/') else (html.parent/path)
        if target.is_dir(): target = target/'index.html'
        if not target.exists(): ok = fail(f'{html.name}: broken local reference {raw}') and ok

headers = (ROOT/'_headers').read_text(encoding='utf-8')
if "Content-Security-Policy:" not in headers: ok = fail('Missing Content-Security-Policy') and ok
if "unsafe-inline" in headers: ok = fail('CSP contains unsafe-inline') and ok
if 'X-Content-Type-Options: nosniff' not in headers: ok = fail('Missing nosniff header') and ok
if 'frame-ancestors \'none\'' not in headers: ok = fail('CSP must block framing') and ok

redirects = (ROOT/'_redirects').read_text(encoding='utf-8').splitlines()
for line in redirects:
    line = line.strip()
    if not line or line.startswith('#'): continue
    if len(line.split()) not in (2, 3): ok = fail(f'Invalid _redirects line: {line}') and ok

if ok:
    print('PASS: required files, local references, CSP, and redirect syntax look valid.')
    sys.exit(0)
sys.exit(1)
