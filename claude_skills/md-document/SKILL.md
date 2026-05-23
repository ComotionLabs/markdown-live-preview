---
name: md-document
description: "Use when creating or editing Markdown for professional output: reports, memos, proposals, briefs, guides, SOWs, policies, or presentation decks. Modes: document (multi-page) and presentation (16:9 slides). Output: PDF (default), Word (.html via --format word), branded native .docx (scripts/md_to_docx.py + pandoc), or legacy .docx via md_to_pdf --format docx (HTML round-trip, not reference-branded). Trigger: document/presentation requests; 'Word document', 'HTML for Word', 'native Word', '.docx', or send in Word; themes (comotion, comotion-ai, seedanalytics) or sensitivity. Do not use for code, READMEs, or casual snippets."
---

# Markdown Document & Presentation Skill

Create professional `.md` files rendered as branded, themed **PDF**, **Word (HTML)**, or **native .docx** via `scripts/md_to_pdf.py` and, for **branded** Word output, `scripts/md_to_docx.py`. Logos, backgrounds, and theme configs live under `themes/`; pandoc **reference** `.docx` templates live under `templates/`.

**Output formats:** PDF (default) | **Word (HTML)** — `--format word` produces `.html` for Microsoft Word (no pandoc) | **Branded native .docx** — `scripts/md_to_docx.py` (pandoc + `templates/<theme>-reference.docx`: header logo, footer sensitivity + page numbers) | **Legacy .docx** — `md_to_pdf.py --format docx` converts rendered HTML through pandoc without a reference document (quick but not template-branded).

Two content modes:
- **document** — multi-page report/memo/proposal (default)
- **presentation** — full-bleed 16:9 slide deck

---

## Workflow (Follow This Every Time)

1. **Ask** for theme and sensitivity if not provided
2. **For presentations** — also ask: *"Should I include a speaker notes panel?"*
3. **Write** the `.md` file with correct frontmatter
4. **Generate PDF, Word (HTML), or native .docx** via bash_tool (see Generation section)
5. **Copy** `.md` and the generated file (`.pdf`, `.html`, or `.docx`) to `/mnt/user-data/outputs/` and present them

---

## Frontmatter (Required for Both Modes)

Every file MUST start with a YAML frontmatter block:

```markdown
---
theme: comotion
sensitivity: confidential
mode: document
---
```

### theme

| Theme | Company | Style |
|-------|---------|-------|
| `comotion` | Comotion Business Solutions | Roboto, navy #1A3B66, colour logo, gradient fallback bg |
| `seedanalytics` | Seed Analytics | Plus Jakarta Sans / Sora, navy #051F4C, gradient fallback bg; presentation footer "Private and Confidential" (confidential), colour #B5AFA2; aligns with `examples/Presentation1.pptx` |
| `comotion-ai` | comotion.ai | Inter, navy #1A3B66, dark photo backgrounds, gradient accents |

### sensitivity

| Value | Badge style |
|-------|------------|
| `public` | Muted grey (doc) / frosted glass (presentation) |
| `internal` | Muted grey / frosted glass |
| `confidential` | Muted grey / frosted glass |
| `secret` | Muted grey / frosted glass |

### mode

`document` (default) or `presentation`

---

## Document Mode

### Structure rules

- **First `#`** — document title. Large, styled, no heading number.
- **Subsequent `#`** — auto-numbered: 1., 2., 3. Never add manual numbers.
- **`##` and `###`** — numbered hierarchically: 1.1, 1.1.1

### Special characters

Escape with backslash in source — the renderer strips them automatically:

| Character | Source | Renders as |
|-----------|--------|------------|
| `~` | `\~` | ~ |
| `*` | `\*` | * |
| `_` | `\_` | _ |

Tildes are especially important — raw `~` triggers strikethrough.

### Document template

```markdown
---
theme: comotion
sensitivity: confidential
mode: document
---

# Document Title

Brief introduction paragraph.

# Background

Context and background.

## Sub-section

Further detail.

# Analysis

| Metric | Value | Target |
|--------|-------|--------|
| Revenue | R12.5m | R15m |

# Recommendations

Clear recommendations.
```

---

## Presentation Mode

### How slides work

- Slides are separated by `---` on its own line
- The **first line** of each slide block (`#` or `##`) becomes the slide title
- Everything else is slide body content
- Markdown renders normally: bullets, tables, bold, blockquotes

