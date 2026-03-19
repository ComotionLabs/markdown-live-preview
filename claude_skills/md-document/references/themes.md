# Theme Configuration Reference

Full theme configuration details for md-preview themes. Read this file when you need specifics about font sizes, colours, margins, or table styling.

## Table of Contents

1. Comotion Theme
2. Seed Analytics Theme
3. Theme JSON Schema
4. Creating Custom Themes

### Presentation — dark cover / divider subtitle

On slides that use a dark page background (solid `headingColor`, gradient, or imagery), the title-slide subtitle uses the `.subtitle` class. Its colour comes from **`presentationCoverSubtitleColor`** in `theme.json`; if omitted, the default is **`rgba(255,255,255,0.90)`** so copy stays readable on every theme. Set a custom value for a brand tint (e.g. Seed Analytics uses `#F2EFE8`).

---

## Comotion Theme

**Company**: Comotion Business Solutions
**Primary colour**: #1A3B66 (deep navy)
**Font**: Roboto (loaded via Google Fonts)

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Document title | 36px | — |
| H1 (sections) | 20px | 700 (bold) |
| H2 | 18px | 500 (medium) |
| H3 | 16px | 500 (medium) |
| Body text | 14px | 400 (regular) |
| Line height | 1.7 | — |

### Colours

- Body text: #1A3B66
- Headings: #1A3B66
- Links: #1A3B66
- Header/footer: #1A3B66

### Print Settings

- Top margin: 22mm
- Right margin: 18mm
- Bottom margin: 22mm
- Left margin: 18mm
- Content bottom padding: 18mm
- Footer enabled: yes
- Footer label: "Page"
- Heading numbering: enabled (h1–h3)

### Sensitivity Levels (all use same styling)

- Background: #F0F0F0
- Foreground: #1A3B66

### Table Styling (Copy to Word)

- Border colour: #B4B4B4
- Header background: #F0F0F0
- Header text weight: 700
- Even row banding: #FAFAFA
- First column bold: yes
- Cell padding: 8px 12px

### Presentation Mode

- **Backgrounds**: 2 dark abstract images (comotion-background-dark-01.png, 02.png) cycle across slides; gradient fallback (navy → sky blue → magenta).
- **Accent colours**: Green #8CC240, Sky blue #4DBFED, Magenta #D61C5E (brand guide).
- **Logo**: White logo on dark backgrounds (automatic).

### Full JSON

```json
{
  "name": "comotion",
  "companyName": "Comotion Business Solutions",
  "fontFamily": "'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "headerFooterFontFamily": "'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap",
  "logoSrc": "/themes/comotion/assets/comotion-logo-svg-colour.svg",
  "logoAlt": "Comotion",
  "titleFontSize": "36px",
  "h1FontSize": "20px",
  "h1FontWeight": "700",
  "h2FontSize": "18px",
  "h2FontWeight": "500",
  "h3FontSize": "16px",
  "h3FontWeight": "500",
  "bodyFontSize": "14px",
  "lineHeight": "1.7",
  "bodyColor": "#1A3B66",
  "headingColor": "#1A3B66",
  "linkColor": "#1A3B66",
  "headerFooterColor": "#1A3B66",
  "accentColor": "#8CC240",
  "accentSecondary": "#4DBFED",
  "accentTertiary": "#D61C5E",
  "headingNumbering": true,
  "headingNumberingMaxLevel": 3,
  "printFooterEnabled": true,
  "printFooterLabel": "Page",
  "printMargins": { "top": "22mm", "right": "18mm", "bottom": "22mm", "left": "18mm" },
  "printContentBottomPadding": "18mm",
  "headerFooterFontSize": "0.9em",
  "sensitivityLevels": {
    "Public": { "bg": "#F0F0F0", "fg": "#1A3B66" },
    "Internal": { "bg": "#F0F0F0", "fg": "#1A3B66" },
    "Confidential": { "bg": "#F0F0F0", "fg": "#1A3B66" },
    "Restricted": { "bg": "#F0F0F0", "fg": "#1A3B66" }
  },
  "tableWordStyling": {
    "enabled": true,
    "borderColor": "#B4B4B4",
    "headerBg": "#F0F0F0",
    "headerTextWeight": "700",
    "bandEvenBg": "#FAFAFA",
    "firstColumnBold": true,
    "firstColumnBg": "",
    "cellPadding": "8px 12px"
  }
}
```

