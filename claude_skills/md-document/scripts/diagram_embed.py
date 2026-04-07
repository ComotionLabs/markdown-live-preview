"""
Embed Mermaid and Chart.js-style configs as static SVG/PNG for PDF/Word (WeasyPrint has no JS).

- ```mermaid fenced blocks → Kroki (https://kroki.io) → inline SVG
- ```chart fenced blocks (Chart.js JSON) → QuickChart (https://quickchart.io) → inline PNG

Set MD_DIAGRAM_FETCH=0 to skip network calls (leave fenced <pre><code> in HTML).
"""
from __future__ import annotations

import base64
import html as html_module
import json
import os
import re
import urllib.error
import urllib.request

KROKI_MERMAID = os.environ.get("KROKI_MERMAID_URL", "https://kroki.io/mermaid")
QUICKCHART = os.environ.get("QUICKCHART_URL", "https://quickchart.io/chart")

# <pre><code class="language-mermaid">...</code></pre> (Python markdown)
MERMAID_BLOCK = re.compile(
    r'<pre><code class="[^"]*\blanguage-mermaid\b[^"]*">([\s\S]*?)</code></pre>',
    re.IGNORECASE,
)
CHART_BLOCK = re.compile(
    r'<pre><code class="[^"]*\blanguage-chart\b[^"]*">([\s\S]*?)</code></pre>',
    re.IGNORECASE,
)


def _fetch_bytes(url: str, data: bytes | None = None, content_type: str | None = None) -> bytes | None:
    try:
        headers = {"User-Agent": "markdown-live-preview-md-document/1.0"}
        if content_type:
            headers["Content-Type"] = content_type
        req = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.read()
    except (urllib.error.URLError, OSError, ValueError):
        return None


def _kroki_mermaid_svg(source: str) -> str | None:
    raw = _fetch_bytes(KROKI_MERMAID, data=source.encode("utf-8"), content_type="text/plain")
    if not raw:
        return None
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return None


def _quickchart_png(config_obj: dict) -> bytes | None:
    body = json.dumps(
        {"chart": config_obj, "width": 640, "height": 400, "format": "png"},
        separators=(",", ":"),
    ).encode("utf-8")
    try:
        req = urllib.request.Request(
            QUICKCHART,
            data=body,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "markdown-live-preview-md-document/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.read()
    except (urllib.error.URLError, OSError, ValueError):
        return None


def embed_diagrams_in_html(fragment: str, fetch_online: bool | None = None) -> str:
    """
    Replace diagram code blocks with embedded images/SVG. fragment is HTML (e.g. doc body).
    """
    if fetch_online is None:
        fetch_online = os.environ.get("MD_DIAGRAM_FETCH", "1").strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )
    if not fetch_online or not fragment:
        return fragment

    def repl_mermaid(m: re.Match) -> str:
        inner = html_module.unescape(m.group(1).strip())
        if not inner:
            return m.group(0)
        svg = _kroki_mermaid_svg(inner)
        if not svg or "<svg" not in svg.lower():
            return m.group(0)
        return (
            '<figure class="md-diagram md-diagram-mermaid" data-render="kroki">'
            f'<div class="md-mermaid-svg">{svg}</div></figure>'
        )

    out = MERMAID_BLOCK.sub(repl_mermaid, fragment)

    def repl_chart(m: re.Match) -> str:
        raw = html_module.unescape(m.group(1).strip())
        if not raw:
            return m.group(0)
        try:
            cfg = json.loads(raw)
        except json.JSONDecodeError:
            return m.group(0)
        png = _quickchart_png(cfg)
        if not png:
            return m.group(0)
        b64 = base64.b64encode(png).decode("ascii")
        return (
            '<figure class="md-diagram md-diagram-chart" data-render="quickchart">'
            f'<img class="md-chart-img" src="data:image/png;base64,{b64}" alt="Chart" />'
            "</figure>"
        )

    out = CHART_BLOCK.sub(repl_chart, out)
    return out


# Appended to document/presentation HTML (skill); matches server.js intent
DIAGRAM_CSS = """
.md-diagram { margin: 1rem 0; text-align: center; }
.md-mermaid-svg, .md-mermaid-svg svg { max-width: 100%; height: auto; }
.md-mermaid-svg svg { display: inline-block; vertical-align: middle; }
.md-chart-img { max-width: 100%; height: auto; display: inline-block; vertical-align: middle; }
"""
