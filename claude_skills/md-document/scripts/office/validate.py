#!/usr/bin/env python3
"""
Validate a .docx: ZIP structure, well-formed XML, and required reference styles.
Exit 1 on failure; prints OK message on success.
"""
from __future__ import annotations

import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

REQUIRED_STYLE_IDS = frozenset(
    {
        "Normal",
        "Heading1",
        "Heading2",
        "Heading3",
        "TableHeader",
        "TableBody",
        "CodeBlock",
        "SourceCode",
        "Table",
        "Compact",
    }
)


def _style_ids(styles_xml: bytes) -> set[str]:
    root = ET.fromstring(styles_xml)
    out: set[str] = set()
    for el in root.findall(".//w:style", NS):
        sid = el.get(f"{{{NS['w']}}}styleId")
        if sid:
            out.add(sid)
    return out


def validate_docx(path: str) -> list[str]:
    errors: list[str] = []
    try:
        zf = zipfile.ZipFile(path, "r")
    except zipfile.BadZipFile as e:
        return [f"Not a valid ZIP/.docx: {e}"]

    names = zf.namelist()
    for req in (
        "[Content_Types].xml",
        "word/document.xml",
        "word/styles.xml",
        "word/_rels/document.xml.rels",
    ):
        if req not in names:
            errors.append(f"Missing {req}")

    if errors:
        zf.close()
        return errors

    for rel in ("word/document.xml", "word/styles.xml"):
        try:
            ET.fromstring(zf.read(rel))
        except ET.ParseError as e:
            errors.append(f"Invalid XML in {rel}: {e}")

    styles = zf.read("word/styles.xml")
    ids = _style_ids(styles)
    missing = sorted(REQUIRED_STYLE_IDS - ids)
    if missing:
        errors.append(f"Missing styles: {', '.join(missing)}")

    zf.close()
    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 validate.py <file.docx>", file=sys.stderr)
        return 2
    path = sys.argv[1]
    err = validate_docx(path)
    if err:
        for line in err:
            print(line, file=sys.stderr)
        return 1
    print(f"OK: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
