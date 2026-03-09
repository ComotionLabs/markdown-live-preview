---
name: md-document
description: "Use this skill whenever creating, editing, or formatting Markdown (.md) files intended for professional output — including reports, memos, proposals, briefs, guides, SOWs, policies, OR presentation decks / slide decks. Supports two modes: 'document' (multi-page report layout) and 'presentation' (full-bleed 16:9 slide deck). This skill CAN generate Word-openable output: use --format word to produce an .html file that opens in Microsoft Word (no pandoc required). It can also produce PDF (default) or native .docx (requires pandoc). ALWAYS trigger this skill when the user asks for a document or presentation to be created, or for a 'Word document', 'Word file', or 'HTML for Word' — even without an explicit format request — and when the user mentions themes (comotion, comotion-ai, seedanalytics), sensitivity levels (public, internal, confidential, secret). This skill creates the .md file AND generates branded, themed PDF, Word (HTML), or .docx. Do NOT use for code files, READMEs, or casual markdown snippets that won't be rendered as documents."
---

# Markdown Document & Presentation Skill

Create professional `.md` files rendered as branded, themed **PDF**, **Word (HTML)**, or **.docx** via `scripts/md_to_pdf.py`. All logos, backgrounds, and theme configs are bundled under `themes/`.

**Output formats:** PDF (default) | **Word document** — use `--format word` to generate an `.html` file that opens in Microsoft Word (theme styling and heading structure preserved; no pandoc required) | .docx — use `--format docx` for native Word (requires pandoc on PATH).

Two content modes:
- **document** — multi-page report/memo/proposal (default)
- **presentation** — full-bleed 16:9 slide deck

---

## Workflow (Follow This Every Time)

1. **Ask** for theme and sensitivity if not provided
2. **For presentations** — also ask: *"Should I include a speaker notes panel?"*
3. **Write** the `.md` file with correct frontmatter
4. **Generate PDF, Word (HTML), or .docx** via bash_tool (see Generation section)
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
| `seedanalytics` | Seed Analytics | Plus Jakarta Sans / Sora, navy #051F4C, gradient fallback bg |
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

You can produce **Word-openable HTML** for any document: run the script with `--format word` and an output path ending in `.html`. The result is a single HTML file that the user opens in Microsoft Word; it is fully styled (theme colours, fonts, logo, sensitivity badge) and uses semantic headings so Word can apply its native heading numbering. **No pandoc is required for Word (HTML).** Use `--format pdf` (default), `--format word`, or `--format docx`. For native `.docx`, **pandoc** must be on PATH.

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

### Document mode — .docx (native)

Requires **pandoc** installed and on PATH. Produces a native Word document.

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

**Dependencies:** `markdown` and `weasyprint` (PDF); **pandoc** for `--format docx`. Python deps auto-installed if missing.

---

## Bundled Assets

```
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