---

## Seed Analytics Theme

**Company**: Seed Analytics
**Primary colour**: #051F4C (dark navy)
**Font**: Plus Jakarta Sans / Sora (loaded via Google Fonts)
**Presentation reference**: Layout and footer align with `examples/Presentation1.pptx` and the Seed Analytics brand guide (`examples/LATEST seed-analytics-brand-guide-2023.pdf`). With `presentationDefaultBackground: "light"`, **content** slides use a white body; **cover and divider** slides use a full-bleed navy (`headingColor`) background. Subtitle text on those dark slides uses `presentationCoverSubtitleColor` (Seed sets a warm off-white `#F2EFE8`; other themes rely on the global default light subtitle unless overridden). Footer bar is transparent (`presentationFooterBackground: "transparent"`). Footer text "Private and Confidential" when `sensitivity: confidential`, colour #B5AFA2. Footer logo size is set with `presentationLogoMaxHeight` (larger than the default 5.5mm). On white slides the colour logo variant is used; on dark slides the white logo asset is preferred when present.

### Typography

#### Document mode

| Element | Size | Weight |
|---------|------|--------|
| Document title | 28px | — |
| H1 (sections) | 22px | — |
| H2 | 18px | — |
| H3 | 16px | — |
| Body text | 14px | — |
| Line height | 1.7 | — |

#### Presentation mode (per brand guide)

| Element | Font | Weight |
|---------|------|--------|
| Slide titles / headings | Plus Jakarta Sans | **Light (300)** |
| Sub-headings | Plus Jakarta Sans | **Medium (500)** |
| Body copy | Sora | **Regular (400)** |

### Colours

- Body text: #051F4C (Navy Blue)
- Headings: #051F4C (Navy Blue)
- Links: #051F4C (Navy Blue)
- Header/footer: #051F4C (Navy Blue)
- Accent / Medium Gold: #B5AFA2
- Accent secondary / Dark Gold: #88837A
- Accent tertiary / Light Gold: #D3CFC7
- Silver: #E6E6E6

### Print Settings

- Top margin: 22mm
- Right margin: 18mm
- Bottom margin: 22mm
- Left margin: 18mm
- Content bottom padding: 18mm
- Footer enabled: yes
- Footer label: "Page"
- Heading numbering: enabled (h1–h3)

### Sensitivity Levels (all use same styling)

- Background: #E6E6E6
- Foreground: #051F4C

### Table Styling (Copy to Word)

- Border colour: #D3CFC7
- Header background: #E6E6E6
- Header text weight: 600
- Even row banding: #F5F4F2
- First column bold: yes
- Cell padding: 8px 12px

### Full JSON