### Authoring template

```markdown
---
theme: comotion-ai
sensitivity: confidential
mode: presentation
---

# Deck Title
Subtitle or tagline

---

## Slide Title

Body content here.

- **Bold point** with detail
- Another point
- Third point

---

## Table Slide

| Column A | Column B |
|----------|----------|
| Row 1 | Value 1 |
| Row 2 | Value 2 |

---

<!-- layout: divider -->
## Section Break Title

---

## Final Slide

Closing content.
```

### Per-slide layout directives

Add HTML comment directives at the top of a slide block to override layout or background:

```markdown
<!-- layout: divider -->
<!-- bg: gradient -->

## Section Title
```

**`layout` values:**

| Value | Effect |
|-------|--------|
| `cover` | Centred large title — applied automatically to slide 0 |
| `divider` | Section break, centred, no body content |
| `content` | Standard title + body (default for all other slides) |

**`bg` values:**

| Value | Effect |
|-------|--------|
| `auto` | Cycles through theme background images; gradient fallback (default) |
| `image` | Force background image |
| `gradient` | Force gradient from theme accent colours |
| `color` | Force solid theme primary colour |
| `light` | White background, dark text |
| `#1A3B66` | Any hex value as solid fill |

### Speaker notes (narrative panel)

When `--narrative` flag is used, a right-side panel shows speaker notes on each slide. Notes are written as `>` blockquote lines within the slide block:

```markdown
## The Problem We Solve

- **Data silos** across 10–20 source systems
- **Manual processing** consuming 60% of analyst time

> This slide lands hard with CIOs. Let it sit before moving on.
> Ask them how many hours per month they spend on reconciliation.
```

Notes appear in a muted italic panel — visible when the deck is forwarded but unobtrusive in presentation mode.

**Always ask the user** whether to include the narrative panel before generating. Default is no.

### Background images

Themes with background images cycle them across slides (`index % total_images`):

| Theme | Backgrounds |
|-------|-------------|
| `comotion-ai` | 2 dark abstract images (01, 02) |
| `comotion` | 2 dark abstract images (01, 02) |
| `seedanalytics` | Gradient fallback (navy → gold) |

To add backgrounds to a theme: drop PNG/JPG into `themes/<theme>/assets/` — picked up automatically.

---

## PDF, Word, and .docx Generation

You can produce **Word-openable HTML** for any document: run the script with `--format word` and an output path ending in `.html`. The result is a single HTML file that the user opens in Microsoft Word; it is fully styled (theme colours, fonts, logo, sensitivity badge) and uses semantic headings so Word can apply its native heading numbering. **No pandoc is required for Word (HTML).** Use `--format pdf` (default) or `--format word` from `md_to_pdf.py`. For **native `.docx`**, use **`md_to_docx.py`** (branded, recommended) or **`md_to_pdf.py --format docx`** (HTML round-trip, not reference-branded); both need **pandoc** on PATH.

### Document mode — PDF (default)

```bash
python3 /mnt/skills/user/md-document/scripts/md_to_pdf.py \
  /home/claude/my-document.md \
  /mnt/user-data/outputs/my-document.pdf \
  --themes-dir /mnt/skills/user/md-document/themes
```

### Document mode — Word (HTML)

**When the user asks for a Word document or HTML for Word:** use this. The script outputs a single `.html` file — the user opens it in Microsoft Word. Theme styling (logo, colours, fonts, sensitivity badge) is embedded; headings are semantic so Word can apply its native numbering (theme: `headingNumbering`, `headingNumberingMaxLevel`). No pandoc needed.

```bash
python3 /mnt/skills/user/md-document/scripts/md_to_pdf.py \
  /home/claude/my-document.md \
  /mnt/user-data/outputs/my-document.html \
  --format word \
  --themes-dir /mnt/skills/user/md-document/themes
```

### Document mode — .docx (branded, recommended)

Requires **pandoc** on PATH. Uses theme-specific reference documents in `templates/` (header logo, styles, footer with sensitivity + “Page X of Y”). Reads `theme` and `sensitivity` from frontmatter (defaults match `md_to_pdf.py`: `comotion`, `internal`). Optional `--sensitivity` overrides the footer label.

```bash
python3 /mnt/skills/user/md-document/scripts/md_to_docx.py \
  /home/claude/my-document.md \
  /mnt/user-data/outputs/my-document.docx \
  --themes-dir /mnt/skills/user/md-document/themes
```

