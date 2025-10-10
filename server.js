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
      headingNumbering: false,
      headingNumberingMaxLevel: 3
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
        headingNumbering: Boolean(manifest.headingNumbering),
        headingNumberingMaxLevel: Number.isInteger(manifest.headingNumberingMaxLevel) ? manifest.headingNumberingMaxLevel : 3
      };
    }
  } catch (e) {
    console.warn(`Theme load failed for '${themeName}': ${e.message}`);
  }
  return {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    logoSrc: '',
    logoAlt: '',
    headingNumbering: false,
    headingNumberingMaxLevel: 3
  };
}

const theme = loadTheme(THEME);

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
        .doc-title { font-size: 28px; font-weight: 700; margin: 8px 0 16px; }
        #doc-content { border: 1px solid #e9ecef; border-radius: 5px; padding: 20px; background: white; }
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
            .header { display: none !important; }
            body { margin: 0; padding: 0; }
            #doc-content { border: none; padding: 0; }
            .doc-theme-brand { margin: 0 0 12px 0; }
            .doc-theme-logo { height: 40px; }
            .doc-title { margin: 6px 0 12px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="font-size:16px;margin:0;">📄 Markdown Live Preview</h1>
        <div class="status" id="status">● Connected</div>
    </div>
    <div id="error" class="error" style="display: none;"></div>
    <div class="content">
        <div class="doc-theme-brand">
            <img src="${theme.logoSrc}" alt="${theme.logoAlt || 'Logo'}" class="doc-theme-logo" />
        </div>
        <div class="doc-title" id="doc-title" style="display:none;"></div>
        <div id="doc-content">Loading...</div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const docContentDiv = document.getElementById('doc-content');
        const docTitleDiv = document.getElementById('doc-title');
        const statusDiv = document.getElementById('status');
        const errorDiv = document.getElementById('error');

        socket.on('markdown-update', (payload) => {
            if (typeof payload === 'string') {
                docContentDiv.innerHTML = payload;
                docTitleDiv.style.display = 'none';
                document.title = 'Markdown Live Preview';
            } else {
                const { html, title } = payload || {};
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
    const { title, content } = extractTitleAndContent(markdown);
    const html = marked(content);
    io.emit('markdown-update', { html, title });
  } catch (error) {
    const errorMsg = `❌ Error reading file: ${error.message}`;
    console.error(errorMsg);
    io.emit('error', errorMsg);
  }
}

// Watch for file changes
const watcher = chokidar.watch(MARKDOWN_FILE);
watcher.on('change', () => {
  console.log(`${MARKDOWN_FILE} changed, updating...`);
  updateMarkdown();
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');
  updateMarkdown(); // Send initial content
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
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