#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);
let themeArg = null;
const cleanArgs = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--theme' || arg === '-t') {
    themeArg = args[i + 1] || null;
    i++;
  } else if (arg.startsWith('--theme=')) {
    themeArg = arg.split('=')[1] || null;
  } else {
    cleanArgs.push(arg);
  }
}

// Show usage if no arguments
if (cleanArgs.length === 0 || cleanArgs[0] === '--help' || cleanArgs[0] === '-h') {
  console.log(`
  📄 Markdown Live Preview

  Usage:
    md-preview <markdown-file> [port] [--theme <name>]
    npm run preview <markdown-file> [port] [--theme <name>]
    npx markdown-live-preview <markdown-file> [port] [--theme <name>]

  Arguments:
    markdown-file    Path to the markdown file to preview
    port            Optional port number (default: 3000)
    --theme, -t     Optional theme name (folder under themes/)

  Examples:
    md-preview README.md --theme comotion
    md-preview docs/guide.md 8080 --theme comotion
    npm run preview README.md
    npx markdown-live-preview README.md

  Options:
    --help, -h      Show this help message
    --version, -v   Show version number
  `);
  process.exit(0);
}

// Show version
if (cleanArgs[0] === '--version' || cleanArgs[0] === '-v') {
  const pkg = require('./package.json');
  console.log(`v${pkg.version}`);
  process.exit(0);
}

// Get markdown file and port from arguments
const markdownFile = cleanArgs[0];
const port = cleanArgs[1] || 3000;

// Check if file exists
if (!fs.existsSync(markdownFile)) {
  console.error(`\n❌ Error: File '${markdownFile}' not found!\n`);
  console.error('Please provide a valid markdown file path.');
  console.error('Example: md-preview README.md\n');
  process.exit(1);
}

// Get absolute path
const absolutePath = path.resolve(markdownFile);

console.log(`\n✨ Starting Markdown Live Preview...\n`);
console.log(`📄 File: ${absolutePath}`);
console.log(`🌐 Port: ${port}`);
console.log(`🔗 URL: http://localhost:${port}\n`);
console.log(`Press Ctrl+C to stop\n`);

// Start the server with environment variables
const serverPath = path.join(__dirname, 'server.js');
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    MARKDOWN_FILE: absolutePath,
    PORT: port.toString(),
    THEME: themeArg || process.env.THEME || ''
  },
  stdio: 'inherit'
});

// Handle errors
server.on('error', (error) => {
  console.error(`\n❌ Error starting server: ${error.message}\n`);
  process.exit(1);
});

// Handle exit
server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server exited with code ${code}\n`);
    process.exit(code);
  }
});

// Forward signals
process.on('SIGINT', () => {
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});
