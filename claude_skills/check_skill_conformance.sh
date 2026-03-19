#!/usr/bin/env bash
# Verify a skill directory conforms to Claude / Agent Skills (agentskills.io) spec.
# Usage: ./check_skill_conformance.sh [skill_dir]
# Default: md-document

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="${1:-md-document}"
SKILL_DIR="${SCRIPT_DIR}/${SKILL_NAME}"
SKILL_MD="${SKILL_DIR}/SKILL.md"

if [[ ! -f "$SKILL_MD" ]]; then
  echo "Error: SKILL.md not found: $SKILL_MD" >&2
  exit 1
fi

fail=0

# Extract frontmatter (lines between first --- and second ---)
fm=$(sed -n '/^---$/,/^---$/p' "$SKILL_MD" | sed '1d;$d')

# name: required, max 64, [a-z0-9-]
name=$(echo "$fm" | sed -n 's/^name:[[:space:]]*["'\'']*\([^"'\'']*\)["'\'']*[[:space:]]*$/\1/p' | head -1)
if [[ -z "$name" ]]; then
  echo "FAIL: frontmatter missing 'name'"
  fail=1
else
  len=${#name}
  if [[ $len -gt 64 ]]; then
    echo "FAIL: name length $len > 64"
    fail=1
  elif [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
    echo "FAIL: name must be lowercase letters, numbers, hyphens only (got: $name)"
    fail=1
  else
    echo "OK  name: $name (length $len)"
  fi
fi

# description: required, max 1024 (single-line quoted value only)
desc_line=$(echo "$fm" | grep '^description:' | head -1)
desc=$(echo "$desc_line" | sed -n 's/^description:[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p')
if [[ -z "$desc" ]]; then
  desc=$(echo "$desc_line" | sed -n "s/^description:[[:space:]]*'\(.*\)'[[:space:]]*$/\1/p")
fi
if [[ -z "$desc" ]]; then
  echo "FAIL: frontmatter missing or unparseable 'description'"
  fail=1
else
  len=${#desc}
  if [[ $len -gt 1024 ]]; then
    echo "FAIL: description length $len > 1024"
    fail=1
  else
    echo "OK  description: length $len (max 1024)"
  fi
fi

if [[ $fail -eq 0 ]]; then
  echo ""
  echo "Conformance: PASS (Agent Skills / Claude spec)"
else
  echo ""
  echo "Conformance: FAIL"
  exit 1
fi