```json
{
  "name": "seedanalytics",
  "companyName": "Seed Analytics",
  "fontFamily": "'Plus Jakarta Sans', 'Sora', Arial, -apple-system, BlinkMacSystemFont, sans-serif",
  "headerFooterFontFamily": "'Plus Jakarta Sans', 'Sora', Arial, -apple-system, sans-serif",
  "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,500;0,700;1,300;1,500&family=Sora:wght@400&display=swap",
  "logoSrc": "/themes/seedanalytics/assets/seed-analytics-logo-svg-colour.svg",
  "logoAlt": "Seed Analytics",
  "titleFontSize": "28px",
  "h1FontSize": "22px",
  "h2FontSize": "18px",
  "h3FontSize": "16px",
  "bodyFontSize": "14px",
  "lineHeight": "1.7",
  "bodyColor": "#051F4C",
  "headingColor": "#051F4C",
  "linkColor": "#051F4C",
  "headerFooterColor": "#051F4C",
  "accentColor": "#B5AFA2",
  "accentSecondary": "#88837A",
  "accentTertiary": "#D3CFC7",
  "presentationFooterTextColor": "#B5AFA2",
  "presentationFooterBackground": "transparent",
  "presentationDefaultBackground": "light",
  "presentationLogoMaxHeight": "11mm",
  "presentationCoverSubtitleColor": "#F2EFE8",
  "presentationHeadingFontFamily": "'Plus Jakarta Sans', Arial, sans-serif",
  "presentationHeadingFontWeight": "300",
  "presentationSubheadingFontWeight": "500",
  "presentationBodyFontFamily": "'Sora', Arial, sans-serif",
  "presentationBodyFontWeight": "400",
  "sensitivityLabels": {
    "Confidential": "Private and Confidential"
  },
  "headingNumbering": true,
  "headingNumberingMaxLevel": 3,
  "printFooterEnabled": true,
  "printFooterLabel": "Page",
  "printMargins": { "top": "22mm", "right": "18mm", "bottom": "22mm", "left": "18mm" },
  "printContentBottomPadding": "18mm",
  "headerFooterFontSize": "0.9em",
  "sensitivityLevels": {
    "Public": { "bg": "#E6E6E6", "fg": "#051F4C" },
    "Internal": { "bg": "#E6E6E6", "fg": "#051F4C" },
    "Confidential": { "bg": "#E6E6E6", "fg": "#051F4C" },
    "Restricted": { "bg": "#E6E6E6", "fg": "#051F4C" }
  },
  "tableWordStyling": {
    "enabled": true,
    "borderColor": "#D3CFC7",
    "headerBg": "#E6E6E6",
    "headerTextWeight": "600",
    "bandEvenBg": "#F5F4F2",
    "firstColumnBold": true,
    "firstColumnBg": "",
    "cellPadding": "8px 12px"
  }
}
```

---

## comotion.ai Theme

**Company**: comotion.ai
**Primary colour**: #1A3B66 (navy) with multi-colour accents
**Font**: Inter (loaded via Google Fonts)
**Style**: Colourful, proposal-oriented — gradient accents, dark table headers

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Document title | 36px | 700 |
| H1 (sections) | 21px | 700 (bold) |
| H2 | 18px | 600 (semi-bold) |
| H3 | 16px | 600 (semi-bold) |
| Body text | 14px | 400 (regular) |
| Line height | 1.7 | — |

### Colours

- Body text: #2D3748 (dark slate)
- Headings: #1A3B66 (navy)
- Links: #4DBFED (sky blue)
- Header/footer: #1A3B66
- Accent green: #8CC240
- Accent sky blue: #4DBFED
- Accent magenta: #D61B5E

### Visual Accents

- Cover bar: gradient (navy → sky blue → magenta)
- Title rule: gradient (navy → sky blue → magenta)
- H1 underline: sky blue
- H2 left border: green
- H3 left border: magenta
- Heading numbers: sky blue
- Blockquote border: sky blue
- Code block border: sky blue

### Sensitivity Levels

- Public: bg #EDF2F7, fg #1A3B66
- Internal: bg #E2E8F0, fg #1A3B66
- Confidential: bg #1A3B66, fg #FFFFFF (inverted — high visibility)
- Restricted: bg #D61B5E, fg #FFFFFF (magenta — attention)

### Table Styling

- Border colour: #CBD5E0
- Header background: #1A3B66 (navy)
- Header text: #FFFFFF (white)
- Header text weight: 600
- Even row banding: #F7FAFC
- First column bold: yes
- Cell padding: 8px 12px

### Full JSON

