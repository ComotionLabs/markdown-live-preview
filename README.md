# Markdown Live Preview

A lightweight Node.js server for live Markdown preview with auto-reload and real-time rendering. View your Markdown files in the browser with instant updates as you edit.

## Features

- Real-time Markdown rendering with live reload
- WebSocket-based updates for instant preview
- File watching with automatic change detection
- Clean, responsive UI
- Error handling and connection status indicators

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ComotionLabs/markdown-live-preview.git
cd markdown-live-preview
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Quick Start (Recommended)

**Use NPM scripts (works on all platforms):**
```bash
npm run preview yourfile.md
npm run preview yourfile.md 8080  # custom port
```

**Use the shell scripts:**

macOS/Linux:
```bash
./preview.sh yourfile.md
./preview.sh yourfile.md 8080  # custom port
```

Windows:
```batch
preview.bat yourfile.md
preview.bat yourfile.md 8080
```

**Use with npx (if published or linked):**
```bash
npx markdown-live-preview yourfile.md
npx markdown-live-preview yourfile.md 8080  # custom port
```

**After installing globally:**
```bash
npm install -g .
md-preview yourfile.md
md-preview yourfile.md 8080  # custom port
```

### What Happens

1. ✅ Dependencies are automatically checked/installed (shell scripts only)
2. 🚀 Server starts and watches your markdown file
3. 🌐 Browser automatically opens to http://localhost:3000
4. ✏️  Edit your markdown file in any editor
5. 🔄 Preview updates in real-time automatically!

### Manual Usage

If you prefer to run the server directly:

```bash
MARKDOWN_FILE=yourfile.md node server.js
```

**Windows (CMD):**
```batch
set MARKDOWN_FILE=yourfile.md && node server.js
```

**Windows (PowerShell):**
```powershell
$env:MARKDOWN_FILE="yourfile.md"; node server.js
```

**Disable auto-open browser:**
```bash
AUTO_OPEN=false MARKDOWN_FILE=yourfile.md node server.js
```

## Configuration

You can customize the port by setting the `PORT` environment variable:

```bash
./preview.sh yourfile.md 8080
```

Or manually:
```bash
PORT=8080 MARKDOWN_FILE=yourfile.md node server.js
```

## Project Structure

```
markdown-live-preview/
   server.js           # Main Express server with WebSocket support
   cli.js              # CLI wrapper for npm/npx support
   preview.sh          # macOS/Linux launcher script
   preview.bat         # Windows launcher script
   package.json        # Project dependencies and scripts
   LICENSE             # MIT License
   README.md           # This file
```

## How It Works

1. **Express Server**: Serves the HTML preview interface
2. **Socket.IO**: Provides real-time bidirectional communication
3. **Chokidar**: Watches the Markdown file for changes
4. **Marked**: Converts Markdown to HTML
5. **Real-time Updates**: When the file changes, the server converts it to HTML and pushes updates to all connected clients

## Dependencies

- **express**: Web application framework
- **marked**: Markdown parser and compiler
- **chokidar**: Efficient file watcher
- **socket.io**: Real-time bidirectional event-based communication

## Contributing

We welcome contributions! Please follow these guidelines:

### Code Standards

1. **JavaScript Style**
   - Use ES6+ features where appropriate
   - Use `const` by default, `let` when reassignment is needed
   - Use template literals for string interpolation
   - Use arrow functions for callbacks
   - Include meaningful comments for complex logic

2. **Code Formatting**
   - 2 spaces for indentation
   - Semicolons required
   - Single quotes for strings (except when escaping)
   - Trailing commas in multi-line objects/arrays

3. **Naming Conventions**
   - `camelCase` for variables and functions
   - `UPPER_CASE` for constants
   - Descriptive names that convey purpose

4. **Error Handling**
   - Always handle errors gracefully
   - Provide meaningful error messages
   - Use try-catch blocks for file operations

### Contribution Process

1. **Fork the repository**

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**
   - Write clean, readable code
   - Follow the code standards above
   - Test your changes thoroughly

4. **Commit your changes**
```bash
git commit -m "Add: brief description of your changes"
```

Use conventional commit messages:
- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for improvements to existing features
- `Refactor:` for code refactoring
- `Docs:` for documentation changes

5. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all tests pass (if applicable)

### What to Contribute

- Bug fixes
- New features (discuss in an issue first for major features)
- Documentation improvements
- Performance optimizations
- UI/UX enhancements
- Test coverage

### Reporting Issues

When reporting issues, please include:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node.js version, etc.)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- Open an issue on [GitHub](https://github.com/ComotionLabs/markdown-live-preview/issues)
- Check existing issues for solutions

## Roadmap

Potential future enhancements:
- [ ] Support for multiple Markdown files
- [ ] Custom CSS themes
- [ ] Markdown syntax highlighting in editor
- [ ] Export to PDF/HTML
- [ ] Configuration file support
- [ ] Custom port configuration via CLI arguments

## Acknowledgments

Built with:
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Marked](https://marked.js.org/)
- [Chokidar](https://github.com/paulmillr/chokidar)
