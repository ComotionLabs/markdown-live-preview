const express = require('express');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { Server } = require('socket.io');
const http = require('http');
const { exec } = require('child_process');

// Helper function to generate anchor IDs from heading text
// Matches common formats like "1. Purpose and Scope" -> "1-purpose-and-scope"
function generateAnchorId(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Configure marked with custom renderer for anchor links
const renderer = new marked.Renderer();

// Override heading renderer to add IDs
renderer.heading = function(text, level, raw) {
  const id = generateAnchorId(raw);
  return `<h${level} id="${id}">${text}</h${level}>`;
};

const CALLOUT_LABELS = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  important: 'Important',
  caution: 'Caution'
};

// GitHub-flavoured alert blockquotes: > [!NOTE] etc.
// Marked merges consecutive quote lines into one <p>, e.g. <p>[!NOTE]\nHello</p>
renderer.blockquote = function(quote) {
  const m = quote.match(/^\s*<p>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(?:\n|<br\s*\/?>)/i);
  if (m) {
    const typeM = quote.match(/\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i);
    const type = typeM[1].toLowerCase();
    const body = '<p>' + quote.slice(m[0].length);
    const label = CALLOUT_LABELS[type] || typeM[1];
    return (
      '<div class="callout callout-' +
      type +
      '" role="note"><div class="callout-title">' +
      escapeHtml(label) +
      '</div><div class="callout-body">' +
      body +
      '</div></div>\n'
    );
  }
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

marked.setOptions({
  mangle: false,
  // Disable built-in headerIds to avoid deprecation warnings; we add IDs via custom renderer
  headerIds: false,
  renderer: renderer
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Port management: requested vs actual bound port
let REQUESTED_PORT = Number(process.env.PORT) || 3000;
let CURRENT_PORT = REQUESTED_PORT;
const MARKDOWN_FILE = process.env.MARKDOWN_FILE;
const THEME = process.env.THEME;

// Serve theme assets
// Themes: single source of truth from claude_skills/md-document/themes (plan Part E)
const THEMES_DIR = path.join(__dirname, 'claude_skills', 'md-document', 'themes');
app.use('/themes', express.static(THEMES_DIR));

function loadTheme(themeName) {
  if (!themeName) {
    return {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      logoSrc: '',
      logoAlt: '',
      titleFontSize: '32px',
      h1FontSize: '21px',
      h1FontWeight: '700',
      h2FontSize: '18px',
      h2FontWeight: '400',
      h3FontSize: '16px',
      h3FontWeight: '400',
      bodyFontSize: '14px',
      lineHeight: '1.6',
      companyName: '',
      headingNumbering: false,
      headingNumberingMaxLevel: 3,
      printFooterEnabled: true,
      printFooterLabel: 'Page',
      printMargins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printContentBottomPadding: '16mm',
      headerFooterFontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      headerFooterFontSize: '0.9em',
      sensitivityLevels: {
        Public: { bg: '#e7f5ff', fg: '#0b7285' },
        Internal: { bg: '#f1f3f5', fg: '#343a40' },
        Confidential: { bg: '#fff3bf', fg: '#7f5f01' },
        Restricted: { bg: '#ffe3e3', fg: '#c92a2a' }
      },
      // Controls how tables are styled when copying to Word
        tableWordStyling: {
          enabled: true,
          borderColor: '#dee2e6',
          headerBg: '#f1f3f5',
          headerFg: '',
          headerTextWeight: '600',
          bandEvenBg: '#fafbfc',
          firstColumnBold: true,
          firstColumnBg: '',
          cellPadding: '8px 12px'
        },
        coverStyle: '',
        accentColor: '',
        accentSecondary: '',
        accentTertiary: '',
        coverBorderBottomWidth: '',
        titleRuleHeight: '',
        titleRuleOpacity: '',
        titleSubheadingColor: '',
        logoHeight: ''
    };
  }
  try {
    const manifestPath = path.join(THEMES_DIR, themeName, 'theme.json');
    if (fs.existsSync(manifestPath)) {
      const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);
      const tw = manifest.tableWordStyling || {};
      const headingColor = manifest.headingColor || '';
      // Resolve relative logo paths for browser (e.g. comotion-ai uses "comotion-ai-logo-svg.svg")
      let logoSrc = manifest.logoSrc || '';
      if (logoSrc && !logoSrc.startsWith('/')) {
        const base = '/themes/' + themeName + '/';
        logoSrc = logoSrc.startsWith('assets/') ? base + logoSrc : base + 'assets/' + logoSrc;
      }
      return {
        fontFamily: manifest.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        logoSrc,
        logoAlt: manifest.logoAlt || '',
        logoCopyToWordHeight: manifest.logoCopyToWordHeight || '22px',
        titleFontSize: manifest.titleFontSize || '32px',
        h1FontSize: manifest.h1FontSize || '21px',
        h1FontWeight: manifest.h1FontWeight || '700',
        h2FontSize: manifest.h2FontSize || '18px',
        h2FontWeight: manifest.h2FontWeight || '400',
        h3FontSize: manifest.h3FontSize || '16px',
        h3FontWeight: manifest.h3FontWeight || '400',
        bodyFontSize: manifest.bodyFontSize || '14px',
        lineHeight: manifest.lineHeight || '1.6',
        companyName: manifest.companyName || '',
        headingNumbering: Boolean(manifest.headingNumbering),
        headingNumberingMaxLevel: Number.isInteger(manifest.headingNumberingMaxLevel) ? manifest.headingNumberingMaxLevel : 3,
        printFooterEnabled: manifest.printFooterEnabled !== false,
        printFooterLabel: manifest.printFooterLabel || 'Page',
        printMargins: manifest.printMargins || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printContentBottomPadding: manifest.printContentBottomPadding || '16mm',
        headerFooterFontFamily: manifest.headerFooterFontFamily || (manifest.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"),
        headerFooterFontSize: manifest.headerFooterFontSize || '0.9em',
        googleFontsUrl: manifest.googleFontsUrl || '',
        bodyColor: manifest.bodyColor || '',
        headingColor: manifest.headingColor || '',
        linkColor: manifest.linkColor || '',
        headerFooterColor: manifest.headerFooterColor || '',
        coverStyle: manifest.coverStyle || '',
        accentColor: manifest.accentColor || '',
        accentSecondary: manifest.accentSecondary || '',
        accentTertiary: manifest.accentTertiary || '',
        coverBorderBottomWidth: manifest.coverBorderBottomWidth || '',
        titleRuleHeight: manifest.titleRuleHeight || '',
        titleRuleOpacity: manifest.titleRuleOpacity,
        titleSubheadingColor: manifest.titleSubheadingColor || '',
        logoHeight: manifest.logoHeight || '',
        sensitivityLevels: manifest.sensitivityLevels || {
          Public: { bg: '#e7f5ff', fg: '#0b7285' },
          Internal: { bg: '#f1f3f5', fg: '#343a40' },
          Confidential: { bg: '#fff3bf', fg: '#7f5f01' },
          Restricted: { bg: '#ffe3e3', fg: '#c92a2a' }
        },
        tableWordStyling: {
          enabled: tw.enabled !== false,
          borderColor: tw.borderColor || '#dee2e6',
          headerBg: tw.headerBg || '#f1f3f5',
          headerFg: tw.headerFg || headingColor || '',
          headerTextWeight: String(tw.headerTextWeight || '600'),
          bandEvenBg: tw.bandEvenBg || '#fafbfc',
          firstColumnBold: tw.firstColumnBold !== false,
          firstColumnBg: tw.firstColumnBg || '',
          cellPadding: tw.cellPadding || '8px 12px'
        }
      };
    }
  } catch (e) {
    console.warn(`Theme load failed for '${themeName}': ${e.message}`);
    // Fallback: if a known theme is requested but cannot be read (e.g., macOS Documents permissions),
    // return a built-in copy so the preview keeps working.
    if (themeName === 'comotion') {
      return {
        fontFamily: "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        logoSrc: "/themes/comotion/assets/comotion-logo-svg-colour.svg",
        logoAlt: "Comotion",
        titleFontSize: "36px",
        h1FontSize: "20px",
        h1FontWeight: "700",
        h2FontSize: "18px",
        h2FontWeight: "500",
        h3FontSize: "16px",
        h3FontWeight: "500",
        bodyFontSize: "14px",
        lineHeight: "1.7",
        companyName: "Comotion Business Solutions",
        coverStyle: "",
        accentColor: "#8CC240",
        accentSecondary: "#4DBFED",
        accentTertiary: "#D61C5E",
        bodyColor: "#1A3B66",
        headingColor: "#1A3B66",
        linkColor: "#1A3B66",
        headerFooterColor: "#1A3B66",
        googleFontsUrl: "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap",
        headingNumbering: true,
        headingNumberingMaxLevel: 3,
        printFooterEnabled: true,
        printFooterLabel: "Page",
        printMargins: { top: "22mm", right: "18mm", bottom: "22mm", left: "18mm" },
        printContentBottomPadding: "18mm",
        headerFooterFontFamily: "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        headerFooterFontSize: "0.9em",
        sensitivityLevels: {
          Public: { bg: "#f1f3f5", fg: "#495057" },
          Internal: { bg: "#f1f3f5", fg: "#495057" },
          Confidential: { bg: "#f1f3f5", fg: "#495057" },
          Restricted: { bg: "#f1f3f5", fg: "#495057" }
        },
        tableWordStyling: {
          enabled: true,
          borderColor: "#B4B4B4",
          headerBg: "#F0F0F0",
          headerFg: "#1A3B66",
          headerTextWeight: "700",
          bandEvenBg: "#FAFAFA",
          firstColumnBold: true,
          firstColumnBg: "",
          cellPadding: "8px 12px"
        }
      };
    }
    if (themeName === 'comotion-ai') {
      return {
        fontFamily: "'Inter', 'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        logoSrc: "/themes/comotion-ai/assets/comotion-ai-logo-svg.svg",
        logoAlt: "comotion.ai",
        logoCopyToWordHeight: "16px",
        titleFontSize: "36px",
        h1FontSize: "21px",
        h1FontWeight: "700",
        h2FontSize: "18px",
        h2FontWeight: "600",
        h3FontSize: "16px",
        h3FontWeight: "600",
        bodyFontSize: "14px",
        lineHeight: "1.7",
        companyName: "comotion.ai",
        headingNumbering: true,
        headingNumberingMaxLevel: 3,
        printFooterEnabled: true,
        printFooterLabel: "Page",
        printMargins: { top: "22mm", right: "18mm", bottom: "22mm", left: "18mm" },
        printContentBottomPadding: "18mm",
        headerFooterFontFamily: "'Inter', 'Roboto', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        headerFooterFontSize: "0.9em",
        googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        bodyColor: "#2D3748",
        headingColor: "#1A3B66",
        linkColor: "#4DBFED",
        headerFooterColor: "#1A3B66",
        coverStyle: "gradient",
        accentColor: "#8CC240",
        accentSecondary: "#4DBFED",
        accentTertiary: "#D61B5E",
        sensitivityLevels: {
          Public: { bg: "#EDF2F7", fg: "#1A3B66" },
          Internal: { bg: "#E2E8F0", fg: "#1A3B66" },
          Confidential: { bg: "#1A3B66", fg: "#FFFFFF" },
          Restricted: { bg: "#D61B5E", fg: "#FFFFFF" }
        },
        tableWordStyling: {
          enabled: true,
          borderColor: "#CBD5E0",
          headerBg: "#1A3B66",
          headerFg: "#FFFFFF",
          headerTextWeight: "600",
          bandEvenBg: "#F7FAFC",
          firstColumnBold: true,
          firstColumnBg: "",
          cellPadding: "8px 12px"
        }
      };
    }
    if (themeName === 'seedanalytics') {
      return {
        fontFamily: "'Plus Jakarta Sans', 'Sora', Arial, -apple-system, BlinkMacSystemFont, sans-serif",
        logoSrc: "/themes/seedanalytics/assets/seed-analytics-logo-svg-colour.svg",
        logoAlt: "Seed Analytics",
        titleFontSize: "28px",
        h1FontSize: "22px",
        h2FontSize: "18px",
        h3FontSize: "16px",
        bodyFontSize: "14px",
        lineHeight: "1.7",
        companyName: "Seed Analytics",
        headingNumbering: true,
        headingNumberingMaxLevel: 3,
        printFooterEnabled: true,
        printFooterLabel: "Page",
        printMargins: { top: "22mm", right: "18mm", bottom: "22mm", left: "18mm" },
        printContentBottomPadding: "18mm",
        headerFooterFontFamily: "'Plus Jakarta Sans', 'Sora', Arial, -apple-system, sans-serif",
        headerFooterFontSize: "0.9em",
        googleFontsUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,500;0,700;1,300;1,500&family=Sora:wght@400&display=swap",
        bodyColor: "#051F4C",
        headingColor: "#051F4C",
        linkColor: "#051F4C",
        headerFooterColor: "#051F4C",
        coverStyle: "",
        accentColor: "#B5AFA2",
        accentSecondary: "#88837A",
        accentTertiary: "#D3CFC7",
        coverBorderBottomWidth: "6px",
        titleRuleHeight: "5px",
        titleRuleOpacity: 0.5,
        titleSubheadingColor: "#5a6f86",
        sensitivityLevels: {
          Public: { bg: "#E6E6E6", fg: "#051F4C" },
          Internal: { bg: "#E6E6E6", fg: "#051F4C" },
          Confidential: { bg: "#E6E6E6", fg: "#051F4C" },
          Restricted: { bg: "#E6E6E6", fg: "#051F4C" }
        },
        tableWordStyling: {
          enabled: true,
          borderColor: "#D3CFC7",
          headerBg: "#E6E6E6",
          headerFg: "#051F4C",
          headerTextWeight: "600",
          bandEvenBg: "#F5F4F2",
          firstColumnBold: true,
          firstColumnBg: "",
          cellPadding: "8px 12px"
        }
      };
    }
  }
  return {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    logoSrc: '',
    logoAlt: '',
    titleFontSize: '32px',
    h1FontSize: '21px',
    h1FontWeight: '700',
    h2FontSize: '18px',
    h2FontWeight: '400',
    h3FontSize: '16px',
    h3FontWeight: '400',
    bodyFontSize: '14px',
    lineHeight: '1.6',
    companyName: '',
    coverStyle: '',
    accentColor: '',
    accentSecondary: '',
    accentTertiary: '',
    coverBorderBottomWidth: '',
    titleRuleHeight: '',
    titleRuleOpacity: '',
    titleSubheadingColor: '',
    logoHeight: '',
    headingNumbering: false,
    headingNumberingMaxLevel: 3,
    printFooterEnabled: true,
    printFooterLabel: 'Page',
    printMargins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    printContentBottomPadding: '16mm',
    headerFooterFontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    headerFooterFontSize: '0.9em',
    sensitivityLevels: {
      Public: { bg: '#e7f5ff', fg: '#0b7285' },
      Internal: { bg: '#f1f3f5', fg: '#343a40' },
      Confidential: { bg: '#fff3bf', fg: '#7f5f01' },
      Restricted: { bg: '#ffe3e3', fg: '#c92a2a' }
    },
    tableWordStyling: {
      enabled: true,
      borderColor: '#dee2e6',
      headerBg: '#f1f3f5',
      headerFg: '',
      headerTextWeight: '600',
      bandEvenBg: '#fafbfc',
      firstColumnBold: true,
      firstColumnBg: '',
      cellPadding: '8px 12px'
    }
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** CSS variables for presentation elements; updated client-side when theme changes */
function buildRootThemeVarsCss(t) {
  if (!t) t = {};
  const hc = t.headingColor || '#333';
  const a1 = t.accentColor || hc;
  const a2 = t.accentSecondary && String(t.accentSecondary).trim() ? t.accentSecondary : a1;
  const a3 = t.accentTertiary || hc;
  const body = t.bodyColor && String(t.bodyColor).trim() ? t.bodyColor : '#343a40';
  const link = t.linkColor || '#0066cc';
  return `:root {
            --theme-hc: ${hc};
            --theme-a1: ${a1};
            --theme-a2: ${a2};
            --theme-a3: ${a3};
            --theme-body: ${body};
            --theme-link: ${link};
        }`;
}

/** Rich presentation blocks — uses :root vars from buildRootThemeVarsCss */
function buildPresentationElementsCss() {
  return `
        /* Pull quote / default blockquote */
        #doc-content blockquote {
            margin: 1rem 0;
            padding: 0.75rem 1rem 0.75rem 1.15rem;
            border-left: 4px solid var(--theme-a1);
            background: #f8f9fa;
            font-size: 1.08em;
            font-style: italic;
            color: var(--theme-body);
        }
        #doc-content blockquote p:first-child { margin-top: 0; }
        #doc-content blockquote p:last-child { margin-bottom: 0; }

        /* GitHub-style callouts */
        #doc-content .callout {
            margin: 1rem 0;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            border-left: 4px solid;
            font-style: normal;
        }
        #doc-content .callout-title {
            font-weight: 700;
            font-size: 0.8em;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.4rem;
        }
        #doc-content .callout-body p:first-child { margin-top: 0; }
        #doc-content .callout-body p:last-child { margin-bottom: 0; }
        #doc-content .callout-note { border-left-color: #0969da; background: #ddf4ff; color: #1f2328; }
        #doc-content .callout-note .callout-title { color: #0969da; }
        #doc-content .callout-tip { border-left-color: #1a7f37; background: #dafbe1; color: #1f2328; }
        #doc-content .callout-tip .callout-title { color: #1a7f37; }
        #doc-content .callout-warning { border-left-color: #9a6700; background: #fff8c5; color: #1f2328; }
        #doc-content .callout-warning .callout-title { color: #9a6700; }
        #doc-content .callout-important { border-left-color: #a40e26; background: #ffebe9; color: #1f2328; }
        #doc-content .callout-important .callout-title { color: #a40e26; }
        #doc-content .callout-caution { border-left-color: #cf222e; background: #ffebe9; color: #1f2328; }
        #doc-content .callout-caution .callout-title { color: #cf222e; }

        /* Stat / KPI block (:::stat) */
        #doc-content .stat-block {
            margin: 1.25rem 0;
            padding: 1.25rem 1.5rem;
            border-radius: 8px;
            background: #fafbfc;
            border: 1px solid #e9ecef;
            font-style: normal;
        }
        #doc-content .stat-block > h1:first-of-type {
            font-size: 2.75rem;
            line-height: 1.05;
            margin: 0 0 0.35em;
            font-weight: 800;
            color: var(--theme-a1);
            border-bottom: none;
            padding-bottom: 0;
        }
        #doc-content .stat-block > h1:first-of-type + p {
            font-size: 1.05rem;
            margin: 0 0 0.85rem;
            font-weight: 500;
            color: var(--theme-body);
            opacity: 0.9;
        }
        #doc-content .stat-block ul {
            font-size: 0.88rem;
            margin: 0.4rem 0 0;
            padding-left: 1.25rem;
            opacity: 0.92;
        }
        #doc-content .stat-block li { margin: 0.2em 0; }
        #doc-content .stat-block h1::before,
        #doc-content .stat-block h2::before,
        #doc-content .stat-block h3::before {
            content: none !important;
            counter-increment: none !important;
        }

        /* Flow / arrow chain (:::flow) */
        #doc-content .flow-block {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.35rem 0.55rem;
            margin: 1.15rem 0;
        }
        #doc-content .flow-item {
            display: inline-flex;
            align-items: center;
            padding: 0.4em 0.95em;
            border-radius: 999px;
            border: 2px solid var(--theme-a1);
            background: #fff;
            font-weight: 600;
            font-size: 0.95em;
            color: var(--theme-hc);
        }
        #doc-content .flow-arrow {
            color: var(--theme-a1);
            font-size: 1.2em;
            font-weight: 700;
            user-select: none;
        }

        /* Two columns (:::columns … ||| …) */
        #doc-content .columns-block {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin: 1.15rem 0;
            align-items: start;
        }
        #doc-content .columns-left,
        #doc-content .columns-right { min-width: 0; }
        @media (max-width: 640px) {
            #doc-content .columns-block { grid-template-columns: 1fr; }
        }
        @media print {
            #doc-content .callout,
            #doc-content .stat-block,
            #doc-content .flow-block,
            #doc-content .columns-block { break-inside: avoid; }
        }
    `;
}

/**
 * Fenced custom blocks for presentations (processed before marked()).
 * Supports nested :::stat / :::columns via recursive preprocessing on inner markdown.
 */
function preprocessCustomBlocks(markdown) {
  if (!markdown) return markdown;
  let md = markdown;

  md = md.replace(/^:::stat\s*\n([\s\S]*?)^:::\s*$/gm, (_, inner) => {
    const innerHtml = marked(preprocessCustomBlocks(inner.trim()));
    return '\n<div class="stat-block">\n' + innerHtml + '\n</div>\n';
  });

  md = md.replace(/^:::flow\s*\n([\s\S]*?)^:::\s*$/gm, (_, inner) => {
    const lines = inner.split(/\r?\n/);
    const line = lines.map((l) => l.trim()).find((l) => l.length > 0) || '';
    const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    const items = parts
      .map((p, i) => {
        const arrow = i < parts.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : '';
        return '<span class="flow-item">' + escapeHtml(p) + '</span>' + arrow;
      })
      .join('');
    return '\n<div class="flow-block">' + items + '</div>\n';
  });

  md = md.replace(/^:::columns\s*\n([\s\S]*?)^:::\s*$/gm, (_, inner) => {
    const bits = inner.split(/\r?\n\|\|\|\r?\n/);
    const left = (bits[0] || '').trim();
    const right = (bits.slice(1).join('\n|||\n') || '').trim();
    const leftHtml = marked(preprocessCustomBlocks(left));
    const rightHtml = marked(preprocessCustomBlocks(right));
    return (
      '\n<div class="columns-block"><div class="columns-left">' +
      leftHtml +
      '</div><div class="columns-right">' +
      rightHtml +
      '</div></div>\n'
    );
  });

  return md;
}

function resolveSensitivityColors(theme, rawLevel) {
  if (!rawLevel || !theme || !theme.sensitivityLevels) {
    return { bg: '#f1f3f5', fg: '#343a40', key: '' };
  }
  const level = String(rawLevel).trim();
  const keys = Object.keys(theme.sensitivityLevels);
  const found = keys.find((k) => k.toLowerCase() === level.toLowerCase());
  if (found) {
    const c = theme.sensitivityLevels[found];
    return { bg: c.bg, fg: c.fg, key: found };
  }
  return { bg: '#f1f3f5', fg: '#343a40', key: '' };
}

function buildDocumentLayoutCss(theme) {
  const hc = theme.headingColor || '#333';
  const a1 = theme.accentColor || hc;
  const a2 = theme.accentSecondary || '';
  const a3 = theme.accentTertiary || hc;
  const hf = theme.headerFooterFontFamily || theme.fontFamily;
  const hfs = theme.headerFooterFontSize || '0.9em';
  const hfc = theme.headerFooterColor || hc;
  const coverBorderBottom = theme.coverBorderBottomWidth || '3px';
  const titleRuleH = theme.titleRuleHeight || '2px';
  const titleRuleOpacity =
    theme.titleRuleOpacity != null && theme.titleRuleOpacity !== ''
      ? Number(theme.titleRuleOpacity)
      : 0.25;
  const titleRuleOpacityStr = Number.isFinite(titleRuleOpacity) ? String(titleRuleOpacity) : '0.25';
  const gradTitleRuleH = theme.titleRuleHeight || '3px';
  if (theme.coverStyle === 'gradient' && a2) {
    const grad = `linear-gradient(90deg,${hc},${a2},${a3})`;
    return `
        .doc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-family: ${hf}; font-size: ${hfs}; color: ${hfc}; }
        .doc-cover { margin-bottom: 24px; padding-bottom: 14px; overflow: hidden; border-bottom: 4px solid ${a2}; border-image: ${grad} 1; }
        .doc-cover .doc-theme-brand { margin: 0; }
        .title-rule { background: ${grad}; height: ${gradTitleRuleH}; border-radius: 2px; margin-bottom: 24px; }
        #doc-content h1 { border-bottom: 2px solid ${a2}; padding-bottom: 4px; margin-top: 26px; }
        #doc-content h2 { border-left: 3px solid ${a1}; padding-left: 10px; }
        #doc-content h3 { border-left: 2px solid ${a3}; padding-left: 8px; }
    `;
  }
  return `
        .doc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-family: ${hf}; font-size: ${hfs}; color: ${hfc}; }
        .doc-cover { margin-bottom: 24px; padding-bottom: 14px; overflow: hidden; border-bottom: ${coverBorderBottom} solid ${hc}; }
        .doc-cover .doc-theme-brand { margin: 0; }
        .title-rule { background: ${hc}; height: ${titleRuleH}; opacity: ${titleRuleOpacityStr}; margin-bottom: 24px; }
        #doc-content h1 { border-bottom: 1.5px solid ${hc}; padding-bottom: 4px; margin-top: 26px; }
  `;
}

let theme = loadTheme(THEME);  // Default theme from environment variable

function getNumberingCss(theme) {
  if (!theme.headingNumbering) return '';
  const numColor =
    theme.coverStyle === 'gradient' && theme.accentSecondary
      ? theme.accentSecondary
      : theme.headingColor || 'inherit';
  return `
        #doc-content { counter-reset: h1; }
        #doc-content h1 { counter-reset: h2; }
        #doc-content h1::before { counter-increment: h1; content: counter(h1) '. '; color: ${numColor}; }
        #doc-content h2 { counter-reset: h3; }
        #doc-content h2::before { counter-increment: h2; content: counter(h1) '.' counter(h2) ' '; color: ${numColor}; }
        #doc-content h3::before { counter-increment: h3; content: counter(h1) '.' counter(h2) '.' counter(h3) ' '; color: ${numColor}; }
  `;
}

function extractTitleAndContent(markdown) {
  const lines = markdown.split(/\r?\n/);
  let title = '';
  let removeIndices = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // ATX top-level heading: "# Title" but not "##"
    if (/^#\s+/.test(line) && !/^##\s+/.test(line)) {
      title = line.replace(/^#\s+/, '').trim();
      removeIndices.push(i);
      if (lines[i + 1] !== undefined && lines[i + 1].trim() === '') {
        removeIndices.push(i + 1); // remove following blank line if present
      }
      break;
    }
    // Setext heading: Title on a line followed by "===="
    if (i + 1 < lines.length && /^=+\s*$/.test(lines[i + 1]) && line.trim() !== '') {
      title = line.trim();
      removeIndices.push(i, i + 1);
      if (lines[i + 2] !== undefined && lines[i + 2].trim() === '') {
        removeIndices.push(i + 2);
      }
      break;
    }
  }

  if (removeIndices.length > 0) {
    const toRemove = new Set(removeIndices);
    const kept = [];
    for (let i = 0; i < lines.length; i++) {
      if (!toRemove.has(i)) kept.push(lines[i]);
    }
    return { title, content: kept.join('\n') };
  }
  return { title: '', content: markdown };
}

function extractMetadata(markdown) {
  // YAML frontmatter: --- ... --- at top
  const meta = {};
  const fm = markdown.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---\s*[\r\n]?/);
  if (fm) {
    const body = fm[1];
    body.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
      if (m) {
        const key = m[1].trim().toLowerCase();
        const val = m[2].trim();
        if (key === 'sensitivity') meta.sensitivity = val;
        if (key === 'theme') meta.theme = val;
      }
    });
    return meta;
  }
  // Simple inline tag fallback: "Sensitivity: Level" or "Theme: themename" near top
  const firstLines = markdown.split(/\r?\n/).slice(0, 15);
  for (const line of firstLines) {
    const sensitivityMatch = line.match(/^sensitivity\s*:\s*(.+)$/i);
    if (sensitivityMatch) {
      meta.sensitivity = sensitivityMatch[1].trim();
    }
    const themeMatch = line.match(/^theme\s*:\s*(.+)$/i);
    if (themeMatch) {
      meta.theme = themeMatch[1].trim();
    }
  }
  return meta;
}

function stripSensitivityLines(markdown, meta) {
  if (!meta || !meta.sensitivity) return markdown;
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let removed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!removed && /^sensitivity\s*:\s*/i.test(line)) {
      removed = true;
      // also drop immediate following blank line
      if (i + 1 < lines.length && lines[i + 1].trim() === '') {
        i += 1;
      }
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

function stripThemeLines(markdown, meta) {
  if (!meta || !meta.theme) return markdown;
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let removed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!removed && /^theme\s*:\s*/i.test(line)) {
      removed = true;
      // also drop immediate following blank line
      if (i + 1 < lines.length && lines[i + 1].trim() === '') {
        i += 1;
      }
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

function stripFrontmatter(markdown) {
  const m = markdown.match(/^---\s*[\r\n]([\s\S]*?)[\r\n]---\s*[\r\n]?/);
  if (!m) return markdown;
  return markdown.slice(m[0].length);
}

function findTitleIndex(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#\s+/.test(line) && !/^##\s+/.test(line)) {
      return i;
    }
    if (i + 1 < lines.length && /^=+\s*$/.test(lines[i + 1]) && line.trim() !== '') {
      return i; // setext h1 line index
    }
  }
  return -1;
}

function stripInlineMetadataBeforeTitle(markdown, meta) {
  if (!meta) return markdown;
  const lines = markdown.split(/\r?\n/);
  const titleIdx = findTitleIndex(markdown);
  const limit = titleIdx === -1 ? Math.min(lines.length, 30) : titleIdx; // only search a small header area
  
  // Remove both sensitivity and theme lines
  let i = 0;
  while (i < limit) {
    if (/^sensitivity\s*:/i.test(lines[i]) || /^theme\s*:/i.test(lines[i])) {
      lines.splice(i, 1);
      // Also remove following blank line if present
      if (i < lines.length && lines[i].trim() === '') {
        lines.splice(i, 1);
      }
      // Don't increment i, check the same position again
      continue;
    }
    i++;
  }
  return lines.join('\n');
}

function buildPuppeteerFooterTemplate(theme) {
  const label = theme.printFooterLabel || 'Page';
  const companyName = theme.companyName || '';
  // Puppeteer requires complete HTML structure with absolute font sizes
  const fontSize = theme.headerFooterFontSize || '10px';
  // Convert em to px if needed
  const absoluteFontSize = fontSize.includes('em') ? '10px' : fontSize;
  
  return `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div style="font-size: ${absoluteFontSize}; font-family: ${theme.headerFooterFontFamily}; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; color: ${theme.headerFooterColor || '#6c757d'};">
          <div style="text-align: left;">${companyName}</div>
          <div style="text-align: right;">${label} <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      </body>
    </html>`;
}

function buildPuppeteerHeaderTemplate(theme, meta, title) {
  const hasSensitivity = !!(meta && meta.sensitivity);
  const level = hasSensitivity ? String(meta.sensitivity).trim() : '';
  const sensResolved = hasSensitivity ? resolveSensitivityColors(theme, level) : null;
  const colors = hasSensitivity
    ? { bg: sensResolved.bg, fg: sensResolved.fg }
    : { bg: 'transparent', fg: theme.headerFooterColor || '#6c757d' };
  const safeTitle = (title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headerColor = theme.headerFooterColor || '#495057';
  
  // Convert em to px if needed
  const fontSize = theme.headerFooterFontSize || '10px';
  const absoluteFontSize = fontSize.includes('em') ? '10px' : fontSize;
  
  const badge = hasSensitivity
    ? `<span style="display: inline-block; font-weight: 700; padding: 3px 10px; border-radius: 3px; letter-spacing: 1px; background: ${colors.bg}; color: ${colors.fg}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${escapeHtml(level.toUpperCase())}</span>`
    : '';
  const titleSpan = safeTitle ? `<span style="color: ${headerColor}; margin-left: 8px;">${safeTitle}</span>` : '';
  
  // Always return a complete HTML structure
  return `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div style="font-size: ${absoluteFontSize}; font-family: ${theme.headerFooterFontFamily}; width: 100%; padding-left: 20px; color: ${headerColor};">
          ${badge}${titleSpan}
        </div>
      </body>
    </html>`;
}

function normalizeMm(value, minMm) {
  const s = String(value || '').trim();
  if (/mm$/i.test(s)) {
    const n = parseFloat(s);
    if (isFinite(n)) return Math.max(n, minMm) + 'mm';
  }
  // Fallback: enforce minimum in mm
  return Math.max(minMm, 0) + 'mm';
}

// Check if MARKDOWN_FILE is provided
if (!MARKDOWN_FILE) {
  console.error('\n❌ Error: No markdown file specified!\n');
  console.error('Please set the MARKDOWN_FILE environment variable:');
  console.error('  MARKDOWN_FILE=yourfile.md node server.js\n');
  console.error('Or use the launcher script:');
  console.error('  ./preview.sh yourfile.md\n');
  process.exit(1);
}

// Serve static files
app.use(express.static('public'));

// Optional: PDF export route using puppeteer if available
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (_) {
  puppeteer = null;
}

if (!puppeteer) {
  console.log('ℹ️  PDF export disabled: install Puppeteer to enable (npm install puppeteer)');
}

app.get('/export/pdf', async (req, res) => {
  if (!puppeteer) {
    res.status(501).send('PDF export requires puppeteer. Install it with: npm install puppeteer');
    return;
  }
  try {
    // Extract current document metadata for header template (e.g., sensitivity)
    let meta = {};
    let pdfTheme = theme;  // Default to current theme
    try {
      const md = fs.readFileSync(MARKDOWN_FILE, 'utf8');
      meta = extractMetadata(md) || {};
      // Use document theme if specified
      if (meta.theme) {
        pdfTheme = loadTheme(meta.theme);
      }
    } catch (e) {
      console.warn('Could not read markdown for metadata:', e.message);
    }
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const url = `http://localhost:${CURRENT_PORT}/?pdf=1`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.emulateMediaType('print');
    
    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : null);
    
    // Let layout fully settle across two frames
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    
    // Additional wait to ensure everything is rendered
    await new Promise((r) => setTimeout(r, 500));
    const marginTop = normalizeMm(pdfTheme.printMargins.top, 15);
    const marginRight = normalizeMm(pdfTheme.printMargins.right, 15);
    const marginBottom = normalizeMm(pdfTheme.printMargins.bottom, 15);
    const marginLeft = normalizeMm(pdfTheme.printMargins.left, 15);
    const headerHtml = buildPuppeteerHeaderTemplate(pdfTheme, meta, (extractTitleAndContent(fs.readFileSync(MARKDOWN_FILE, 'utf8')) || {}).title);
    const footerHtml = buildPuppeteerFooterTemplate(pdfTheme);
    const pdf = await page.pdf({
      printBackground: true,
      margin: { 
        top: marginTop, 
        right: marginRight, 
        bottom: marginBottom, 
        left: marginLeft 
      },
      displayHeaderFooter: true,
      headerTemplate: headerHtml,
      footerTemplate: footerHtml,
      format: 'A4',
      preferCSSPageSize: false,  // Changed to false as this can interfere with headers/footers
      scale: 1.0  // Ensure scale is set to 1.0
    });
    await browser.close();
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    if (pdf && typeof pdf.length === 'number') {
      res.setHeader('Content-Length', String(pdf.length));
    }
    res.end(pdf);
  } catch (e) {
    console.error('PDF export failed:', e);
    res.status(500).send('Failed to generate PDF: ' + e.message);
  }
});

// Diagnostic endpoints to isolate header/footer rendering
app.get('/export/pdf-header-only', async (req, res) => {
  if (!puppeteer) {
    res.status(501).send('PDF export requires puppeteer. Install it with: npm install puppeteer');
    return;
  }
  try {
    let meta = {};
    let title = '';
    try {
      const md = fs.readFileSync(MARKDOWN_FILE, 'utf8');
      meta = extractMetadata(md) || {};
      title = (extractTitleAndContent(md) || {}).title || '';
    } catch (e) {}
    const browser = await puppeteer.launch({ headless: true, executablePath: (puppeteer.executablePath && puppeteer.executablePath()) || undefined, args: ['--no-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    const content = '<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:22mm 18mm;}body{font-family:sans-serif;}</style></head><body><div>' + 'Test '.repeat(5000) + '</div></body></html>';
    await page.setContent(content, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : null);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const headerHtml = buildPuppeteerHeaderTemplate(theme, meta, title);
    const pdf = await page.pdf({
      printBackground: true,
      margin: { top: '22mm', right: '18mm', bottom: '22mm', left: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: headerHtml || '<div>Header</div>',
      footerTemplate: '<div></div>',
      format: 'A4'
    });
    await browser.close();
    res.status(200).setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="header-only.pdf"');
    if (pdf && typeof pdf.length === 'number') res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  } catch (e) {
    console.error('Header-only PDF export failed:', e);
    res.status(500).send('Header-only PDF failed: ' + e.message);
  }
});

app.get('/export/pdf-footer-only', async (req, res) => {
  if (!puppeteer) {
    res.status(501).send('PDF export requires puppeteer. Install it with: npm install puppeteer');
    return;
  }
  try {
    const browser = await puppeteer.launch({ headless: true, executablePath: (puppeteer.executablePath && puppeteer.executablePath()) || undefined, args: ['--no-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    const content = '<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:22mm 18mm;}body{font-family:sans-serif;}</style></head><body><div>' + 'Test '.repeat(5000) + '</div></body></html>';
    await page.setContent(content, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : null);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const footerHtml = buildPuppeteerFooterTemplate(theme);
    const pdf = await page.pdf({
      printBackground: true,
      margin: { top: '22mm', right: '18mm', bottom: '22mm', left: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: footerHtml || '<div style="font-size:10px;width:100%;text-align:right;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
      format: 'A4'
    });
    await browser.close();
    res.status(200).setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="footer-only.pdf"');
    if (pdf && typeof pdf.length === 'number') res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  } catch (e) {
    console.error('Footer-only PDF export failed:', e);
    res.status(500).send('Footer-only PDF failed: ' + e.message);
  }
});

// Main route
app.get('/', (req, res) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Live Preview</title>
    ${theme.googleFontsUrl ? `<link href="${theme.googleFontsUrl}" rel="stylesheet">` : ''}
    <style>
        ${buildRootThemeVarsCss(theme)}
        ${buildPresentationElementsCss()}
        body {
            font-family: ${theme.fontFamily};
            font-size: ${theme.bodyFontSize};
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: ${theme.lineHeight};
            background-color: #fff;
            ${theme.bodyColor ? `color: ${theme.bodyColor};` : ''}
        }
        .header {
            background: #f8f9fa;
            padding: 6px 12px;
            border-radius: 5px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        .status {
            color: #28a745;
            font-weight: bold;
            font-size: 12px;
        }
        .content { padding: 0; border: none; background: #fff; }
        ${buildDocumentLayoutCss(theme)}
        .doc-theme-brand { display: ${theme.logoSrc ? 'block' : 'none'}; }
        .doc-theme-logo { height: ${theme.logoHeight || '44px'}; }
        .doc-title { font-family: ${theme.fontFamily}; font-size: ${theme.titleFontSize}; font-weight: 700; margin: 24px 0 6px; line-height: 1.2; clear: both; ${theme.headingColor ? `color: ${theme.headingColor};` : ''} }
        ${theme.titleSubheadingColor ? `#doc-content > p:first-of-type { color: ${theme.titleSubheadingColor}; }` : ''}
        #doc-content h1 { font-family: ${theme.fontFamily}; font-size: ${theme.h1FontSize}; font-weight: ${theme.h1FontWeight || '700'}; ${theme.headingColor ? `color: ${theme.headingColor};` : ''} }
        #doc-content h2 { font-family: ${theme.fontFamily}; font-size: ${theme.h2FontSize}; font-weight: ${theme.h2FontWeight || '400'}; ${theme.headingColor ? `color: ${theme.headingColor};` : ''} }
        #doc-content h3 { font-family: ${theme.fontFamily}; font-size: ${theme.h3FontSize}; font-weight: ${theme.h3FontWeight || '400'}; ${theme.headingColor ? `color: ${theme.headingColor};` : ''} }
        #doc-content { border: 1px solid #e9ecef; border-radius: 5px; padding: 20px; background: white; ${theme.bodyColor ? `color: ${theme.bodyColor};` : ''} }
        .sensitivity-badge { display: none; font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 999px; width: fit-content; }
        .sens-badge { font-weight: 700; padding: 3px 10px; border-radius: 3px; letter-spacing: 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        /* Sensitivity level colors from theme */
        ${Object.entries(theme.sensitivityLevels).map(([level, colors]) => {
          const safe = level.replace(/[^A-Za-z0-9_-]/g, '');
          return `.sensitivity-${safe} { background: ${colors.bg}; color: ${colors.fg}; }`;
        }).join('\n        ')}
        .print-footer { display: none; }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        /* Professional table styling (theme-driven when available) */
        #doc-content table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin: 16px 0;
        }
        #doc-content th,
        #doc-content td {
            border: 1px solid ${(theme.tableWordStyling && theme.tableWordStyling.borderColor) ? theme.tableWordStyling.borderColor : '#dee2e6'};
            padding: ${(theme.tableWordStyling && theme.tableWordStyling.cellPadding) ? theme.tableWordStyling.cellPadding : '8px 12px'};
            text-align: left;
            vertical-align: top;
        }
        #doc-content thead th {
            background: ${(theme.tableWordStyling && theme.tableWordStyling.headerBg) ? theme.tableWordStyling.headerBg : '#f1f3f5'};
            color: ${(theme.tableWordStyling && theme.tableWordStyling.headerFg) ? theme.tableWordStyling.headerFg : (theme.headingColor || 'inherit')};
            font-weight: ${(theme.tableWordStyling && theme.tableWordStyling.headerTextWeight) ? theme.tableWordStyling.headerTextWeight : '600'};
        }
        #doc-content tbody tr:nth-child(even) {
            background: ${(theme.tableWordStyling && theme.tableWordStyling.bandEvenBg) ? theme.tableWordStyling.bandEvenBg : '#fafbfc'};
        }
        #doc-content tbody tr:hover {
            background: #f6f8fa;
        }
        ${getNumberingCss(theme)}
        /* Smooth scrolling for anchor links */
        html {
            color-scheme: light;
            scroll-behavior: smooth;
        }
        /* Ensure headings with IDs are scrollable targets */
        #doc-content h1[id],
        #doc-content h2[id],
        #doc-content h3[id],
        #doc-content h4[id],
        #doc-content h5[id],
        #doc-content h6[id] {
            scroll-margin-top: 20px;
        }
        /* Style anchor links */
        #doc-content a[href^="#"] {
            color: ${theme.linkColor || '#0066cc'};
            text-decoration: none;
        }
        #doc-content a[href^="#"]:hover {
            text-decoration: underline;
        }
        #doc-content a:not([href^="#"]) {
            color: ${theme.linkColor || '#0066cc'};
            text-decoration: none;
        }
        #doc-content a:not([href^="#"]):hover {
            text-decoration: underline;
        }
        @media print {
            @page { margin: ${theme.printMargins.top} ${theme.printMargins.right} ${theme.printMargins.bottom} ${theme.printMargins.left}; }
            .header { display: none !important; }
            body { margin: 0; padding: 0; background: #fff; }
            #doc-content { border: none; padding: 0 0 ${theme.printContentBottomPadding} 0; }
            .doc-cover { margin-bottom: 16px; }
            .doc-theme-brand { margin: 0; }
            .doc-theme-logo { height: 40px; }
            .doc-title { margin: 24px 0 6px; }
            .doc-header { break-after: avoid; }
            /* Always hide in-page footer during browser printing; use Export PDF for accurate numbers */
            .print-footer { display: none !important; }
            /* Puppeteer uses its own header/footer; in-page footer remains hidden */
            /* Show sensitivity chip at the top of each page from page 2 */
            .header { display: none !important; }
            .doc-cover { break-after: avoid; }
            .doc-theme-brand { break-after: avoid; }
            .doc-title { break-after: avoid; }
            .title-rule { break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="font-size:16px;margin:0;">📄 Markdown Live Preview</h1>
        <div style="display:flex; gap:8px; align-items:center;">
          <button id="copy-word" style="font-size:12px; padding:4px 8px;">📋 Copy to Word</button>
          ${puppeteer ? '<button id="export-pdf" style="font-size:12px; padding:4px 8px;">📄 Export PDF</button>' : ''}
          <div class="status" id="status">● Connected</div>
        </div>
    </div>
    <div id="error" class="error" style="display: none;"></div>
    <div class="content">
        <div class="doc-header" id="doc-header">
            <span id="doc-header-company">${escapeHtml(theme.companyName || '')}</span>
            <span id="doc-sens-badge" class="sens-badge" style="display:none;" aria-live="polite"></span>
        </div>
        <div class="doc-cover">
            <div class="doc-theme-brand">
                <img src="${theme.logoSrc}" alt="${theme.logoAlt || 'Logo'}" class="doc-theme-logo" />
            </div>
        </div>
        <div class="doc-title" id="doc-title" style="display:none;"></div>
        <div class="title-rule" aria-hidden="true"></div>
        <div id="doc-content">Loading...</div>
    </div>
    ${theme.printFooterEnabled ? `<div class="print-footer"><span class="footer-label">${theme.printFooterLabel} </span><span class="page-numbers"></span></div>` : ''}

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const docContentDiv = document.getElementById('doc-content');
        const docTitleDiv = document.getElementById('doc-title');
        const docHeaderCompanyEl = document.getElementById('doc-header-company');
        const docSensBadgeEl = document.getElementById('doc-sens-badge');
        const statusDiv = document.getElementById('status');
        const errorDiv = document.getElementById('error');
        const exportBtn = document.getElementById('export-pdf');
        const copyWordBtn = document.getElementById('copy-word');
        const params = new URLSearchParams(window.location.search);
        const tableWordStyling = ${JSON.stringify((() => {
          try { return (theme && theme.tableWordStyling) ? theme.tableWordStyling : {}; } catch (_) { return {}; }
        })())};
        const initialTheme = ${JSON.stringify((() => {
          try { return theme || {}; } catch (_) { return {}; }
        })())};
        let currentTheme = initialTheme;
        if (params.get('pdf') === '1') {
          document.body.classList.add('pdf-mode');
        }

        function updateDocHeader(meta, t) {
            t = t || {};
            if (docHeaderCompanyEl) docHeaderCompanyEl.textContent = t.companyName || '';
            if (docSensBadgeEl) {
                const lev = meta && meta.sensitivity ? String(meta.sensitivity).trim() : '';
                if (lev) {
                    const keys = Object.keys(t.sensitivityLevels || {});
                    const found = keys.find(function (k) { return k.toLowerCase() === lev.toLowerCase(); });
                    let col = { bg: '#f1f3f5', fg: '#343a40' };
                    if (found && t.sensitivityLevels[found]) col = t.sensitivityLevels[found];
                    docSensBadgeEl.textContent = lev.toUpperCase();
                    docSensBadgeEl.style.display = 'inline-block';
                    docSensBadgeEl.style.background = col.bg;
                    docSensBadgeEl.style.color = col.fg;
                } else {
                    docSensBadgeEl.style.display = 'none';
                    docSensBadgeEl.textContent = '';
                    docSensBadgeEl.style.background = '';
                    docSensBadgeEl.style.color = '';
                }
            }
        }

        socket.on('markdown-update', (payload) => {
            if (typeof payload === 'string') {
                docContentDiv.innerHTML = payload;
                docTitleDiv.style.display = 'none';
                document.title = 'Markdown Live Preview';
                updateDocHeader({}, currentTheme);
            } else {
                const { html, title, meta, theme: remoteTheme } = payload || {};
                docContentDiv.innerHTML = html || '';
                if (title && title.trim().length > 0) {
                    docTitleDiv.textContent = title;
                    docTitleDiv.style.display = 'block';
                    document.title = (title + ' — Markdown Live Preview');
                } else {
                    docTitleDiv.style.display = 'none';
                    document.title = 'Markdown Live Preview';
                }
                if (remoteTheme && typeof remoteTheme === 'object') {
                  applyDynamicTheme(remoteTheme);
                  currentTheme = remoteTheme;
                  const logoImg = document.querySelector('.doc-theme-logo');
                  if (logoImg && remoteTheme.logoSrc) {
                    logoImg.src = remoteTheme.logoSrc;
                    logoImg.alt = remoteTheme.logoAlt || 'Logo';
                  }
                  const brand = document.querySelector('.doc-theme-brand');
                  if (brand) brand.style.display = remoteTheme.logoSrc ? 'block' : 'none';
                }
                updateDocHeader(meta || {}, currentTheme);
            }
            errorDiv.style.display = 'none';
        });

        socket.on('error', (error) => {
            errorDiv.textContent = error;
            errorDiv.style.display = 'block';
        });

        socket.on('connect', () => {
            statusDiv.textContent = '● Connected';
            statusDiv.style.color = '#28a745';
        });

        socket.on('disconnect', () => {
            statusDiv.textContent = '● Disconnected';
            statusDiv.style.color = '#dc3545';
        });

        // Inject or update a <style id="dynamic-theme"> block with theme-dependent CSS
        function ensureDynamicStyleEl() {
          let el = document.getElementById('dynamic-theme');
          if (!el) {
            el = document.createElement('style');
            el.id = 'dynamic-theme';
            document.head.appendChild(el);
          }
          return el;
        }
        function documentLayoutCssFromTheme(t) {
          if (!t) return '';
          const hc = t.headingColor || '#333';
          const a1 = t.accentColor || hc;
          const a2 = t.accentSecondary || '';
          const a3 = t.accentTertiary || hc;
          const hf = t.headerFooterFontFamily || t.fontFamily;
          const hfs = t.headerFooterFontSize || '0.9em';
          const hfc = t.headerFooterColor || hc;
          const coverBorderBottom = t.coverBorderBottomWidth || '3px';
          const titleRuleH = t.titleRuleHeight || '2px';
          let titleRuleOpacityStr = '0.25';
          if (t.titleRuleOpacity != null && t.titleRuleOpacity !== '') {
            const n = Number(t.titleRuleOpacity);
            titleRuleOpacityStr = Number.isFinite(n) ? String(n) : '0.25';
          }
          const gradTitleRuleH = t.titleRuleHeight || '3px';
          if (t.coverStyle === 'gradient' && a2) {
            const grad = 'linear-gradient(90deg,' + hc + ',' + a2 + ',' + a3 + ')';
            return '.doc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-family:' + hf + ';font-size:' + hfs + ';color:' + hfc + ';}' +
              '.doc-cover{margin-bottom:24px;padding-bottom:14px;overflow:hidden;border-bottom:4px solid ' + a2 + ';border-image:' + grad + ' 1;}' +
              '.doc-cover .doc-theme-brand{margin:0;}' +
              '.title-rule{background:' + grad + ';height:' + gradTitleRuleH + ';border-radius:2px;margin-bottom:24px;}' +
              '#doc-content h1{border-bottom:2px solid ' + a2 + ';padding-bottom:4px;margin-top:26px;}' +
              '#doc-content h2{border-left:3px solid ' + a1 + ';padding-left:10px;}' +
              '#doc-content h3{border-left:2px solid ' + a3 + ';padding-left:8px;}';
          }
          return '.doc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-family:' + hf + ';font-size:' + hfs + ';color:' + hfc + ';}' +
            '.doc-cover{margin-bottom:24px;padding-bottom:14px;overflow:hidden;border-bottom:' + coverBorderBottom + ' solid ' + hc + ';}' +
            '.doc-cover .doc-theme-brand{margin:0;}' +
            '.title-rule{background:' + hc + ';height:' + titleRuleH + ';opacity:' + titleRuleOpacityStr + ';margin-bottom:24px;}' +
            '#doc-content h1{border-bottom:1.5px solid ' + hc + ';padding-bottom:4px;margin-top:26px;}';
        }
        function numberingCssFromTheme(t) {
          if (!t || !t.headingNumbering) {
            return '#doc-content h1,#doc-content h2,#doc-content h3{counter-reset:none !important;}' +
              '#doc-content h1::before,#doc-content h2::before,#doc-content h3::before{content:none !important;counter-increment:none !important;}';
          }
          const numColor = (t.coverStyle === 'gradient' && t.accentSecondary) ? t.accentSecondary : (t.headingColor || 'inherit');
          return '#doc-content{counter-reset:h1;}#doc-content h1{counter-reset:h2;}#doc-content h1::before{counter-increment:h1;content:counter(h1) \". \";color:' + numColor + ';}' +
            '#doc-content h2{counter-reset:h3;}#doc-content h2::before{counter-increment:h2;content:counter(h1) \".\" counter(h2) \" \";color:' + numColor + ';}' +
            '#doc-content h3::before{counter-increment:h3;content:counter(h1) \".\" counter(h2) \".\" counter(h3) \" \";color:' + numColor + ';}';
        }
        function tableHeaderCssFromTheme(t) {
          if (!t || !t.tableWordStyling) return '';
          const tw = t.tableWordStyling;
          const fg = tw.headerFg || t.headingColor || 'inherit';
          const bg = tw.headerBg || '#f1f3f5';
          const fw = tw.headerTextWeight || '600';
          return '#doc-content thead th{color:' + fg + ' !important;background:' + bg + ' !important;font-weight:' + fw + ' !important;}';
        }
        function linkCssFromTheme(t) {
          if (!t || !t.linkColor) return '';
          const c = t.linkColor;
          return '#doc-content a[href^=\"#\"]{color:' + c + ';text-decoration:none;}#doc-content a[href^=\"#\"]:hover{text-decoration:underline;}' +
            '#doc-content a:not([href^=\"#\"]){color:' + c + ';text-decoration:none;}#doc-content a:not([href^=\"#\"]):hover{text-decoration:underline;}';
        }
        function rootVarsCssFromTheme(t) {
          if (!t) t = {};
          const hc = t.headingColor || '#333';
          const a1 = t.accentColor || hc;
          const a2 = (t.accentSecondary && String(t.accentSecondary).trim()) ? t.accentSecondary : a1;
          const a3 = t.accentTertiary || hc;
          const body = (t.bodyColor && String(t.bodyColor).trim()) ? t.bodyColor : '#343a40';
          const link = t.linkColor || '#0066cc';
          return ':root{--theme-hc:' + hc + ';--theme-a1:' + a1 + ';--theme-a2:' + a2 + ';--theme-a3:' + a3 + ';--theme-body:' + body + ';--theme-link:' + link + ';}';
        }
        function buildThemeCss(t) {
          if (!t) return '';
          const bodyCol = t.bodyColor ? 'color:' + t.bodyColor + ';' : '';
          const titleCol = t.headingColor ? 'color:' + t.headingColor + ';' : '';
          const h1c = t.headingColor ? 'color:' + t.headingColor + ';' : '';
          const subCol = t.titleSubheadingColor || '';
          const subRule = subCol ? '#doc-content > p:first-of-type{color:' + subCol + ';}' : '';
          const logoH = t.logoHeight || '';
          const logoRule = logoH ? '.doc-theme-logo{height:' + logoH + ';}' : '';
          return [
            rootVarsCssFromTheme(t),
            'html{color-scheme:light;}',
            'body{font-family:' + (t.fontFamily || 'sans-serif') + ';font-size:' + (t.bodyFontSize || '14px') + ';line-height:' + (t.lineHeight || '1.6') + ';background-color:#fff;' + bodyCol + '}',
            '.content{background-color:#fff;}',
            '#doc-content{' + bodyCol + 'background-color:#fff;}',
            '.doc-title{font-family:' + (t.fontFamily || 'sans-serif') + ';font-size:' + (t.titleFontSize || '32px') + ';font-weight:700;' + titleCol + '}',
            '#doc-content h1{font-family:' + (t.fontFamily || 'sans-serif') + ';font-size:' + (t.h1FontSize || '21px') + ';font-weight:' + (t.h1FontWeight || '700') + ';' + h1c + '}',
            '#doc-content h2{font-family:' + (t.fontFamily || 'sans-serif') + ';font-size:' + (t.h2FontSize || '18px') + ';font-weight:' + (t.h2FontWeight || '400') + ';' + h1c + '}',
            '#doc-content h3{font-family:' + (t.fontFamily || 'sans-serif') + ';font-size:' + (t.h3FontSize || '16px') + ';font-weight:' + (t.h3FontWeight || '400') + ';' + h1c + '}',
            documentLayoutCssFromTheme(t),
            numberingCssFromTheme(t),
            tableHeaderCssFromTheme(t),
            linkCssFromTheme(t),
            subRule,
            logoRule
          ].join('\\n');
        }
        function applyDynamicTheme(t) {
          const el = ensureDynamicStyleEl();
          el.textContent = buildThemeCss(t);
        }
        // Initialize with server-side theme at load
        try { applyDynamicTheme(initialTheme); } catch (_) {}

        if (exportBtn) {
          exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            try {
              const res = await fetch('/export/pdf');
              if (!res.ok) {
                let msg = 'Failed to generate PDF';
                try { msg = await res.text(); } catch (_) {}
                throw new Error(msg || ('HTTP ' + res.status));
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'document.pdf';
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              errorDiv.style.display = 'none';
            } catch (e) {
              errorDiv.textContent = 'PDF export failed: ' + (e && e.message ? e.message : 'Unknown error');
              errorDiv.style.display = 'block';
            } finally {
              exportBtn.disabled = false;
            }
          });
        }
        
        if (copyWordBtn) {
          copyWordBtn.addEventListener('click', async () => {
            copyWordBtn.disabled = true;
            try {
              // Get theme font information from body
              const bodyStyle = window.getComputedStyle(document.body);
              const themeFontFamily = bodyStyle.fontFamily;
              const themeFontSize = bodyStyle.fontSize;
              const themeLineHeight = bodyStyle.lineHeight;

              // Helper function to convert image to base64
              const imageToBase64 = async (imgElement) => {
                return new Promise((resolve, reject) => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');

                  const img = new Image();
                  img.crossOrigin = 'anonymous';

                  img.onload = () => {
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    ctx.drawImage(img, 0, 0);
                    try {
                      const dataURL = canvas.toDataURL('image/png');
                      resolve(dataURL);
                    } catch (e) {
                      reject(e);
                    }
                  };

                  img.onerror = reject;
                  img.src = imgElement.src;
                });
              };

              // Get the complete HTML content with title and logo (order matches skill Word export)
              let htmlContent = '';
              const tWord = currentTheme || {};
              const hfWord = tWord.headerFooterFontFamily || tWord.fontFamily || themeFontFamily;
              const hfsWord = tWord.headerFooterFontSize || '0.9em';
              const hfcWord = tWord.headerFooterColor || tWord.headingColor || '#333';
              function escapeWordHtml(s) {
                return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              }
              if (docHeaderCompanyEl && (docHeaderCompanyEl.textContent || (docSensBadgeEl && docSensBadgeEl.style.display !== 'none' && docSensBadgeEl.textContent))) {
                let row = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-family:' + hfWord + ';font-size:' + hfsWord + ';color:' + hfcWord + ';">';
                row += '<span>' + escapeWordHtml(docHeaderCompanyEl.textContent) + '</span>';
                if (docSensBadgeEl && docSensBadgeEl.style.display !== 'none' && docSensBadgeEl.textContent) {
                  row += '<span style="font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:1px;background:' + docSensBadgeEl.style.backgroundColor + ';color:' + docSensBadgeEl.style.color + ';">' + escapeWordHtml(docSensBadgeEl.textContent) + '</span>';
                }
                row += '</div>';
                htmlContent += row;
              }

              // Add logo if present - convert to base64 for Word compatibility
              const logoElement = document.querySelector('.doc-theme-logo');
              if (logoElement && logoElement.src && logoElement.offsetParent !== null) {
                try {
                  const base64Logo = await imageToBase64(logoElement);
                  const logoHeight = (currentTheme && currentTheme.logoCopyToWordHeight) ? currentTheme.logoCopyToWordHeight : '22px';
                  htmlContent += '<div style="margin-bottom: 24px; padding-bottom: 14px; overflow: hidden;"><img src="' + base64Logo + '" style="height: ' + logoHeight + '; display: block;" alt="Logo" /></div>';
                } catch (err) {
                  console.warn('Logo conversion failed:', err);
                  // Skip logo if conversion fails rather than using potentially broken URL
                }
              }

              // Add title if present
              const titleElement = document.getElementById('doc-title');
              if (titleElement && titleElement.style.display !== 'none') {
                const titleStyle = window.getComputedStyle(titleElement);
                const titleFont = titleStyle.fontFamily;
                const titleLineHeight = titleStyle.lineHeight || '1.2';
                htmlContent += '<h1 style="font-family: ' + titleFont + ' !important; font-size: ' + titleStyle.fontSize + ' !important; line-height: ' + titleLineHeight + ' !important; font-weight: 700; margin: 24px 0 6px; padding: 0; clear: both;">' + escapeWordHtml(titleElement.textContent) + '</h1>';
                const hcW = tWord.headingColor || '#333';
                const a2W = tWord.accentSecondary || '';
                const a3W = tWord.accentTertiary || hcW;
                if (tWord.coverStyle === 'gradient' && a2W) {
                  htmlContent += '<div style="height:3px;border-radius:2px;margin:0 0 24px 0;background:linear-gradient(90deg,' + hcW + ',' + a2W + ',' + a3W + ');"></div>';
                } else if (hcW) {
                  htmlContent += '<div style="height:2px;opacity:0.25;margin:0 0 24px 0;background:' + hcW + ';"></div>';
                }
              }

              // Add main content with proper font styling
              const tempContent = document.createElement('div');
              tempContent.innerHTML = docContentDiv.innerHTML;

              // Add heading numbering for Word (Word ignores CSS counters)
              const addWordHeadingNumbering = (root, themeCfg) => {
                const cfg = themeCfg || {};
                const enabled = (cfg.copyWordHeadingNumbering !== false) && (cfg.headingNumbering !== false);
                if (!enabled) return;
                const maxLevel = Number.isInteger(cfg.headingNumberingMaxLevel) ? cfg.headingNumberingMaxLevel : 3;
                const counters = [0,0,0,0,0,0,0]; // indices 1..6
                // Remove existing numbering spans to avoid duplication
                root.querySelectorAll('span[data-word-numbering]').forEach((n) => n.remove());
                // Number headings in document order
                const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
                headings.forEach((h) => {
                  const level = parseInt(h.tagName.substring(1), 10);
                  if (!Number.isInteger(level) || level < 1 || level > 6) return;
                  if (level > maxLevel) return;
                  // Increment current level; reset deeper levels
                  counters[level] += 1;
                  for (let i = level + 1; i <= 6; i++) counters[i] = 0;
                  // Build numbering text like "1.2.3 "
                  const parts = [];
                  for (let i = 1; i <= level; i++) {
                    if (counters[i] > 0) parts.push(String(counters[i]));
                  }
                  if (parts.length === 0) return;
                  const numText = parts.join('.') + ' ';
                  const span = document.createElement('span');
                  span.setAttribute('data-word-numbering', '1');
                  span.textContent = numText;
                  h.insertBefore(span, h.firstChild);
                });
              };

              // Apply Word-friendly table styling inline if enabled by theme
              const applyWordTableStyling = (root, cfg) => {
                if (!cfg || cfg.enabled === false) return;
                const borderColor = cfg.borderColor || '#dee2e6';
                const headerBg = cfg.headerBg || '#f1f3f5';
                const headerFg = cfg.headerFg || '';
                const headerTextWeight = cfg.headerTextWeight || '600';
                const bandEvenBg = cfg.bandEvenBg || '#fafbfc';
                const firstColumnBold = cfg.firstColumnBold !== false;
                const firstColumnBg = cfg.firstColumnBg || '';
                const cellPadding = cfg.cellPadding || '8px 12px';
                
                const tables = root.querySelectorAll('table');
                tables.forEach((table) => {
                  // Table base styles
                  const tableStyle = table.getAttribute('style') || '';
                  table.setAttribute('style', 'border-collapse: collapse; border-spacing: 0; width: 100%; border: 1px solid ' + borderColor + '; ' + tableStyle);
                  
                  // Borders and padding on all cells
                  const cells = table.querySelectorAll('th, td');
                  cells.forEach((cell) => {
                    const style = cell.getAttribute('style') || '';
                    cell.setAttribute('style', 'border: 1px solid ' + borderColor + '; padding: ' + cellPadding + '; text-align: left; vertical-align: top; ' + style);
                  });
                  
                  // Header row styling
                  const thead = table.querySelector('thead');
                  const headerColorPart = headerFg ? ('color: ' + headerFg + '; ') : '';
                  if (thead) {
                    thead.querySelectorAll('th, td').forEach((cell) => {
                      const style = cell.getAttribute('style') || '';
                      cell.setAttribute('style', 'background: ' + headerBg + '; font-weight: ' + headerTextWeight + '; ' + headerColorPart + style);
                    });
                  } else {
                    const firstRow = table.querySelector('tr');
                    if (firstRow) {
                      firstRow.querySelectorAll('th, td').forEach((cell) => {
                        const style = cell.getAttribute('style') || '';
                        cell.setAttribute('style', 'background: ' + headerBg + '; font-weight: ' + headerTextWeight + '; ' + headerColorPart + style);
                      });
                    }
                  }
                  
                  // Banded rows and first-column emphasis (tbody only)
                  const bodyRows = table.querySelectorAll('tbody tr');
                  bodyRows.forEach((row, idx) => {
                    // Even row banding (1-based even, so 0-based odd index)
                    if ((idx % 2) === 1) {
                      const rowStyle = row.getAttribute('style') || '';
                      row.setAttribute('style', 'background: ' + bandEvenBg + '; ' + rowStyle);
                    }
                    // First column styling
                    const firstCell = row.querySelector('th, td');
                    if (firstCell) {
                      const style = firstCell.getAttribute('style') || '';
                      const extraBg = firstColumnBg ? ('background: ' + firstColumnBg + ';') : '';
                      const fw = firstColumnBold ? 'font-weight: 600;' : '';
                      firstCell.setAttribute('style', fw + ' ' + extraBg + ' ' + style);
                    }
                  });
                });
              };

              // First, get computed styles from the actual DOM elements before cloning
              const originalElements = docContentDiv.querySelectorAll('*');
              const computedStyles = new Map();

              // Also collect specific heading sizes for the style tag
              const h1Size = window.getComputedStyle(docContentDiv.querySelector('h1') || document.createElement('h1')).fontSize || '20px';
              const h2Size = window.getComputedStyle(docContentDiv.querySelector('h2') || document.createElement('h2')).fontSize || '18px';
              const h3Size = window.getComputedStyle(docContentDiv.querySelector('h3') || document.createElement('h3')).fontSize || '16px';

              originalElements.forEach((el, index) => {
                const computed = window.getComputedStyle(el);
                computedStyles.set(index, {
                  fontFamily: computed.fontFamily,
                  fontSize: computed.fontSize,
                  fontWeight: computed.fontWeight
                });
              });

              // Apply theme font and sizes to all elements with !important for Word compatibility
              const allElements = tempContent.querySelectorAll('*');
              allElements.forEach((el, index) => {
                const computed = computedStyles.get(index);
                if (computed) {
                  const currentStyle = el.getAttribute('style') || '';
                  // Remove any existing font declarations to avoid conflicts
                  const cleanedStyle = currentStyle.replace(/font-(family|size|weight):[^;]+;?/gi, '');
                  el.setAttribute('style', 'font-family: ' + computed.fontFamily + ' !important; font-size: ' + computed.fontSize + ' !important; font-weight: ' + computed.fontWeight + '; ' + cleanedStyle);
                }
              });

              // Apply heading numbering for Word after applying fonts
              try { addWordHeadingNumbering(tempContent, currentTheme || {}); } catch (_) {}

              // Now, apply table styling for Word
              try { applyWordTableStyling(tempContent, (currentTheme && currentTheme.tableWordStyling) || tableWordStyling || {}); } catch (_) {}

              // Fix anchor links to be relative for Word (internal document links)
              const fixAnchorLinks = (root) => {
                const links = root.querySelectorAll('a[href]');
                links.forEach((link) => {
                  const href = link.getAttribute('href');
                  if (href && href.startsWith('#')) {
                    // Already a relative anchor link, keep it as-is
                    link.setAttribute('href', href);
                  } else if (href && (href.includes('localhost') || href.includes('127.0.0.1'))) {
                    // Extract anchor from absolute localhost URL
                    const anchorMatch = href.match(/#(.+)$/);
                    if (anchorMatch) {
                      link.setAttribute('href', '#' + anchorMatch[1]);
                    }
                  }
                });
              };
              try { fixAnchorLinks(tempContent); } catch (_) {}

              htmlContent += tempContent.innerHTML;

              // Create a wrapper with styles and embedded CSS for better Word compatibility
              const styledHtml = '<html><head><meta charset="utf-8"><style>' +
                '* { font-family: ' + themeFontFamily + ' !important; } ' +
                'body { font-family: ' + themeFontFamily + ' !important; font-size: ' + themeFontSize + '; line-height: ' + themeLineHeight + '; margin: 0; padding: 0; } ' +
                'h1 { font-family: ' + themeFontFamily + ' !important; font-size: ' + h1Size + ' !important; } ' +
                'h2 { font-family: ' + themeFontFamily + ' !important; font-size: ' + h2Size + ' !important; } ' +
                'h3 { font-family: ' + themeFontFamily + ' !important; font-size: ' + h3Size + ' !important; } ' +
                'h4, h5, h6, p, div, span { font-family: ' + themeFontFamily + ' !important; }' +
                '</style></head><body><div style="max-width: 600px;">' + htmlContent + '</div></body></html>';

              // Use Clipboard API to copy both plain text and HTML
              const textContent = docContentDiv.innerText;
              
              if (navigator.clipboard && window.ClipboardItem) {
                // Modern Clipboard API with HTML support
                const blob = new Blob([styledHtml], { type: 'text/html' });
                const data = new ClipboardItem({
                  'text/html': blob,
                  'text/plain': new Blob([textContent], { type: 'text/plain' })
                });
                await navigator.clipboard.write([data]);
                copyWordBtn.textContent = '✓ Copied!';
              } else {
                // Fallback to older execCommand method
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = styledHtml;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);
                
                const range = document.createRange();
                range.selectNodeContents(tempDiv);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                document.execCommand('copy');
                selection.removeAllRanges();
                document.body.removeChild(tempDiv);
                
                copyWordBtn.textContent = '✓ Copied!';
              }
              
              // Reset button text after 2 seconds
              setTimeout(() => {
                copyWordBtn.textContent = '📋 Copy to Word';
              }, 2000);
              
              errorDiv.style.display = 'none';
            } catch (e) {
              errorDiv.textContent = 'Copy failed: ' + (e && e.message ? e.message : 'Unknown error');
              errorDiv.style.display = 'block';
              copyWordBtn.textContent = '📋 Copy to Word';
            } finally {
              copyWordBtn.disabled = false;
            }
          });
        }
    </script>
</body>
</html>`;
  res.send(htmlContent);
});

// Function to read and convert markdown
function updateMarkdown() {
  try {
    if (!fs.existsSync(MARKDOWN_FILE)) {
      const errorMsg = `❌ File not found: ${MARKDOWN_FILE}\n\nPlease make sure the file exists and try again.`;
      console.error(errorMsg);
      io.emit('error', errorMsg);
      return;
    }

    const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf8');
    const meta = extractMetadata(markdown);
    
    // Load theme from document metadata if specified, otherwise use default
    if (meta.theme) {
      theme = loadTheme(meta.theme);
    } else {
      theme = loadTheme(THEME);  // Reset to default theme
    }
    
    const { title, content } = extractTitleAndContent(markdown);
    // Strip both sensitivity and theme lines in the header area before the title
    const afterFrontmatter = stripFrontmatter(content);
    const headerCleaned = stripInlineMetadataBeforeTitle(afterFrontmatter, meta);
    const html = marked(preprocessCustomBlocks(headerCleaned));
    io.emit('markdown-update', { html, title, meta, theme });
  } catch (error) {
    const errorMsg = `❌ Error reading file: ${error.message}`;
    console.error(errorMsg);
    io.emit('error', errorMsg);
  }
}

// Watch for file changes
const watcher = chokidar.watch(MARKDOWN_FILE);
watcher.on('change', () => {
  updateMarkdown();
});

// Socket.IO connection
io.on('connection', (socket) => {
  updateMarkdown(); // Send initial content
  
  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// Function to open browser
function openBrowser(url) {
  const platform = process.platform;
  let command;

  switch (platform) {
    case 'darwin':  // macOS
      command = `open ${url}`;
      break;
    case 'win32':   // Windows
      command = `start ${url}`;
      break;
    default:        // Linux and others
      command = `xdg-open ${url}`;
      break;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Could not automatically open browser. Please open: ${url}`);
    }
  });
}

