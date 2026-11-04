#!/usr/bin/env python3
"""Render an RST fragment (ZIP body, header block already stripped) to an HTML fragment.

stdin: rst source. stdout: HTML fragment (body content only, no <html>/<head>).
Uses docutils html5 writer with class-based syntax highlighting (no inline styles).
Section ids are moved onto the heading elements for anchor/ToC use.
"""
import re
import sys

from docutils.core import publish_parts

src = sys.stdin.read()

parts = publish_parts(
    src,
    writer_name="html5",
    settings_overrides={
        "report_level": 3,          # only level>=3 (errors) become visible system messages
        "halt_level": 5,            # never raise; keep rendering
        "syntax_highlight": "long", # pygments classes instead of inline styles
        "initial_header_level": 1,  # top-level sections -> <h1>, matching md output
        "embed_stylesheet": False,
        "file_insertion_enabled": True,
    },
)

html = parts["fragment"]

html = re.sub(
    r'<section id="([^"]+)">\s*<h(\d)([^>]*)>',
    r'<h\2\3 id="\1">',
    html,
)

sys.stdout.write(html)
