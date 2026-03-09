#!/usr/bin/env python3
"""
md_to_pdf.py - Convert ComotionLabs markdown to branded PDF, Word (HTML), or .docx.
Supports two modes via frontmatter:
  mode: document      (default) - multi-page report layout
  mode: presentation             - full-bleed 16:9 slide deck

Output formats (--format):
  pdf   - WeasyPrint PDF (default)
  word  - Word-openable HTML (theme-driven; Word native header numbering)
  docx  - Native .docx via pandoc (requires pandoc on PATH)

Usage:
  python3 md_to_pdf.py input.md [output.pdf|output.html|output.docx] --format pdf|word|docx --themes-dir /path/to/themes
"""
import sys, re, os, json, base64, argparse, subprocess, shutil, tempfile

try:
    import markdown
except ImportError:
    os.system(sys.executable + " -m pip install --user markdown -q")
    import markdown

try:
    import weasyprint
except ImportError:
    os.system(sys.executable + " -m pip install --user weasyprint -q")
    import weasyprint

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

FALLBACK_SENS = {
    "public":       {"bg": "#27AE60", "fg": "#FFFFFF"},
    "internal":     {"bg": "#2980B9", "fg": "#FFFFFF"},
    "confidential": {"bg": "#E67E22", "fg": "#FFFFFF"},
    "secret":       {"bg": "#C0392B", "fg": "#FFFFFF"},
    "restricted":   {"bg": "#C0392B", "fg": "#FFFFFF"},
}

MIME_MAP = {
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".webp": "image/webp",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def themes_dir(override=None):
    if override:
        return override
    return os.path.join(SCRIPT_DIR, "..", "themes")

def load_theme(name, td=None):
    path = os.path.join(themes_dir(td), name, "theme.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {
        "companyName": name,
        "fontFamily": "Arial, sans-serif",
        "bodyColor": "#1A3B66", "headingColor": "#1A3B66",
        "titleFontSize": "36px", "h1FontSize": "20px",
        "h2FontSize": "18px", "h3FontSize": "16px",
        "bodyFontSize": "14px", "lineHeight": "1.7"
    }

def asset_b64(path):
    if not path or not os.path.exists(path):
        return None
    data = base64.b64encode(open(path, "rb").read()).decode()
    ext  = os.path.splitext(path)[1].lower()
    mime = MIME_MAP.get(ext, "application/octet-stream")
    return f"data:{mime};base64,{data}"

def find_logo(name, prefer_white=False, td=None, theme=None):
    assets = os.path.join(themes_dir(td), name, "assets")
    if not os.path.isdir(assets):
        return None
    files = sorted(os.listdir(assets))
    # prefer white variant when on dark background (e.g. presentations)
    if prefer_white:
        for f in files:
            if "white" in f.lower() and os.path.splitext(f)[1].lower() in MIME_MAP:
                return asset_b64(os.path.join(assets, f))
    # document mode: prefer theme's logoSrc (colour/normal logo) if it exists
    if theme and not prefer_white:
        logoSrc = theme.get("logoSrc", "")
        if logoSrc:
            basename = os.path.basename(logoSrc)
            path = os.path.join(assets, basename)
            if os.path.isfile(path):
                return asset_b64(path)
    # prefer non-white logo for light backgrounds, then any logo
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext == ".svg" and "white" not in f.lower():
            return asset_b64(os.path.join(assets, f))
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext == ".svg":
            return asset_b64(os.path.join(assets, f))
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext in MIME_MAP:
            return asset_b64(os.path.join(assets, f))
    return None

def find_backgrounds(name, td=None):
    """Return list of base64 URIs for PNG/JPG background images."""
    assets = os.path.join(themes_dir(td), name, "assets")
    if not os.path.isdir(assets):
        return []
    imgs = sorted([
        f for f in os.listdir(assets)
        if os.path.splitext(f)[1].lower() in (".png", ".jpg", ".jpeg", ".webp")
    ])
    return [asset_b64(os.path.join(assets, f)) for f in imgs]

def pandoc_available():
    """Return True if pandoc is on PATH (for --format docx)."""
    return shutil.which("pandoc") is not None

def sens_colors(theme, sensitivity):
    levels = theme.get("sensitivityLevels", {})
    key = sensitivity.capitalize()
    if key in levels:
        return levels[key].get("bg", "#888"), levels[key].get("fg", "#fff")
    fb = FALLBACK_SENS.get(sensitivity.lower(), {"bg": "#888", "fg": "#fff"})
    return fb["bg"], fb["fg"]

def parse_frontmatter(text):
    meta = {"theme": "comotion", "sensitivity": "internal", "mode": "document"}
    content = text.strip()
    if content.startswith("---"):
        end = content.find("\n---", 3)
        if end != -1:
            fm = content[3:end]
            content = content[end + 4:].lstrip("\n")
            for line in fm.split("\n"):
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip().lower()] = v.strip().strip('"').strip("'")
            return meta, content
    return meta, content

