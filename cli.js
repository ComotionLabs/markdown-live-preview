#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

// Show usage if no arguments
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
  📄 Markdown Live Preview

  Usage:
    md-preview <markdown-file> [port]
    npm run preview <markdown-file> [port]
    npx markdown-live-preview <markdown-file> [port]

  Arguments:
    markdown-file    Path to the markdown file to preview
    port            Optional port number (default: 3000)

  Examples:
    md-preview README.md
    md-preview docs/guide.md 8080
    npm run preview README.md
    npx markdown-live-preview README.md

  Options:
    --help, -h      Show this help message
    --version, -v   Show version number
  `);
  process.exit(0);
}

// Show version
if (args[0] === '--version' || args[0] === '-v') {
  const pkg = require('./package.json');
  console.log(`v${pkg.version}`);
  process.exit(0);
}

// Get markdown file and port from arguments
const markdownFile = args[0];
const port = args[1] || 3000;

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
    PORT: port.toString()
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
