---
theme: comotion
sensitivity: Internal
---

# Markdown Live Preview Test Document

This document exercises:
- Heading IDs for anchor links
- Heading numbering in preview and on Copy to Word
- Word table formatting (header row, first column emphasis, banded rows)
- Theme styling (fonts, title size)

See also: [Jump to Methods](#methods) · [Jump to Results](#results)

## Overview

This section demonstrates anchor-friendly headings and clean content structure. The theme is set via frontmatter to `comotion`, and sensitivity is `Internal`.

### Goals

1. Preview shows numbered headings (CSS counters) when enabled by theme.
2. Copy to Word preserves heading numbering by injecting numeric prefixes.
3. Tables paste into Word with header formatting, first column emphasis, and banded rows.

## Methods

### Inputs

- Input A: Sample text
- Input B: Sample value

### Procedure

1. Prepare sample markdown.
2. Preview with `md-preview`.
3. Use “Copy to Word” and paste into Word to validate:
   - Title size preserved
   - Heading numbering present
   - Table displays banded rows, header shading, and first-column emphasis

## Results

### Sample Table

| Item            | Description                 | Status  |
|-----------------|-----------------------------|---------|
| Alpha           | First entry in the dataset  | Passed  |
| Beta            | Second entry                | Passed  |
| Gamma           | Third entry                 | Warning |
| Delta           | Fourth entry                | Failed  |

Notes:
- Header row should be shaded.
- Even body rows should be lightly banded.
- First column text should be bold.

### Additional Headings (Depth)

#### H3 Level Example

Demonstrates multi-level numbering (e.g., 2.1, 2.1.1) in preview and copied content.

## Discussion

- Anchor links should scroll smoothly: try the links at the top.
- Numbering should be visible after pasting into Word (static numbers, not dynamic Word lists).
- Table should paste with gridlines and light banding similar to Markdown renderers.

## Appendix

### Another Table

| Key            | Value            |
|----------------|------------------|
| Project        | Markdown Preview |
| Theme          | comotion         |
| Sensitivity    | Internal         |
| Export Tested  | Word, PDF        |