def extract_title(md):
    lines, title, rest, found = md.strip().split("\n"), "Untitled", [], False
    for line in lines:
        if not found and line.startswith("# "):
            title = line[2:].strip(); found = True
        else:
            rest.append(line)
    return title, "\n".join(rest)

def strip_escapes(text):
    lines, result, in_code = text.split("\n"), [], False
    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            result.append(line)
        elif in_code:
            result.append(line)
        else:
            result.append(re.sub(r'\\([~*_#>\|!\-\[\]`{}()+.])', r'\1', line))
    return "\n".join(result)

# ── DOCUMENT MODE ─────────────────────────────────────────────────────────────

def build_document_html(title, body_html, theme_name, sensitivity, td=None, word_friendly=False):
    """Build document HTML. If word_friendly=True, omit @page/running headers and heading
    counters so Word can apply its native header numbering (theme defines headingNumbering)."""
    t   = load_theme(theme_name, td)
    logo_uri = find_logo(theme_name, prefer_white=False, td=td, theme=t)
    sbg, sfg = sens_colors(t, sensitivity)
    slbl    = sensitivity.upper()
    company = t.get("companyName", "")
    font    = t.get("fontFamily", "Arial, sans-serif")
    hf_font = t.get("headerFooterFontFamily", font)
    gfonts  = t.get("googleFontsUrl", "")
    bc      = t.get("bodyColor", "#333")
    hc      = t.get("headingColor", bc)
    lc      = t.get("linkColor", bc)
    hfc     = t.get("headerFooterColor", bc)
    hfs     = t.get("headerFooterFontSize", "0.9em")
    ts      = t.get("titleFontSize", "32px")
    h1s     = t.get("h1FontSize", "20px")
    h1w     = t.get("h1FontWeight", "700")
    h2s     = t.get("h2FontSize", "18px")
    h2w     = t.get("h2FontWeight", "500")
    h3s     = t.get("h3FontSize", "16px")
    h3w     = t.get("h3FontWeight", "500")
    bfs     = t.get("bodyFontSize", "14px")
    lh      = t.get("lineHeight", "1.7")
    mg      = t.get("printMargins", {"top":"22mm","right":"18mm","bottom":"22mm","left":"18mm"})
    flbl    = t.get("printFooterLabel", "Page")
    bpad    = t.get("printContentBottomPadding", "18mm")
    tws     = t.get("tableWordStyling", {})
    tb      = tws.get("borderColor", "#B4B4B4")
    thb     = tws.get("headerBg", "#F0F0F0")
    thfg    = tws.get("headerFg", hc)
    thw     = tws.get("headerTextWeight", "700")
    tband   = tws.get("bandEvenBg", "#FAFAFA")
    accent1 = t.get("accentColor", "")
    accent2 = t.get("accentSecondary", "")
    accent3 = t.get("accentTertiary", "")
    cover_style = t.get("coverStyle", "")

    if cover_style == "gradient" and accent2:
        grad = f"linear-gradient(90deg,{hc},{accent2},{accent3})"
        cover_border  = f"border-bottom:4px solid {accent2};border-image:{grad} 1"
        title_rule    = f"background:{grad};height:3px;border-radius:2px"
        h1_border     = f"border-bottom:2px solid {accent2}"
        h2_extra      = f";border-left:3px solid {accent1 or hc};padding-left:10px"
        h3_extra      = f";border-left:2px solid {accent3 or hc};padding-left:8px"
        bq_col        = accent2
        pre_col       = accent2
        hnum_col      = accent2
    else:
        cover_border  = f"border-bottom:3px solid {hc}"
        title_rule    = f"background:{hc};height:2px;opacity:.25"
        h1_border     = f"border-bottom:1.5px solid {hc}"
        h2_extra = h3_extra = ""
        bq_col = pre_col = hnum_col = hc

    logo_html  = f'<img src="{logo_uri}" alt="{t.get("logoAlt","")}" style="max-height:40px;max-width:260px;display:block;margin-bottom:8px;">' if logo_uri else ""
    gfonts_tag = f'<link rel="stylesheet" href="{gfonts}">' if gfonts else ""
    mt, mr, mb, ml = mg.get("top","22mm"), mg.get("right","18mm"), mg.get("bottom","22mm"), mg.get("left","18mm")

    if word_friendly:
        # Word-openable HTML: no @page, no running headers, no CSS counters.
        # Use semantic h1/h2/h3 so Word can apply its native header numbering (theme: headingNumbering).
        css = (
            "*{margin:0;padding:0;box-sizing:border-box}"
            f"body{{font-family:{font};font-size:{bfs};color:{bc};line-height:{lh};padding:20px}}"
            f".doc-header{{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-family:{hf_font};font-size:{hfs};color:{hfc}}}"
            f".sens-badge{{background:{sbg};color:{sfg};font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:1px}}"
            f".doc-cover{{margin-bottom:24px;padding-bottom:14px;{cover_border};overflow:hidden}}"
            f"h1.doc-title{{font-size:{ts};color:{hc};font-weight:700;margin:24px 0 6px 0;line-height:1.2;clear:both}}"
            f".title-rule{{{title_rule};margin-bottom:24px}}"
            f"h1:not(.doc-title){{font-size:{h1s};font-weight:{h1w};color:{hc};{h1_border};padding-bottom:4px;margin:26px 0 10px 0}}"
            f"h2{{font-size:{h2s};font-weight:{h2w};color:{hc};margin:20px 0 8px 0{h2_extra}}}"
            f"h3{{font-size:{h3s};font-weight:{h3w};color:{hc};margin:14px 0 6px 0{h3_extra}}}"
            "p{margin:0 0 10px 0}"
            "ul,ol{margin:0 0 10px 22px}li{margin-bottom:4px}"
            "table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.95em}"
            f"th{{background:{thb};color:{thfg};padding:7px 10px;text-align:left;font-weight:{thw};border:1px solid {tb}}}"
            f"tr:nth-child(even) td{{background:{tband}}}"
            f"td{{padding:6px 10px;border:1px solid {tb};vertical-align:top}}td:first-child{{font-weight:700}}"
            f"code{{background:#F4F6F8;padding:1px 5px;border-radius:3px;font-size:.88em;font-family:'Courier New',monospace;color:{bc}}}"
            f"pre{{background:#F4F6F8;padding:12px 14px;border-left:3px solid {pre_col};margin:12px 0}}"
            "pre code{background:none;padding:0;font-size:.85em}"
            f"blockquote{{border-left:4px solid {bq_col};margin:12px 0;padding:8px 16px;color:{bc};opacity:.8;background:#F9FAFB}}"
            f"strong{{color:{hc}}}a{{color:{lc};text-decoration:none}}"
            f".content-wrap{{padding-bottom:{bpad}}}"
        )
        return (
            f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">{gfonts_tag}<style>{css}</style></head>'
            f'<body>'
            f'<div class="doc-header"><span>{company}</span><span class="sens-badge">{slbl}</span></div>'
            f'<div class="doc-cover">{logo_html}</div>'
            f'<h1 class="doc-title">{title}</h1>'
            f'<div class="title-rule"></div>'
            f'<div class="content-wrap">{body_html}</div>'
            f'</body></html>'
        )
    # PDF: full print CSS with @page, running headers, CSS counters
    css = (
        "*{margin:0;padding:0;box-sizing:border-box}"
        f"body{{font-family:{font};font-size:{bfs};color:{bc};line-height:{lh}}}"
        f".rhl{{position:running(headerLeft);padding-bottom:4mm}}"
        f".rhr{{position:running(headerRight);padding-bottom:4mm}}"
        f".rhc{{font-family:{hf_font};font-size:{hfs};color:{hfc}}}"
        f".rhs{{display:inline-block;font-family:{hf_font};font-size:0.6em;color:#8899AA;background:#EDF1F5;padding:1px 10px;border-radius:3px;letter-spacing:0.5px;line-height:1.4;font-weight:400}}"
        f"@page{{margin:{mt} {mr} {mb} {ml};"
        f"@top-left{{content:element(headerLeft);vertical-align:bottom}}"
        f"@top-right{{content:element(headerRight);vertical-align:bottom}}"
        f'@bottom-left{{content:"{company}";font-family:{hf_font};font-size:{hfs};color:{hfc}}}'
        f'@bottom-right{{content:"{flbl} " counter(page) " of " counter(pages);font-family:{hf_font};font-size:{hfs};color:{hfc}}}}}'
        f".doc-cover{{margin-bottom:24px;padding-bottom:14px;{cover_border};overflow:hidden}}"
        f".sens-badge{{float:right;background:{sbg};color:{sfg};font-family:{hf_font};font-size:{hfs};font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:1px;margin-top:4px}}"
        f"h1.doc-title{{font-size:{ts};color:{hc};font-weight:700;margin:24px 0 6px 0;line-height:1.2;clear:both}}"
        f".title-rule{{{title_rule};margin-bottom:24px}}"
        f"body{{counter-reset:h1c}}"
        f"h1:not(.doc-title){{counter-reset:h2c;counter-increment:h1c}}"
        f"h1:not(.doc-title)::before{{content:counter(h1c) \". \";color:{hnum_col}}}"
        f"h2{{counter-reset:h3c;counter-increment:h2c}}"
        f"h2::before{{content:counter(h1c) \".\" counter(h2c) \" \";color:{hnum_col}}}"
        f"h3{{counter-increment:h3c}}"
        f"h3::before{{content:counter(h1c) \".\" counter(h2c) \".\" counter(h3c) \" \";color:{hnum_col}}}"
        f"h1{{font-size:{h1s};font-weight:{h1w};color:{hc};{h1_border};padding-bottom:4px;margin:26px 0 10px 0;page-break-after:avoid}}"
        f"h2{{font-size:{h2s};font-weight:{h2w};color:{hc};margin:20px 0 8px 0;page-break-after:avoid{h2_extra}}}"
        f"h3{{font-size:{h3s};font-weight:{h3w};color:{hc};margin:14px 0 6px 0;page-break-after:avoid{h3_extra}}}"
        "p{margin:0 0 10px 0;orphans:3;widows:3}"
        "ul,ol{margin:0 0 10px 22px}li{margin-bottom:4px}"
        "table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.95em;page-break-inside:avoid}"
        f"th{{background:{thb};color:{thfg};padding:7px 10px;text-align:left;font-weight:{thw};border:1px solid {tb}}}"
        f"tr:nth-child(even) td{{background:{tband}}}"
        f"td{{padding:6px 10px;border:1px solid {tb};vertical-align:top}}td:first-child{{font-weight:700}}"
        f"code{{background:#F4F6F8;padding:1px 5px;border-radius:3px;font-size:.88em;font-family:'Courier New',monospace;color:{bc}}}"
        f"pre{{background:#F4F6F8;padding:12px 14px;border-left:3px solid {pre_col};margin:12px 0;page-break-inside:avoid}}"
        "pre code{background:none;padding:0;font-size:.85em}"
        f"blockquote{{border-left:4px solid {bq_col};margin:12px 0;padding:8px 16px;color:{bc};opacity:.8;background:#F9FAFB}}"
        f"strong{{color:{hc}}}a{{color:{lc};text-decoration:none}}"
        f".content-wrap{{padding-bottom:{bpad}}}"
    )

    return (
        f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">{gfonts_tag}<style>{css}</style></head>'
        f'<body>'
        f'<div class="rhl"><span class="rhc">{company}</span></div>'
        f'<div class="rhr"><span class="rhs">{slbl}</span></div>'
        f'<div class="doc-cover">{logo_html}</div>'
        f'<h1 class="doc-title">{title}</h1>'
        f'<div class="title-rule"></div>'
        f'<div class="content-wrap">{body_html}</div>'
        f'</body></html>'
    )

