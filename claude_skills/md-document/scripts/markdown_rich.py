"""
Rich markdown blocks — same behaviour as markdown-live-preview server.js (marked pipeline).

- preprocess: :::stat, :::flow, :::columns (fenced blocks)
- postprocess: GitHub-style alert blockquotes > [!NOTE] etc.
- CSS class names and structure match the live preview for a single authoring model.
"""
from __future__ import annotations

import re
from typing import Callable

import markdown

from diagram_embed import embed_diagrams_in_html

# Keep in sync with md_to_pdf.py usage
MD_EXTENSIONS = ["tables", "fenced_code", "attr_list", "nl2br"]

CALLOUT_LABELS = {
    "note": "Note",
    "tip": "Tip",
    "warning": "Warning",
    "important": "Important",
    "caution": "Caution",
}


def escape_html(s: str) -> str:
    return (
        str(s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_root_theme_vars_css(t: dict | None) -> str:
    """:root variables for .md-rich — mirrors server.js buildRootThemeVarsCss."""
    t = t or {}
    hc = t.get("headingColor") or "#333"
    a1 = t.get("accentColor") or hc
    a2_raw = t.get("accentSecondary")
    a2 = (str(a2_raw).strip() if a2_raw else "") or a1
    a3 = t.get("accentTertiary") or hc
    body = str(t.get("bodyColor") or "").strip() or "#343a40"
    link = t.get("linkColor") or "#0066cc"
    return (
        f":root{{--theme-hc:{hc};--theme-a1:{a1};--theme-a2:{a2};--theme-a3:{a3};"
        f"--theme-body:{body};--theme-link:{link};}}"
    )


# Selectors use .md-rich (skill wraps body HTML); live preview uses #doc-content — keep rules identical per block.
RICH_ELEMENTS_CSS = """
.md-rich blockquote {
    margin: 1rem 0;
    padding: 0.75rem 1rem 0.75rem 1.15rem;
    border-left: 4px solid var(--theme-a1);
    background: #f8f9fa;
    font-size: 1.08em;
    font-style: italic;
    color: var(--theme-body);
}
.md-rich blockquote p:first-child { margin-top: 0; }
.md-rich blockquote p:last-child { margin-bottom: 0; }

.md-rich .callout {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    border-left: 4px solid;
    font-style: normal;
}
.md-rich .callout-title {
    font-weight: 700;
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.4rem;
}
.md-rich .callout-body p:first-child { margin-top: 0; }
.md-rich .callout-body p:last-child { margin-bottom: 0; }
.md-rich .callout-note { border-left-color: #0969da; background: #ddf4ff; color: #1f2328; }
.md-rich .callout-note .callout-title { color: #0969da; }
.md-rich .callout-tip { border-left-color: #1a7f37; background: #dafbe1; color: #1f2328; }
.md-rich .callout-tip .callout-title { color: #1a7f37; }
.md-rich .callout-warning { border-left-color: #9a6700; background: #fff8c5; color: #1f2328; }
.md-rich .callout-warning .callout-title { color: #9a6700; }
.md-rich .callout-important { border-left-color: #a40e26; background: #ffebe9; color: #1f2328; }
.md-rich .callout-important .callout-title { color: #a40e26; }
.md-rich .callout-caution { border-left-color: #cf222e; background: #ffebe9; color: #1f2328; }
.md-rich .callout-caution .callout-title { color: #cf222e; }

.md-rich .stat-block {
    margin: 1.25rem 0;
    padding: 1.25rem 1.5rem;
    border-radius: 8px;
    background: #fafbfc;
    border: 1px solid #e9ecef;
    font-style: normal;
}
.md-rich .stat-block > h1:first-of-type {
    font-size: 2.75rem;
    line-height: 1.05;
    margin: 0 0 0.35em;
    font-weight: 800;
    color: var(--theme-a1);
    border-bottom: none;
    padding-bottom: 0;
}
.md-rich .stat-block > h1:first-of-type + p {
    font-size: 1.05rem;
    margin: 0 0 0.85rem;
    font-weight: 500;
    color: var(--theme-body);
    opacity: 0.9;
}
.md-rich .stat-block ul {
    font-size: 0.88rem;
    margin: 0.4rem 0 0;
    padding-left: 1.25rem;
    opacity: 0.92;
}
.md-rich .stat-block li { margin: 0.2em 0; }
.md-rich .stat-block h1::before,
.md-rich .stat-block h2::before,
.md-rich .stat-block h3::before {
    content: none !important;
    counter-increment: none !important;
}

.md-rich .flow-block {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.55rem;
    margin: 1.15rem 0;
}
.md-rich .flow-item {
    display: inline-flex;
    align-items: center;
    padding: 0.4em 0.95em;
    border-radius: 999px;
    border: 2px solid var(--theme-a1);
    background: #fff;
    font-weight: 600;
    font-size: 0.95em;
    color: var(--theme-hc);
}
.md-rich .flow-arrow {
    color: var(--theme-a1);
    font-size: 1.2em;
    font-weight: 700;
    user-select: none;
}

.md-rich .columns-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin: 1.15rem 0;
    align-items: start;
}
.md-rich .columns-left,
.md-rich .columns-right { min-width: 0; }
@media (max-width: 640px) {
    .md-rich .columns-block { grid-template-columns: 1fr; }
}
@media print {
    .md-rich .callout,
    .md-rich .stat-block,
    .md-rich .flow-block,
    .md-rich .columns-block { break-inside: avoid; }
}
"""


def preprocess_custom_blocks(text: str, parse_inner: Callable[[str], str]) -> str:
    """Expand :::stat / :::flow / :::columns before markdown; inner markdown via parse_inner (recursive)."""
    if not text:
        return text
    md = text

    def repl_stat(m: re.Match) -> str:
        inner = m.group(1).strip()
        inner_html = parse_inner(inner)
        return f"\n<div class=\"stat-block\">\n{inner_html}\n</div>\n"

    md = re.sub(
        r"^:::stat\s*\n([\s\S]*?)^:::\s*$",
        repl_stat,
        md,
        flags=re.MULTILINE,
    )

    def repl_flow(m: re.Match) -> str:
        inner = m.group(1)
        line = next((ln.strip() for ln in inner.splitlines() if ln.strip()), "")
        parts = [p.strip() for p in line.split("|") if p.strip()]
        if not parts:
            return ""
        chunks = []
        for i, p in enumerate(parts):
            arrow = (
                '<span class="flow-arrow" aria-hidden="true">→</span>'
                if i < len(parts) - 1
                else ""
            )
            chunks.append(f'<span class="flow-item">{escape_html(p)}</span>{arrow}')
        return f'\n<div class="flow-block">{"".join(chunks)}</div>\n'

    md = re.sub(
        r"^:::flow\s*\n([\s\S]*?)^:::\s*$",
        repl_flow,
        md,
        flags=re.MULTILINE,
    )

    def repl_columns(m: re.Match) -> str:
        inner = m.group(1)
        bits = re.split(r"\r?\n\|\|\|\r?\n", inner)
        left = (bits[0] or "").strip()
        right = ("\n|||\n".join(bits[1:]) if len(bits) > 1 else "").strip()
        left_html = parse_inner(left)
        right_html = parse_inner(right)
        return (
            f'\n<div class="columns-block"><div class="columns-left">{left_html}'
            f'</div><div class="columns-right">{right_html}</div></div>\n'
        )

    md = re.sub(
        r"^:::columns\s*\n([\s\S]*?)^:::\s*$",
        repl_columns,
        md,
        flags=re.MULTILINE,
    )
    return md


_CALLOUT_OPEN = re.compile(
    r"^\s*<p>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(?:\n|<br\s*/?>)",
    re.IGNORECASE,
)


def postprocess_github_callouts(html: str) -> str:
    """Turn blockquotes that are GitHub alerts into .callout divs (matches marked output)."""

    def repl_bq(m: re.Match) -> str:
        inner = m.group(1)
        mo = _CALLOUT_OPEN.match(inner)
        if not mo:
            return m.group(0)
        type_key = mo.group(1).lower()
        label = CALLOUT_LABELS.get(type_key, mo.group(1))
        body = "<p>" + inner[mo.end() :]
        return (
            f'<div class="callout callout-{type_key}" role="note">'
            f'<div class="callout-title">{escape_html(label)}</div>'
            f'<div class="callout-body">{body}</div></div>'
        )

    return re.sub(
        r"<blockquote>\s*([\s\S]*?)\s*</blockquote>",
        repl_bq,
        html,
    )


def markdown_to_rich_html(text: str) -> str:
    """Full pipeline: fenced blocks → markdown → GitHub callouts."""

    def parse_inner(s: str) -> str:
        return markdown_to_rich_html(s.strip())

    raw = (text or "").strip()
    if not raw:
        return ""
    md = preprocess_custom_blocks(raw, parse_inner)
    out = markdown.markdown(md, extensions=MD_EXTENSIONS)
    out = postprocess_github_callouts(out)
    return embed_diagrams_in_html(out)
