const express = require('express');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { Server } = require('socket.io');
const http = require('http');
const { exec } = require('child_process');

// Configure marked to suppress deprecation warnings
marked.setOptions({
  mangle: false,
  headerIds: false
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MARKDOWN_FILE = process.env.MARKDOWN_FILE;
const THEME = process.env.THEME;

// Serve theme assets
app.use('/themes', express.static(path.join(__dirname, 'themes')));

function loadTheme(themeName) {
  if (!themeName) {
    return {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      logoSrc: '',
      logoAlt: '',
      titleFontSize: '32px',
      h1FontSize: '21px',
      h2FontSize: '18px',
      h3FontSize: '16px',
      bodyFontSize: '14px',
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
      }
    };
  }
  try {
    const manifestPath = path.join(__dirname, 'themes', themeName, 'theme.json');
    if (fs.existsSync(manifestPath)) {
      const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);
      return {
        fontFamily: manifest.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        logoSrc: manifest.logoSrc || '',
        logoAlt: manifest.logoAlt || '',
        titleFontSize: manifest.titleFontSize || '32px',
        h1FontSize: manifest.h1FontSize || '21px',
        h2FontSize: manifest.h2FontSize || '18px',
        h3FontSize: manifest.h3FontSize || '16px',
        bodyFontSize: manifest.bodyFontSize || '14px',
        companyName: manifest.companyName || '',
        headingNumbering: Boolean(manifest.headingNumbering),
        headingNumberingMaxLevel: Number.isInteger(manifest.headingNumberingMaxLevel) ? manifest.headingNumberingMaxLevel : 3,
        printFooterEnabled: manifest.printFooterEnabled !== false,
        printFooterLabel: manifest.printFooterLabel || 'Page',
        printMargins: manifest.printMargins || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printContentBottomPadding: manifest.printContentBottomPadding || '16mm',
        headerFooterFontFamily: manifest.headerFooterFontFamily || (manifest.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"),
        headerFooterFontSize: manifest.headerFooterFontSize || '0.9em',
        sensitivityLevels: manifest.sensitivityLevels || {
          Public: { bg: '#e7f5ff', fg: '#0b7285' },
          Internal: { bg: '#f1f3f5', fg: '#343a40' },
          Confidential: { bg: '#fff3bf', fg: '#7f5f01' },
          Restricted: { bg: '#ffe3e3', fg: '#c92a2a' }
        }
      };
    }
  } catch (e) {
    console.warn(`Theme load failed for '${themeName}': ${e.message}`);
  }
  return {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    logoSrc: '',
    logoAlt: '',
    titleFontSize: '32px',
    h1FontSize: '21px',
    h2FontSize: '18px',
    h3FontSize: '16px',
    bodyFontSize: '14px',
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
    }
  };
}

let theme = loadTheme(THEME);  // Default theme from environment variable

function getNumberingCss(theme) {
  if (!theme.headingNumbering) return '';
  // Number h1..h3 by default
  return `
        #doc-content { counter-reset: h1; }
        #doc-content h1 { counter-reset: h2; }
        #doc-content h1::before { counter-increment: h1; content: counter(h1) '. '; }
        #doc-content h2 { counter-reset: h3; }
        #doc-content h2::before { counter-increment: h2; content: counter(h1) '.' counter(h2) ' '; }
        #doc-content h3::before { counter-increment: h3; content: counter(h1) '.' counter(h2) '.' counter(h3) ' '; }
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
        <div style="font-size: ${absoluteFontSize}; font-family: ${theme.headerFooterFontFamily}; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; color: #6c757d;">
          <div style="text-align: left;">${companyName}</div>
          <div style="text-align: right;">${label} <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      </body>
    </html>`;
}