# ── PRESENTATION MODE ─────────────────────────────────────────────────────────

def parse_slide_meta(text):
    """Extract <!-- key: value --> directives from top of slide block."""
    meta, lines, content = {}, text.strip().split("\n"), []
    for line in lines:
        m = re.match(r'<!--\s*(\w+)\s*:\s*(.+?)\s*-->', line)
        if m:
            meta[m.group(1).lower()] = m.group(2).strip()
        else:
            content.append(line)
    return meta, "\n".join(content)

def slide_title_and_body(text):
    """Pull first # or ## line as title, rest as body markdown."""
    lines = text.strip().split("\n")
    title, body, found = "", [], False
    for line in lines:
        if not found and re.match(r'^#{1,2} ', line):
            title = re.sub(r'^#{1,2} ', '', line).strip()
            found = True
        else:
            body.append(line)
    body_html = markdown.markdown("\n".join(body).strip(),
                                  extensions=["tables","fenced_code","attr_list","nl2br"])
    return title, body_html

def build_presentation_html(content, theme_name, sensitivity, with_narrative=False, td=None):
    t          = load_theme(theme_name, td)
    font       = t.get("fontFamily", "Arial, sans-serif")
    gfonts     = t.get("googleFontsUrl", "")
    hc         = t.get("headingColor", "#1A3B66")
    accent1    = t.get("accentColor",   "#8CC240")
    accent2    = t.get("accentSecondary", "#4DBFED")
    accent3    = t.get("accentTertiary",  "#D61B5E")
    company    = t.get("companyName", "")

    logo_uri   = find_logo(theme_name, prefer_white=True, td=td)
    logo_html  = f'<img class="logo" src="{logo_uri}">' if logo_uri else f'<span style="color:rgba(255,255,255,0.6);font-size:9pt;">{company}</span>'

    backgrounds = find_backgrounds(theme_name, td=td)
    has_images  = len(backgrounds) > 0

    gfonts_tag  = f'<link rel="stylesheet" href="{gfonts}">' if gfonts else ""

    # Split slides on --- separator
    raw_slides  = re.split(r'\n---\n', content)
    slides      = [s.strip() for s in raw_slides if s.strip()]
    total       = len(slides)

    # ── Per-slide @page rules ─────────────────────────────────────────────────
    page_css = ""
    slide_bgs = []
    for i, slide_text in enumerate(slides):
        smeta, _ = parse_slide_meta(slide_text)
        bg_dir   = smeta.get("bg", "auto")

        if bg_dir == "light":
            bg_css = "background: #FFFFFF;"
        elif bg_dir == "gradient":
            bg_css = f"background: linear-gradient(135deg, {hc} 0%, {accent2} 100%);"
        elif bg_dir == "color":
            bg_css = f"background: {hc};"
        elif bg_dir.startswith("#"):
            bg_css = f"background: {bg_dir};"
        else:
            # auto / image — use background images cycling, fallback gradient
            if has_images:
                uri = backgrounds[i % len(backgrounds)]
                bg_css = f"background-image: url('{uri}'); background-size: cover; background-position: center;"
            else:
                bg_css = f"background: linear-gradient(135deg, {hc} 0%, {accent2} 70%, {accent3} 100%);"

        slide_bgs.append(bg_dir)
        page_css += f"@page p{i} {{ size: 297mm 167mm; margin: 0; {bg_css} }}\n.s{i} {{ page: p{i}; }}\n"

    # ── Shared CSS ────────────────────────────────────────────────────────────
    narr_right = "64mm" if with_narrative else "0mm"
    narr_pad   = "80mm" if with_narrative else "16mm"

    shared_css = f"""
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: {font}; }}
{page_css}

.slide {{
    width: 297mm; height: 167mm;
    background: rgba(5, 15, 45, 0.55);
    display: flex; flex-direction: column;
    position: relative;
}}
.slide-light {{
    width: 297mm; height: 167mm;
    background: rgba(255,255,255,0.96);
    display: flex; flex-direction: column;
    position: relative;
}}

/* Main content area */
.slide-body-area {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 11mm 16mm 6mm 16mm;
}}

/* Footer bar */
.slide-footer {{
    height: 9mm;
    background: rgba(0,0,0,0.40);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8mm;
    flex-shrink: 0;
}}
.slide-footer-light {{
    height: 9mm;
    background: {hc};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8mm;
    flex-shrink: 0;
}}
.logo {{ max-height: 5.5mm; }}

/* Sensitivity badge — muted */
.sens {{
    font-size: 7pt; font-weight: 600; letter-spacing: 1.2px;
    padding: 0.8mm 3mm; border-radius: 0.8mm;
    background: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.55);
    border: 0.3mm solid rgba(255,255,255,0.20);
}}
.pagenum {{ font-size: 8pt; color: rgba(255,255,255,0.35); }}

/* Narrative panel */
.narrative-panel {{
    position: absolute;
    top: 0; right: 0; bottom: 9mm;
    width: 64mm;
    background: rgba(0,0,0,0.42);
    border-left: 0.3mm solid rgba(255,255,255,0.12);
    padding: 8mm 6mm;
    display: flex; flex-direction: column; gap: 3mm;
}}
.narrative-label {{
    font-size: 7pt; font-weight: 600; letter-spacing: 1.5px;
    color: rgba(255,255,255,0.35); text-transform: uppercase;
}}
.narrative-text {{
    font-size: 10pt;
    color: rgba(255,255,255,0.62);
    line-height: 1.65; font-weight: 300; font-style: italic;
}}

/* Dark slide typography */
.cover-title {{
    color: white; font-size: 44pt; font-weight: 700;
    line-height: 1.12; margin-bottom: 4mm;
}}
.slide-title {{
    color: white; font-size: 30pt; font-weight: 700;
    line-height: 1.2; margin-bottom: 3mm;
}}
.divider-title {{
    color: white; font-size: 38pt; font-weight: 700;
    line-height: 1.15; text-align: center;
}}
.rule {{
    width: 14mm; height: 1.2mm;
    background: linear-gradient(90deg, {accent1}, {accent2});
    border-radius: 1mm; margin-bottom: 5mm;
}}
.cover-rule {{ width: 18mm; height: 1.5mm; margin-bottom: 5mm; }}
.body-text {{
    color: rgba(255,255,255,0.90);
    font-size: 16pt; line-height: 1.7;
}}
.body-text p {{ margin-bottom: 3mm; }}
.body-text ul, .body-text ol {{ margin-left: 6mm; }}
.body-text li {{ margin-bottom: 3.5mm; }}
.body-text strong {{ color: {accent2}; font-weight: 600; }}
.body-text table {{ width:100%; border-collapse:collapse; font-size:13pt; }}
.body-text th {{ padding:2.5mm 4mm; text-align:left; color:{accent2};
                 border-bottom:0.4mm solid rgba(255,255,255,0.2); font-weight:600; }}
.body-text tr:nth-child(even) td {{ background: rgba(255,255,255,0.05); }}
.body-text td {{ padding:2.5mm 4mm; color:rgba(255,255,255,0.85);
                 border-bottom:0.3mm solid rgba(255,255,255,0.1); }}
.body-text td:first-child {{ color:white; font-weight:600; }}
.body-text blockquote {{
    border-left: 1.5mm solid {accent2}; padding: 3mm 6mm;
    margin: 4mm 0; color: rgba(255,255,255,0.75); font-style:italic;
}}
.subtitle {{
    color: rgba(255,255,255,0.65); font-size: 16pt;
    margin-top: 2mm; font-weight: 300;
}}

/* Light slide typography */
.slide-title-light {{
    color: {hc}; font-size: 30pt; font-weight: 700;
    line-height: 1.2; margin-bottom: 3mm;
}}
.body-text-light {{
    color: {hc}; font-size: 16pt; line-height: 1.7;
}}
.body-text-light p {{ margin-bottom: 3mm; }}
.body-text-light ul, .body-text-light ol {{ margin-left: 6mm; }}
.body-text-light li {{ margin-bottom: 3.5mm; }}
.body-text-light strong {{ color: {accent3}; font-weight: 600; }}
"""

    # ── Render each slide ─────────────────────────────────────────────────────
    def render_slide(i, slide_text, total):
        smeta, text_clean = parse_slide_meta(slide_text)
        layout   = smeta.get("layout", "cover" if i == 0 else "content")
        bg_dir   = smeta.get("bg", "auto")
        narrative_text = smeta.get("narrative", "")

        # Parse narrative from slide content: lines starting with > are narrative
        content_lines, narr_lines = [], []
        for line in text_clean.split("\n"):
            if line.startswith("> ") or line == ">":
                narr_lines.append(line[2:] if line.startswith("> ") else "")
            else:
                content_lines.append(line)
        if narr_lines and not narrative_text:
            narrative_text = " ".join(narr_lines).strip()
        text_clean = "\n".join(content_lines)

        title, body_html = slide_title_and_body(text_clean)

        is_light = (bg_dir == "light")
        slide_cls = "slide-light" if is_light else "slide"
        footer_cls = "slide-footer-light" if is_light else "slide-footer"
        pr = narr_pad if (with_narrative and narrative_text) else "16mm"

        # Narrative panel
        narr_html = ""
        if with_narrative and narrative_text:
            narr_html = f"""<div class="narrative-panel">
                <div class="narrative-label">Speaker notes</div>
                <div class="narrative-text">{narrative_text}</div>
            </div>"""

        # Footer
        sens_label = sensitivity.upper()
        footer = f"""<div class="{footer_cls}">
            {logo_html}
            <div style="display:flex;align-items:center;gap:3mm;">
                <span class="sens">{sens_label}</span>
                <span class="pagenum">{i+1} / {total}</span>
            </div>
        </div>"""

        # Layout variants
        if layout == "cover":
            body_area = f"""<div class="slide-body-area" style="justify-content:center;padding-left:20mm;padding-right:{pr};">
                <div class="rule cover-rule"></div>
                <div class="cover-title">{title}</div>
                <div class="subtitle">{body_html}</div>
            </div>"""
        elif layout == "divider":
            body_area = f"""<div class="slide-body-area" style="align-items:center;text-align:center;padding-right:{pr};">
                <div class="rule" style="margin:0 auto 5mm auto;width:20mm;"></div>
                <div class="divider-title">{title}</div>
                <div class="subtitle" style="text-align:center;margin-top:4mm;">{body_html}</div>
            </div>"""
        elif is_light:
            body_area = f"""<div class="slide-body-area" style="padding-right:{pr};">
                <div class="slide-title-light">{title}</div>
                <div class="rule"></div>
                <div class="body-text-light">{body_html}</div>
            </div>"""
        else:
            body_area = f"""<div class="slide-body-area" style="padding-right:{pr};">
                <div class="slide-title">{title}</div>
                <div class="rule"></div>
                <div class="body-text">{body_html}</div>
            </div>"""

        return f'<div class="{slide_cls} s{i}">{narr_html}{body_area}{footer}</div>'

    slides_html = "\n".join(render_slide(i, s, total) for i, s in enumerate(slides))

    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
{gfonts_tag}
<style>{shared_css}</style>
</head><body>
{slides_html}
</body></html>"""

# ── Main ──────────────────────────────────────────────────────────────────────

def convert(md_path, output_path=None, mode_override=None, with_narrative=False, td=None, output_format="pdf"):
    """Convert markdown to PDF, Word (HTML), or .docx. output_format: 'pdf' | 'word' | 'docx'."""
    base = os.path.splitext(md_path)[0]
    if not output_path:
        output_path = base + (".html" if output_format == "word" else ".docx" if output_format == "docx" else ".pdf")

    if output_format == "docx" and not pandoc_available():
        raise SystemExit("docx export requires pandoc. Install pandoc and ensure it is on PATH (e.g. https://pandoc.org/installing.html).")

    raw  = open(md_path, encoding="utf-8").read()
    meta, content = parse_frontmatter(raw)

    theme_name  = meta.get("theme", "comotion")
    sensitivity = meta.get("sensitivity", "internal")
    mode        = mode_override or meta.get("mode", "document")
    word_friendly = output_format in ("word", "docx")

    if mode == "presentation":
        # Strip global title if present — first slide is the cover
        if content.strip().startswith("# "):
            _, content = extract_title(content)
        content = strip_escapes(content)
        html = build_presentation_html(content, theme_name, sensitivity,
                                       with_narrative=with_narrative, td=td)
    else:
        title, body_md = extract_title(content)
        title   = strip_escapes(title)
        body_md = strip_escapes(body_md)
        body_html = markdown.markdown(body_md, extensions=["tables","fenced_code","attr_list","nl2br"])
        html = build_document_html(title, body_html, theme_name, sensitivity, td=td, word_friendly=word_friendly)

    if output_format == "pdf":
        weasyprint.HTML(string=html, base_url=os.path.dirname(md_path) or ".").write_pdf(output_path)
        return output_path

    if output_format == "word":
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        return output_path

    # docx: write HTML to temp file, run pandoc, remove temp
    fd, html_path = tempfile.mkstemp(suffix=".html", prefix="md2docx_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(html)
        subprocess.run(
            ["pandoc", "-f", "html", "-t", "docx", "-o", output_path, html_path],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as e:
        try:
            os.remove(html_path)
        except OSError:
            pass
        raise SystemExit(f"pandoc failed: {e.stderr.decode() if e.stderr else e}")
    finally:
        try:
            os.remove(html_path)
        except OSError:
            pass
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output", nargs="?")
    parser.add_argument("--format", choices=["pdf", "word", "docx"], default="pdf", dest="output_format")
    parser.add_argument("--mode", choices=["document","presentation"], default=None)
    parser.add_argument("--themes-dir", default=None, dest="themes_dir")
    parser.add_argument("--narrative", action="store_true", help="Include speaker notes panel")
    args = parser.parse_args()
    out = convert(args.input, args.output,
                  mode_override=args.mode,
                  with_narrative=args.narrative,
                  td=args.themes_dir,
                  output_format=args.output_format)
    if args.output_format == "pdf":
        print("PDF written:", out)
    elif args.output_format == "word":
        print("Word (HTML) written:", out)
    else:
        print("DOCX written:", out)
