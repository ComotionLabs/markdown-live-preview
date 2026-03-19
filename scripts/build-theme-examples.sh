#!/usr/bin/env bash
# Generate one PDF per theme for document and presentation modes (repo templates),
# plus presentation PDFs with speaker notes (--narrative) for each theme.
# Requires Python 3 with md-document deps (WeasyPrint, markdown). See claude_skills/md-document/requirements-dev.txt
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT}/build/examples"
M2P="${ROOT}/claude_skills/md-document/scripts/md_to_pdf.py"
THEMES="${ROOT}/claude_skills/md-document/themes"
TPL="${ROOT}/templates"
EXAMPLES="${ROOT}/claude_skills/md-document/examples"

mkdir -p "$OUT"

if [[ ! -f "$M2P" ]]; then
  echo "Error: md_to_pdf.py not found at $M2P" >&2
  exit 1
fi

for theme in comotion comotion-ai seedanalytics; do
  for mode in document presentation; do
    src="${TPL}/${theme}-${mode}-template.md"
    dst="${OUT}/${theme}-${mode}.pdf"
    if [[ ! -f "$src" ]]; then
      echo "Error: missing template $src" >&2
      exit 1
    fi
    python3 "$M2P" "$src" "$dst" --format pdf --themes-dir "$THEMES"
    if [[ ! -s "$dst" ]]; then
      echo "Error: output missing or empty: $dst" >&2
      exit 1
    fi
  done
done

# Presentations with speaker notes (narrative panel) — one curated example per theme
declare -a NARRATIVE_BUILDS=(
  "${TPL}/comotion-presentation-with-notes-template.md|${OUT}/comotion-presentation-notes.pdf"
  "${EXAMPLES}/comotion-ai-sales-presentation-with-notes.md|${OUT}/comotion-ai-presentation-notes.pdf"
  "${EXAMPLES}/seedanalytics-roadmap-with-notes-example.md|${OUT}/seedanalytics-presentation-notes.pdf"
)

for entry in "${NARRATIVE_BUILDS[@]}"; do
  src="${entry%%|*}"
  dst="${entry##*|}"
  if [[ ! -f "$src" ]]; then
    echo "Error: missing narrative source $src" >&2
    exit 1
  fi
  python3 "$M2P" "$src" "$dst" --format pdf --themes-dir "$THEMES" --narrative
  if [[ ! -s "$dst" ]]; then
    echo "Error: output missing or empty: $dst" >&2
    exit 1
  fi
done

echo "Theme example PDFs (document + presentation + presentation with notes) → $OUT"
ls -la "$OUT"