```json
{
  "name": "comotion-ai",
  "companyName": "comotion.ai",
  "fontFamily": "'Inter', 'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "headerFooterFontFamily": "'Inter', 'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "logoSrc": "comotion-ai-logo-svg.svg",
  "logoAlt": "comotion.ai",
  "titleFontSize": "36px",
  "h1FontSize": "21px",
  "h1FontWeight": "700",
  "h2FontSize": "18px",
  "h2FontWeight": "600",
  "h3FontSize": "16px",
  "h3FontWeight": "600",
  "bodyFontSize": "14px",
  "lineHeight": "1.7",
  "bodyColor": "#2D3748",
  "headingColor": "#1A3B66",
  "linkColor": "#4DBFED",
  "headerFooterColor": "#1A3B66",
  "accentColor": "#8CC240",
  "accentSecondary": "#4DBFED",
  "accentTertiary": "#D61B5E",
  "coverStyle": "gradient",
  "headingNumbering": true,
  "headingNumberingMaxLevel": 3,
  "printFooterEnabled": true,
  "printFooterLabel": "Page",
  "printMargins": { "top": "22mm", "right": "18mm", "bottom": "22mm", "left": "18mm" },
  "printContentBottomPadding": "18mm",
  "headerFooterFontSize": "0.9em",
  "sensitivityLevels": {
    "Public": { "bg": "#EDF2F7", "fg": "#1A3B66" },
    "Internal": { "bg": "#E2E8F0", "fg": "#1A3B66" },
    "Confidential": { "bg": "#1A3B66", "fg": "#FFFFFF" },
    "Restricted": { "bg": "#D61B5E", "fg": "#FFFFFF" }
  },
  "tableWordStyling": {
    "enabled": true,
    "borderColor": "#CBD5E0",
    "headerBg": "#1A3B66",
    "headerFg": "#FFFFFF",
    "headerTextWeight": "600",
    "bandEvenBg": "#F7FAFC",
    "firstColumnBold": true,
    "firstColumnBg": "",
    "cellPadding": "8px 12px"
  }
}
```

---

## Theme JSON Schema

All theme fields with defaults:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| name | string | — | Theme identifier |
| companyName | string | "" | Appears in PDF footer (bottom-left) |
| fontFamily | string | system fonts | CSS font stack for body |
| headerFooterFontFamily | string | fontFamily | CSS font stack for header/footer |
| googleFontsUrl | string | "" | Google Fonts URL to load |
| logoSrc | string | "" | Path to logo (web path from /themes/...) |
| logoAlt | string | "" | Logo alt text |
| titleFontSize | string | "32px" | Document title size |
| h1FontSize | string | "21px" | Section heading size |
| h1FontWeight | string | "700" | Section heading weight |
| h2FontSize | string | "18px" | Sub-section heading size |
| h2FontWeight | string | "400" | Sub-section heading weight |
| h3FontSize | string | "16px" | Sub-sub-section heading size |
| h3FontWeight | string | "400" | Sub-sub-section heading weight |
| bodyFontSize | string | "14px" | Body text size |
| lineHeight | string | "1.6" | Line height multiplier |
| bodyColor | string | "" | Body text colour |
| headingColor | string | "" | Heading text colour |
| linkColor | string | "" | Link colour |
| headerFooterColor | string | "" | Header/footer text colour |
| headingNumbering | boolean | false | Enable auto heading numbers |
| headingNumberingMaxLevel | integer | 3 | Deepest heading level to number |
| printFooterEnabled | boolean | true | Show footer in PDF |
| printFooterLabel | string | "Page" | Label before page numbers |
| printMargins | object | 20mm/15mm | PDF page margins |
| printContentBottomPadding | string | "16mm" | Bottom padding before footer |
| sensitivityLevels | object | varies | Banner colours per sensitivity |
| tableWordStyling | object | varies | Word copy table formatting |
| accentColor | string | "" | Primary accent colour (e.g. green) |
| accentSecondary | string | "" | Secondary accent colour (e.g. sky blue) |
| accentTertiary | string | "" | Tertiary accent colour (e.g. magenta) |
| coverStyle | string | "" | Set to "gradient" for multi-colour cover bar and accents |

---

## Creating Custom Themes

To add a new theme to md-preview:

1. Create `themes/<theme-name>/` folder
2. Add assets (logos) in `themes/<theme-name>/assets/`
3. Create `themes/<theme-name>/theme.json` following the schema above
4. Use with `md-preview file.md --theme <theme-name>` or set `theme: <theme-name>` in document frontmatter
