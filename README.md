# Markdown Live Preview

A lightweight Node.js server for live Markdown preview with auto-reload and real-time rendering. View your Markdown files in the browser with instant updates as you edit.

## Why This Tool?

Creating high-quality documentation is essential to modern development workflows, especially as AI-powered tools become integral to how we work. As Large Language Models (LLMs) like ChatGPT and Claude increasingly generate documentation in Markdown format, we face a common challenge: **seeing exactly how your Markdown documents will render before publishing them**.

Without an efficient preview mechanism, teams often experience a frustrating cycle of editing, committing, checking GitHub's render, and repeating. Markdown Live Preview eliminates this friction by providing instant visual feedback as you edit.

### Perfect for:
- **Working with AI assistants** - Review LLM-generated Markdown instantly
- **README development** - See your formatting as you write
- **Documentation workflows** - Edit in any text editor, preview in real-time
- **Cross-functional teams** - Non-technical contributors can see formatting feedback immediately

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

## Quick Start for Non-Technical Users

Don't worry if you're not a developer! This tool is designed to be easy to use for everyone.

### What You Need
1. **Node.js installed** on your computer ([Download here](https://nodejs.org/en/download) - choose the LTS version)
2. **A text editor** - Use whatever you're comfortable with:
   - Notepad (Windows)
   - TextEdit (Mac)
   - VS Code (recommended for both)
   - Any other text editor

### Step-by-Step Guide

**Step 1: Get the tool**
1. Download the latest release as a ZIP file from [GitHub](https://github.com/ComotionLabs/markdown-live-preview/releases/latest)
2. Extract the ZIP file to a folder on your computer
3. Remember where you saved it!

**Step 2: Open your Markdown file**
1. Create or open your `.md` file in your text editor
2. Save it somewhere you can find it

**Step 3: Start the preview**

**On Windows:**
1. Open File Explorer and navigate to where you extracted the tool
2. Hold Shift and right-click in the folder → Select "Open PowerShell window here"
3. Type: `.\preview.bat C:\path\to\your\file.md` (replace with your actual file path)
4. Press Enter

**On Mac:**
1. Open Terminal (search for "Terminal" in Spotlight)
2. Type: `cd ` (with a space after cd)
3. Drag the folder where you extracted the tool into Terminal
4. Press Enter
5. Type: `./preview.sh /path/to/your/file.md` (or drag your .md file into Terminal)
6. Press Enter

**Step 4: Edit and watch!**
1. Your browser will automatically open showing the preview
2. Edit your Markdown file in your text editor
3. Save the file (Ctrl+S or Cmd+S)
4. Watch the preview update automatically!

### Common Use Case: Working with ChatGPT/Claude
1. Ask ChatGPT or Claude to generate Markdown documentation
2. Copy the Markdown they provide
3. Paste it into a `.md` file and save it
4. Run the preview tool pointing to that file
5. See how it looks instantly!
6. Ask the AI to refine sections, paste updates, and see changes immediately

### Troubleshooting
- **"Command not found"** - Make sure you installed Node.js and restarted your terminal
- **"File not found"** - Check the path to your Markdown file is correct
- **Browser doesn't open** - Manually open http://localhost:3000 in your browser
- **Need help?** - Open an issue on [GitHub](https://github.com/ComotionLabs/markdown-live-preview/issues)

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
./preview.sh yourfile.md --theme comotion  # use a theme
```

Windows:
```batch
preview.bat yourfile.md
preview.bat yourfile.md 8080
preview.bat yourfile.md --theme comotion  REM use a theme
```

**Use with npx (if published or linked):**
```bash
npx markdown-live-preview yourfile.md
npx markdown-live-preview yourfile.md 8080  # custom port
npx markdown-live-preview yourfile.md --theme comotion  # use a theme
```

**After installing globally:**
```bash
npm install -g .
md-preview yourfile.md
md-preview yourfile.md 8080  # custom port
md-preview yourfile.md --theme comotion  # use a theme
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

### Document Title

The preview uses the first top-level heading in your markdown as the document title. It is shown above the content and used for the browser tab.

Write your title using either format at the very top of the file:

```md
# Your Document Title

Intro text...
```

or Setext style:

```md
Your Document Title
===================

Intro text...
```

That first title line is removed from the content to avoid duplication and appears as the document title element.

### Themes

#### Use a Theme

- Via CLI:
  - `md-preview README.md --theme comotion`
  - `npx markdown-live-preview README.md --theme comotion`
  - `./preview.sh README.md --theme comotion`
  - `preview.bat README.md --theme comotion`
- Via environment variable:
  - `THEME=comotion MARKDOWN_FILE=README.md node server.js`

When a theme is active, its font is applied to the whole document and its logo is rendered at the top of the document content (so it appears when printing). The live preview header remains on-screen but is hidden in print.

#### Add a Theme

1. Create a folder under `themes/<your-theme-name>/`.
2. Place any assets under `themes/<your-theme-name>/assets/` (e.g., logos).
3. Add a `themes/<your-theme-name>/theme.json` with this structure:

```json
{
  "name": "your-theme-name",
  "fontFamily": "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  "logoSrc": "/themes/your-theme-name/assets/your-logo.svg",
  "logoAlt": "Your Brand"
}
```

Notes:
- `logoSrc` must be a web path rooted at `/themes/...` so the server can serve it.
- If `logoSrc` is omitted or empty, the logo area is hidden.
- `fontFamily` is applied to the whole document body.

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