// Attempt to bind the server, trying subsequent ports if in use
function listenWithFallback(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryListen = (port) => {
      CURRENT_PORT = port;
      // Clean previous listeners to avoid multiple resolves
      server.removeAllListeners('listening');
      server.removeAllListeners('error');
      server.once('listening', () => {
        const actual = (server.address && server.address().port) || port;
        resolve(actual);
      });
      server.once('error', (err) => {
        if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
          attempt += 1;
          const nextPort = startPort + attempt;
          console.warn(`⚠️  Port ${port} unavailable (${err.code}). Trying ${nextPort}...`);
          if (attempt < maxAttempts) {
            tryListen(nextPort);
          } else {
            reject(new Error(`Unable to bind to ports ${startPort}..${startPort + attempt - 1} (${err.code})`));
          }
        } else {
          reject(err);
        }
      });
      server.listen(port);
    };
    tryListen(startPort);
  });
}

(async () => {
  try {
    const boundPort = await listenWithFallback(REQUESTED_PORT, 10);
    CURRENT_PORT = boundPort;
    const url = `http://localhost:${boundPort}`;
    if (process.env.PORT_FILE) {
      try {
        fs.writeFileSync(process.env.PORT_FILE, String(boundPort), 'utf8');
      } catch (e) {
        console.warn('Could not write PORT_FILE:', e.message);
      }
    }
    console.log(`Server running at ${url}`);
    console.log(`Watching ${MARKDOWN_FILE} for changes...`);

    // Initial load
    updateMarkdown();

    // Auto-open browser if AUTO_OPEN is not explicitly set to false (skip when PORT_FILE set, e.g. MCP headless)
    if (process.env.AUTO_OPEN !== 'false' && !process.env.PORT_FILE) {
      setTimeout(() => openBrowser(url), 1000);
    }
  } catch (e) {
    console.error('❌ Failed to start server:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();