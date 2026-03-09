# md-document skill — Presentation examples

Use these as templates when creating slide decks with the md-document skill. Each uses `mode: presentation`, slides separated by `---`, and theme-specific styling.

## Existing examples

| File | Theme | Use case |
|------|-------|----------|
| `comotion-presentation-example.md` | comotion | Strategic review / Q4 summary — metrics table, executive summary |
| `seedanalytics-presentation-example.md` | seedanalytics | Analytics maturity assessment — score table, dimensions |
| `comotion-ai-presentation-example.md` | comotion-ai | AI solution pitch — challenge, solution, CTA |

## New examples

| File | Theme | Use case |
|------|-------|----------|
| `comotion-ai-sales-presentation-with-notes.md` | comotion-ai | **Sales deck with speaker notes** — use `--narrative` when generating PDF so the `>` blockquotes appear in a right-hand panel. Shows layout directives and narrative panel. |
| `comotion-workshop-kickoff-example.md` | comotion | **Workshop kickoff** — agenda table, ground rules, section dividers |
| `seedanalytics-board-update-example.md` | seedanalytics | **Board/executive update** — confidential sensitivity, metrics table, risks, and “ask” section |

## Features demonstrated

- **Speaker notes:** In `comotion-ai-sales-presentation-with-notes.md`, lines starting with `>` are speaker notes. Generate with `--narrative` for the narrative panel.
- **Section dividers:** `<!-- layout: divider -->` before a slide title gives a centred section-break slide.
- **Tables:** Standard markdown tables render in slides.
- **Themes:** comotion, seedanalytics, comotion-ai — each has its own fonts, colours, and assets.

## Generating PDFs

From the skill workflow, after writing the `.md` file:

```bash
# Presentation without speaker notes
python3 scripts/md_to_pdf.py path/to/deck.md path/to/output.pdf --themes-dir themes

# Presentation with speaker notes (narrative panel)
python3 scripts/md_to_pdf.py path/to/deck.md path/to/output.pdf --themes-dir themes --narrative
```

Mode is read from frontmatter `mode: presentation` automatically.

### Build folder (this repo)

To build all presentation examples into `build/presentations/`:

```bash
npm run build:presentations
```

**Requirements:** Python 3 and `pip install -r claude_skills/md-document/requirements.txt`.

**macOS:** If you get `OSError: cannot load library 'libgobject-2.0-0'`, install WeasyPrint’s system deps: `brew install pango glib`, then if needed run with `DYLD_LIBRARY_PATH="$(brew --prefix pango)/lib:$(brew --prefix glib)/lib" npm run build:presentations`.
