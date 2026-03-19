---
theme: comotion
sensitivity: internal
mode: document
---

# Comotion Group — Brand Overview

This document describes the Comotion group and its sub-brands. Use the corresponding theme in your frontmatter to apply each brand's fonts, colours, and assets.

# Comotion Business Solutions

**Theme:** `comotion`

Comotion Business Solutions is the parent brand for consulting and delivery: analytics, strategy, and operational excellence. Use this theme for internal reviews, board updates, workshop kickoffs, and client deliverables that represent the core consulting practice.

| Attribute | Value |
|-----------|--------|
| Primary colour | #1A3B66 (deep navy) |
| Font | Roboto |
| Logo | Colour and white variants; white used on dark slide backgrounds |
| Slide backgrounds | Dark abstract images with gradient fallback (navy → sky blue → magenta) |

# comotion.ai

<img src="/themes/comotion-ai/assets/comotion-ai-logo-svg.svg" alt="comotion.ai" style="height:28px;margin-bottom:8px;">

**Theme:** `comotion-ai`

comotion.ai is the intelligent analytics and AI solutions sub-brand. Use this theme for AI product pitches, solution proposals, and sales decks where the focus is on data-driven insights and automation.

| Attribute | Value |
|-----------|--------|
| Primary colour | #1A3B66 (navy) with multi-colour accents |
| Font | Inter |
| Accents | Green #8CC240, sky blue #4DBFED, magenta #D61B5E |
| Slide backgrounds | Dark abstract images; gradient cover bar and title rule |

# Seed Analytics

<img src="/themes/seedanalytics/assets/seed-analytics-logo-svg-colour.svg" alt="Seed Analytics" style="height:28px;margin-bottom:8px;">

**Theme:** `seedanalytics`

Seed Analytics is the sub-brand for analytics maturity, data quality, and strategic data initiatives. Use this theme for assessments, data quality reports, proposals, and board updates that align with the Seed Analytics brand guide and presentation style.

| Attribute | Value |
|-----------|--------|
| Primary colour | #051F4C (dark navy) |
| Fonts | Plus Jakarta Sans (headings), Sora (body) |
| Accents | Medium gold #B5AFA2, dark gold #88837A |
| Presentation | White slide background; "Private and Confidential" footer when sensitivity is confidential |

# Choosing a theme

Set `theme:` in your frontmatter to one of: `comotion`, `comotion-ai`, or `seedanalytics`. All three themes support **document** and **presentation** modes and sensitivity levels (public, internal, confidential, secret). Generate PDF or Word output using `scripts/md_to_pdf.py` with `--themes-dir` pointing at the skill's `themes/` directory.
