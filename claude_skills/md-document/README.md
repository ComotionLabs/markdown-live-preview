# Markdown Document & Presentation Skill

Convert themed Markdown to **PDF**, **Word (HTML)**, or **.docx** using `scripts/md_to_pdf.py`, and to **branded native .docx** (pandoc reference templates) using `scripts/md_to_docx.py`. Header numbering in Word (HTML) is theme-defined and uses Word's native numbering system. See [SKILL.md](SKILL.md) for the agent workflow and [references/themes.md](references/themes.md) for theme configuration.

## Output formats

| Format | Flag | Output | Notes |
|--------|------|--------|-------|
| PDF | `--format pdf` (default) | `.pdf` | WeasyPrint; requires `markdown`, `weasyprint` |
| Word (HTML) | `--format word` | `.html` | Open in Microsoft Word |
| .docx (branded) | `md_to_docx.py` | `.docx` | Pandoc + `templates/*-reference.docx`; requires **pandoc** |
| .docx (legacy) | `--format docx` | `.docx` | HTML round-trip via `md_to_pdf.py`; requires **pandoc** |

## Usage

```bash
# PDF (default)
python3 scripts/md_to_pdf.py input.md [output.pdf] --themes-dir themes

# Word-openable HTML
python3 scripts/md_to_pdf.py input.md [output.html] --format word --themes-dir themes

# Branded native .docx (recommended; requires pandoc)
python3 scripts/md_to_docx.py input.md [output.docx] --themes-dir themes

# Legacy .docx — HTML round-trip (requires pandoc)
python3 scripts/md_to_pdf.py input.md [output.docx] --format docx --themes-dir themes
```

From the skill directory (`claude_skills/md-document`), omit `--themes-dir` to use the bundled `themes/` automatically when running the script from this repo.

## Rich markdown (same as live preview)

The skill uses `scripts/markdown_rich.py` with the **same syntax** as the Node markdown-live-preview app: GitHub-style callouts (`> [!NOTE]`, `> [!TIP]`, …), fenced blocks `:::stat` / `:::flow` / `:::columns` (column divider line `|||`), and styled blockquotes. Document and presentation exports both run this pipeline. In presentation mode, lines starting with `> ` still become speaker notes **except** alert lines (`> [!…]`) and pull quotes (`> "…`), which stay on the slide.

**Mermaid and charts:** Use fenced code with language `mermaid` for diagrams, and `chart` for a **Chart.js 4** config JSON object (same shape as `new Chart(canvas, config)`). The live preview renders these in the browser (Mermaid + Chart.js from CDN). For PDF/Word/HTML export, `scripts/diagram_embed.py` replaces them with static SVG (Mermaid via [Kroki](https://kroki.io)) and PNG ([QuickChart](https://quickchart.io)), which requires outbound HTTPS. Set `MD_DIAGRAM_FETCH=0` to skip embedding and leave the raw fenced blocks in the HTML.

## Dependencies

- **Python 3** with `pip install -r requirements.txt` (markdown, weasyprint for PDF).
- **pandoc** for `.docx` output (`md_to_docx.py` or `--format docx`): install from [pandoc.org](https://pandoc.org/installing.html) and ensure it is on PATH.

## Testing

Tests use **pytest** and live in `tests/`. Scenarios cover frontmatter parsing, document/presentation mode, and PDF/Word/.docx output.

**CI:** On every push and pull request, GitHub Actions runs [`.github/workflows/test-build.yml`](../../.github/workflows/test-build.yml): builds the skill package (`md-document.skill`) and runs `pytest` for this skill.

**Using a virtual environment** (recommended on macOS/Homebrew Python):

```bash
cd claude_skills/md-document
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest tests/ -v
```

Manual checks: use the sample files in `examples/` (e.g. `examples/seedanalytics-document-example.md`) and run the script with `--format pdf`, `--format word`, or `--format docx`.
