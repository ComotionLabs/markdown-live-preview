# Markdown Document & Presentation Skill

Convert themed Markdown to **PDF**, **Word (HTML)**, or **.docx** using `scripts/md_to_pdf.py`. Header numbering in Word is theme-defined and uses Word's native numbering system. See [SKILL.md](SKILL.md) for the agent workflow and [references/themes.md](references/themes.md) for theme configuration.

## Output formats

| Format | Flag | Output | Notes |
|--------|------|--------|-------|
| PDF | `--format pdf` (default) | `.pdf` | WeasyPrint; requires `markdown`, `weasyprint` |
| Word (HTML) | `--format word` | `.html` | Open in Microsoft Word |
| .docx | `--format docx` | `.docx` | Requires **pandoc** on PATH |

## Usage

```bash
# PDF (default)
python3 scripts/md_to_pdf.py input.md [output.pdf] --themes-dir themes

# Word-openable HTML
python3 scripts/md_to_pdf.py input.md [output.html] --format word --themes-dir themes

# Native .docx (requires pandoc)
python3 scripts/md_to_pdf.py input.md [output.docx] --format docx --themes-dir themes
```

From the skill directory (`claude_skills/md-document`), omit `--themes-dir` to use the bundled `themes/` automatically when running the script from this repo.

## Dependencies

- **Python 3** with `pip install -r requirements.txt` (markdown, weasyprint for PDF).
- **pandoc** for `--format docx`: install from [pandoc.org](https://pandoc.org/installing.html) and ensure it is on PATH.

## Testing

Tests use **pytest** and live in `tests/`. Scenarios cover frontmatter parsing, document/presentation mode, and PDF/Word/.docx output.

**Using a virtual environment** (recommended on macOS/Homebrew Python):

```bash
cd claude_skills/md-document
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest tests/ -v
```

Manual checks: use the sample files in `examples/` (e.g. `examples/seedanalytics-document-example.md`) and run the script with `--format pdf`, `--format word`, or `--format docx`.
