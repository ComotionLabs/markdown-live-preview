---
theme: seedanalytics
sensitivity: internal
mode: document
---

# Data Quality Report — March 2025

Monthly summary of data quality metrics and remediation activity for the core analytics platform.

# Executive Summary

Overall data quality score improved to **89%** (target 90%). Two high-priority issues were resolved; one remains in progress for April.

# Quality Metrics

| Dataset | Completeness | Accuracy | Timeliness | Overall |
|---------|--------------|----------|------------|---------|
| Sales transactions | 99.2% | 98.1% | 100% | 99.1% |
| Customer master | 94.0% | 96.5% | 95% | 95.2% |
| Product catalogue | 88.0% | 97.0% | 100% | 95.0% |

# Actions Taken

1. **Sales transactions** — Corrected timezone mapping for EMEA sources; no further action.
2. **Customer master** — Deduplication rules updated; re-run scheduled for 5 April.
3. **Product catalogue** — Awaiting vendor fix for discontinued SKU flag; workaround in place.

# Recommendations

1. Extend monitoring to marketing attribution data from next month.
2. Document data quality SLAs in the governance policy (draft approved).
3. Schedule quarterly review with source system owners.
