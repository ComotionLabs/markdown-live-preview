#!/usr/bin/env bash
# Build a Claude skill: zip the skill directory and save as .skill in build/
# Usage: ./build_skill.sh [skill_dir_name]
# Default: md-document

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="${1:-md-document}"
BUILD_DIR="${SCRIPT_DIR}/build"
SKILL_DIR="${SCRIPT_DIR}/${SKILL_NAME}"
OUTPUT="${BUILD_DIR}/${SKILL_NAME}.skill"

if [[ ! -d "$SKILL_DIR" ]]; then
  echo "Error: skill directory not found: $SKILL_DIR" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"

cd "$SKILL_DIR"
zip -r "$OUTPUT" . \
  -x ".venv/*" \
  -x "*.pyc" \
  -x "*__pycache__*" \
  -x ".DS_Store" \
  -q

echo "Built: $OUTPUT"
