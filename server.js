const express = require('express');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const MARKDOWN_FILE = 'CTS_Statement_of_Work.md';

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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            background: #f8f9fa;
            padding: 10px 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .status {
            color: #28a745;
            font-weight: bold;
        }
        .content {
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 20px;
            background: white;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 Markdown Live Preview</h1>
        <div class="status" id="status">● Connected</div>
    </div>
    <div id="error" class="error" style="display: none;"></div>
    <div class="content" id="content">Loading...</div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const contentDiv = document.getElementById('content');
        const statusDiv = document.getElementById('status');
        const errorDiv = document.getElementById('error');

        socket.on('markdown-update', (html) => {
            contentDiv.innerHTML = html;
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
      io.emit('error', `File ${MARKDOWN_FILE} not found`);
      return;
    }
    
    const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf8');
    const html = marked(markdown);
    io.emit('markdown-update', html);
  } catch (error) {
    io.emit('error', `Error reading file: ${error.message}`);
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Watching ${MARKDOWN_FILE} for changes...`);
  
  // Initial load
  updateMarkdown();
});