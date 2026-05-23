#!/usr/bin/env python3
"""
Convert md-document Markdown (with YAML frontmatter) to branded native .docx via pandoc.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_ROOT = os.path.dirname(SCRIPT_DIR)
TEMPLATES_DIR = os.path.join(SKILL_ROOT, "templates")

SENS_PLACEHOLDER = "__SENSITIVITY__"

THEME_FILES = {
    "comotion": "comotion-reference.docx",
    "comotion-ai": "comotion-ai-reference.docx",
    "seedanalytics": "seedanalytics-reference.docx",
}


def resolve_sensitivity(meta: dict[str, str], cli: str | None) -> str:
    if cli is not None:
        return cli.strip()
    return meta.get("sensitivity", "internal").strip() or "internal"


def resolve_theme(meta: dict[str, str]) -> str:
    t = meta.get("theme", "comotion").strip().lower()
    if t not in THEME_FILES:
        print(f"Unknown theme '{t}', using comotion.", file=sys.stderr)
        return "comotion"
    return t


def patch_docx_sensitivity(docx_path: str, label: str) -> None:
    """Replace footer placeholder with the sensitivity label (UTF-8)."""
    label_bytes = label.encode("utf-8")
    ph = SENS_PLACEHOLDER.encode("utf-8")
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".docx")
    os.close(tmp_fd)
    try:
        with zipfile.ZipFile(docx_path, "r") as zin:
            with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    data = zin.read(item.filename)
                    if item.filename.startswith("word/footer") and item.filename.endswith(".xml"):
                        data = data.replace(ph, label_bytes)
                    zout.writestr(item, data)
        os.replace(tmp_path, docx_path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def main() -> int:
    ap = argparse.ArgumentParser(description="Markdown (md-document) to branded .docx")
    ap.add_argument("input_md", help="Input .md file")
    ap.add_argument("output_docx", help="Output .docx path")
    ap.add_argument(
        "--themes-dir",
        default=None,
        help="Reserved for compatibility with md_to_pdf.py (unused for reference templates).",
    )
    ap.add_argument(
        "--sensitivity",
        default=None,
        help="Override sensitivity label for footer (default: frontmatter or confidential).",
    )
    args = ap.parse_args()

    if shutil.which("pandoc") is None:
        print(
            "pandoc is required for .docx output. Install from https://pandoc.org/installing.html",
            file=sys.stderr,
        )
        return 1

    _ = args.themes_dir  # reserved

    sys.path.insert(0, SCRIPT_DIR)
    import md_to_pdf as m2p

    with open(args.input_md, encoding="utf-8") as f:
        raw = f.read()
    meta, body = m2p.parse_frontmatter(raw)
    body = m2p.strip_escapes(body)
    theme = resolve_theme(meta)
    sensitivity = resolve_sensitivity(meta, args.sensitivity)

    ref_name = THEME_FILES[theme]
    reference = os.path.join(TEMPLATES_DIR, ref_name)
    if not os.path.isfile(reference):
        print(f"Missing reference doc: {reference}", file=sys.stderr)
        return 1

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".md",
        delete=False,
        encoding="utf-8",
    ) as tmp:
        tmp.write(body)
        stripped_path = tmp.name

    try:
        cmd = [
            "pandoc",
            stripped_path,
            "-o",
            args.output_docx,
            f"--reference-doc={reference}",
            "--from",
            "markdown",
            "--to",
            "docx",
            "-V",
            "geometry:a4paper",
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr or r.stdout or "pandoc failed", file=sys.stderr)
            return r.returncode or 1
        patch_docx_sensitivity(args.output_docx, sensitivity)
    finally:
        try:
            os.unlink(stripped_path)
        except OSError:
            pass

    print(os.path.abspath(args.output_docx))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
