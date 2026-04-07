"""Tests for md_to_pdf conversion: frontmatter, document/presentation, PDF/Word/docx output, CLI."""
import os
import sys
import tempfile

import pytest

# Import after conftest has added scripts/ to path
import md_to_pdf as m2p

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_DIR = os.path.join(TESTS_DIR, "scenarios")
THEMES_DIR = os.path.join(TESTS_DIR, "..", "themes")


# ── Frontmatter ─────────────────────────────────────────────────────────────

def test_parse_frontmatter_valid():
    text = """---
theme: seedanalytics
sensitivity: confidential
mode: document
---

# Title
Body."""
    meta, content = m2p.parse_frontmatter(text)
    assert meta["theme"] == "seedanalytics"
    assert meta["sensitivity"] == "confidential"
    assert meta["mode"] == "document"
    assert "# Title" in content
    assert "Body." in content


def test_parse_frontmatter_missing_defaults():
    text = "# No frontmatter"
    meta, content = m2p.parse_frontmatter(text)
    assert meta["theme"] == "comotion"
    assert meta["sensitivity"] == "internal"
    assert meta["mode"] == "document"
    assert content.strip() == "# No frontmatter"


def test_extract_title():
    md = "# The Title\n\nFirst para.\n\n# Section"
    title, rest = m2p.extract_title(md)
    assert title == "The Title"
    assert "First para." in rest
    assert "# Section" in rest


# ── Document mode HTML ──────────────────────────────────────────────────────

def test_build_document_html_pdf_has_counters():
    html = m2p.build_document_html(
        "Test Title", "<p>Body</p>", "comotion", "internal", td=THEMES_DIR, word_friendly=False
    )
    assert "counter(h1c)" in html or "counter-reset" in html
    assert "@page" in html
    assert "Test Title" in html
    assert "Body" in html


def test_build_document_html_word_no_static_numbers():
    html = m2p.build_document_html(
        "Test Title", "<p>Body</p>", "comotion", "internal", td=THEMES_DIR, word_friendly=True
    )
    # Word-friendly: no @page, no running(), no ::before counter content
    assert "@page" not in html
    assert "running(" not in html
    assert "Test Title" in html
    assert "Body" in html
    assert "content-wrap" in html


# ── Output format PDF and Word ───────────────────────────────────────────────

def test_convert_pdf():
    md_path = os.path.join(SCENARIOS_DIR, "minimal_doc.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_doc.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "out.pdf")
        result = m2p.convert(md_path, output_path=out, td=THEMES_DIR, output_format="pdf")
        assert result == out
        assert os.path.isfile(out)
        assert os.path.getsize(out) > 100


def test_convert_word():
    md_path = os.path.join(SCENARIOS_DIR, "minimal_doc.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_doc.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "out.html")
        result = m2p.convert(md_path, output_path=out, td=THEMES_DIR, output_format="word")
        assert result == out
        assert os.path.isfile(out)
        content = open(out, encoding="utf-8").read()
        assert "Minimal Document Title" in content
        assert "First Section" in content


@pytest.mark.skipif(not m2p.pandoc_available(), reason="pandoc not on PATH")
def test_convert_docx():
    md_path = os.path.join(SCENARIOS_DIR, "minimal_doc.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_doc.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "out.docx")
        result = m2p.convert(md_path, output_path=out, td=THEMES_DIR, output_format="docx")
        assert result == out
        assert os.path.isfile(out)
        assert os.path.getsize(out) > 100


def test_convert_docx_requires_pandoc():
    if m2p.pandoc_available():
        pytest.skip("pandoc is available")
    md_path = os.path.join(SCENARIOS_DIR, "minimal_doc.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_doc.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "out.docx")
        with pytest.raises(SystemExit):
            m2p.convert(md_path, output_path=out, td=THEMES_DIR, output_format="docx")


# ── Default output path ─────────────────────────────────────────────────────

def test_convert_default_output_path_word():
    md_path = os.path.join(SCENARIOS_DIR, "minimal_doc.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_doc.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        # Copy md into tmp so we can predict output path
        import shutil
        dest_md = os.path.join(tmp, "doc.md")
        shutil.copy(md_path, dest_md)
        result = m2p.convert(dest_md, output_path=None, td=THEMES_DIR, output_format="word")
        assert result == os.path.join(tmp, "doc.html")
        assert os.path.isfile(result)


def test_convert_default_output_path_pdf():
    md_path = os.path.join(SCENARIOS_DIR, "minimal_doc.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_doc.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        dest_md = os.path.join(tmp, "doc.md")
        import shutil
        shutil.copy(md_path, dest_md)
        result = m2p.convert(dest_md, output_path=None, td=THEMES_DIR, output_format="pdf")
        assert result == os.path.join(tmp, "doc.pdf")
        assert os.path.isfile(result)


# ── Presentation mode ──────────────────────────────────────────────────────

def test_convert_presentation_pdf():
    md_path = os.path.join(SCENARIOS_DIR, "minimal_pres.md")
    if not os.path.exists(md_path):
        pytest.skip("scenarios/minimal_pres.md not found")
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "deck.pdf")
        result = m2p.convert(md_path, output_path=out, td=THEMES_DIR, output_format="pdf")
        assert result == out
        assert os.path.isfile(out)
        assert os.path.getsize(out) > 100


# ── markdown_rich (parity with live preview server.js) ──────────────────────

def test_markdown_rich_callout_and_flow():
    import markdown_rich as mr

    html = mr.markdown_to_rich_html(
        "> [!NOTE]\n> Alert body.\n\n:::flow\nA | B\n:::\n"
    )
    assert 'class="callout callout-note"' in html
    assert "Alert body." in html
    assert "flow-block" in html
    assert "flow-item" in html


def test_markdown_rich_stat_and_columns():
    import markdown_rich as mr

    md = """:::stat
# 99%
Subtitle here
:::

:::columns
Left **bold**
|||
Right
:::
"""
    html = mr.markdown_to_rich_html(md)
    assert "stat-block" in html
    assert "99%" in html
    assert "columns-block" in html
    assert "columns-left" in html
    assert "columns-right" in html


def test_split_slide_keeps_alerts_in_content():
    content, narr = m2p.split_slide_content_and_narrative(
        "## Title\n\n> [!TIP]\n> On slide\n\n> Speaker only\n"
    )
    assert "[!TIP]" in content
    assert "On slide" in content
    assert "Speaker only" in narr