function buildPuppeteerHeaderTemplate(theme, meta, title) {
  const hasSensitivity = !!(meta && meta.sensitivity);
  const level = hasSensitivity ? String(meta.sensitivity).trim() : '';
  const colors = hasSensitivity ? (theme.sensitivityLevels[level] || { bg: '#f1f3f5', fg: '#343a40' }) : { bg: 'transparent', fg: '#6c757d' };
  const safeTitle = (title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Convert em to px if needed
  const fontSize = theme.headerFooterFontSize || '10px';
  const absoluteFontSize = fontSize.includes('em') ? '10px' : fontSize;
  
  const badge = hasSensitivity ? `<span style="display: inline-block; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: ${colors.bg}; color: ${colors.fg}; -webkit-print-color-adjust: exact;">${level}</span>` : '';
  const titleSpan = safeTitle ? `<span style="color: #495057; margin-left: 8px;">${safeTitle}</span>` : '';
  
  // Always return a complete HTML structure
  return `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div style="font-size: ${absoluteFontSize}; font-family: ${theme.headerFooterFontFamily}; width: 100%; padding-left: 20px; color: #495057;">
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
    const url = `http://localhost:${PORT}/?pdf=1`;
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
    <style>
        body {
            font-family: ${theme.fontFamily};
            font-size: ${theme.bodyFontSize};
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
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
        .content { padding: 0; border: none; background: transparent; }
        .doc-theme-brand { display: ${theme.logoSrc ? 'block' : 'none'}; margin: 16px 0; }
        .doc-theme-logo { height: 44px; }
        .doc-title { font-size: ${theme.titleFontSize}; font-weight: 700; margin: 8px 0 16px; }
        #doc-content h1 { font-size: ${theme.h1FontSize}; }
        #doc-content h2 { font-size: ${theme.h2FontSize}; }
        #doc-content h3 { font-size: ${theme.h3FontSize}; }
        #doc-content { border: 1px solid #e9ecef; border-radius: 5px; padding: 20px; background: white; }
        .sensitivity-badge { display: none; font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 999px; width: fit-content; }
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
        /* Professional table styling */
        #doc-content table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin: 16px 0;
        }
        #doc-content th,
        #doc-content td {
            border: 1px solid #dee2e6;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
        }
        #doc-content thead th {
            background: #f1f3f5;
            font-weight: 600;
        }
        #doc-content tbody tr:nth-child(even) {
            background: #fafbfc;
        }
        #doc-content tbody tr:hover {
            background: #f6f8fa;
        }
        ${getNumberingCss(theme)}
        @media print {
            @page { margin: ${theme.printMargins.top} ${theme.printMargins.right} ${theme.printMargins.bottom} ${theme.printMargins.left}; }
            .header { display: none !important; }
            body { margin: 0; padding: 0; }
            #doc-content { border: none; padding: 0 0 ${theme.printContentBottomPadding} 0; }
            .doc-theme-brand { margin: 0 0 12px 0; }
            .doc-theme-logo { height: 40px; }
            .doc-title { margin: 6px 0 12px; }
            /* Always hide in-page footer during browser printing; use Export PDF for accurate numbers */
            .print-footer { display: none !important; }
            /* Puppeteer uses its own header/footer; in-page footer remains hidden */
            /* Show sensitivity chip at the top of each page from page 2 */
            .header { display: none !important; }
            .doc-theme-brand { break-after: avoid; }
            .doc-title { break-after: avoid; }
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
        <div class="doc-theme-brand">
            <img src="${theme.logoSrc}" alt="${theme.logoAlt || 'Logo'}" class="doc-theme-logo" />
        </div>
        <div class="doc-title" id="doc-title" style="display:none;"></div>
        <div id="doc-content">Loading...</div>
    </div>
    ${theme.printFooterEnabled ? `<div class="print-footer"><span class="footer-label">${theme.printFooterLabel} </span><span class="page-numbers"></span></div>` : ''}

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const docContentDiv = document.getElementById('doc-content');
        const docTitleDiv = document.getElementById('doc-title');
        const statusDiv = document.getElementById('status');
        const errorDiv = document.getElementById('error');
        const exportBtn = document.getElementById('export-pdf');
        const copyWordBtn = document.getElementById('copy-word');
        const params = new URLSearchParams(window.location.search);
        if (params.get('pdf') === '1') {
          document.body.classList.add('pdf-mode');
        }

        socket.on('markdown-update', (payload) => {
            if (typeof payload === 'string') {
                docContentDiv.innerHTML = payload;
                docTitleDiv.style.display = 'none';
                document.title = 'Markdown Live Preview';
            } else {
                const { html, title, meta } = payload || {};
                docContentDiv.innerHTML = html || '';
                if (title && title.trim().length > 0) {
                    docTitleDiv.textContent = title;
                    docTitleDiv.style.display = 'block';
                    document.title = (title + ' — Markdown Live Preview');
                } else {
                    docTitleDiv.style.display = 'none';
                    document.title = 'Markdown Live Preview';
                }
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
              // Get the complete HTML content with title and logo
              let htmlContent = '';
              
              // Add logo if present
              const logoElement = document.querySelector('.doc-theme-logo');
              if (logoElement && logoElement.src) {
                htmlContent += '<div style="margin-bottom: 16px;"><img src="' + logoElement.src + '" style="height: 44px;" /></div>';
              }
              
              // Add title if present
              const titleElement = document.getElementById('doc-title');
              if (titleElement && titleElement.style.display !== 'none') {
                const titleStyle = window.getComputedStyle(titleElement);
                htmlContent += '<h1 style="font-size: ' + titleStyle.fontSize + '; font-weight: 700; margin: 8px 0 16px;">' + titleElement.textContent + '</h1>';
              }
              
              // Add main content
              htmlContent += docContentDiv.innerHTML;
              
              // Create a wrapper with styles for Word compatibility
              const bodyStyle = window.getComputedStyle(document.body);
              const styledHtml = '<div style="font-family: ' + bodyStyle.fontFamily + '; font-size: ' + bodyStyle.fontSize + '; line-height: 1.6; max-width: 600px;">' + htmlContent + '</div>';
              
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
    const html = marked(headerCleaned);
    io.emit('markdown-update', { html, title, meta });
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

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running at ${url}`);
  console.log(`Watching ${MARKDOWN_FILE} for changes...`);

  // Initial load
  updateMarkdown();

  // Auto-open browser if AUTO_OPEN is not explicitly set to false
  if (process.env.AUTO_OPEN !== 'false') {
    setTimeout(() => openBrowser(url), 1000);
  }
});