Validate reference templates after regenerating: `python3 scripts/office/validate.py templates/comotion-reference.docx`.

**Regenerate `templates/*.docx`** (maintainers): from repo root, `node claude_skills/md-document/scripts/build_reference_docs.js` (needs `pandoc`, `unzip`, `docx` npm package, and `rsvg-convert` or `cairosvg` / `inkscape` for SVG→PNG).

Fenced code blocks use pandoc’s **SourceCode** paragraph style in Word; reference docs also define **CodeBlock**, **TableHeader**, and **TableBody** for custom-style use.

**Limitations (native Word):** no background images or full-bleed covers like PDF/presentation mode; font substitution depends on the reader’s installed fonts.

### Document mode — .docx (legacy, HTML round-trip)

`md_to_pdf.py --format docx` writes the same themed HTML as PDF, then runs pandoc **without** `--reference-doc`. Use only when you need a quick `.docx` without the branded template.

```bash
python3 /mnt/skills/user/md-document/scripts/md_to_pdf.py \
  /home/claude/my-document.md \
  /mnt/user-data/outputs/my-document.docx \
  --format docx \
  --themes-dir /mnt/skills/user/md-document/themes
```

### Presentation — without narrative

```bash
python3 /mnt/skills/user/md-document/scripts/md_to_pdf.py \
  /home/claude/my-deck.md \
  /mnt/user-data/outputs/my-deck.pdf \
  --themes-dir /mnt/skills/user/md-document/themes
```

### Presentation — with narrative panel

```bash
python3 /mnt/skills/user/md-document/scripts/md_to_pdf.py \
  /home/claude/my-deck.md \
  /mnt/user-data/outputs/my-deck.pdf \
  --themes-dir /mnt/skills/user/md-document/themes \
  --narrative
```

Mode is read from frontmatter `mode:` automatically. Override with `--mode presentation` if needed.

**Dependencies:** `markdown` and `weasyprint` (PDF); **pandoc** for `.docx` (both `md_to_docx.py` and `--format docx`). Python deps auto-installed if missing.

---

## Templates (four sets)

In `examples/` there are four template sets. Each has a document and a presentation; use the one that matches the requested brand.

| Template | Use for |
|----------|---------|
| **comotion** | Comotion Business Solutions — `comotion-document-template.md`, `comotion-presentation-template.md` |
| **comotion-ai** | comotion.ai — `comotion-ai-document-template.md`, `comotion-ai-presentation-template.md` |
| **seedanalytics** | Seed Analytics — `seedanalytics-document-template.md`, `seedanalytics-presentation-template.md` |
| **comotion group** | All three brands in one doc/deck — `comotion-group-document-template.md`, `comotion-group-presentation-template.md` |

When the user asks for a "Comotion group" or "all brands" overview, use the **comotion group** templates. For a single-brand deliverable, use the matching template set.

---

## Bundled Assets

```
templates/
  comotion-reference.docx
  comotion-ai-reference.docx
  seedanalytics-reference.docx
themes/
  comotion/
    theme.json
    assets/
      comotion-logo-svg-colour.svg
      comotion-logo-svg-white.svg
      comotion-background-dark-01.png
      comotion-background-dark-02.png
  seedanalytics/
    theme.json
    assets/
      seed-analytics-logo-svg-colour.svg
      seed-analytics-logo-svg-white.svg
      seed-analytics-logo-white-600px.png   <- used on dark backgrounds
  comotion-ai/
    theme.json
    assets/
      comotion-ai-logo-svg-white.svg     <- used on dark backgrounds
      comotion-ai-logo-svg.svg           <- fallback
      comotion-ai-background-dark-01.png
      comotion-ai-background-dark-02.png
```

Logo selection is automatic: white logo on dark/image backgrounds, colour logo on light backgrounds.

---

## Writing Style

- **British spelling** — colour, analyse, organisation, programme
- **Direct, purposeful** — lead with the point
- **Specific dates** where applicable
- **No manual heading numbers** in documents — auto-numbered by theme
- **Paragraph prose** in documents; **bullet-led** in presentations
- **One idea per slide** — 3–5 bullets maximum per slide

---

## Theme Details Reference

For full theme configuration (font stacks, size tables, colour values, table styling), see `references/themes.md`.
