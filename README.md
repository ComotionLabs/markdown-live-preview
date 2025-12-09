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
- Copy to Word functionality with formatting preserved
- PDF export with headers and footers
- Clean, responsive UI
- Error handling and connection status indicators

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

Install from source:

```bash
git clone https://github.com/ComotionLabs/markdown-live-preview.git
cd markdown-live-preview
npm install
npm install -g .
```

This will make the `md-preview` command available globally on your system.

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

**Step 1: Install the tool**
1. Download the latest release as a ZIP file from [GitHub](https://github.com/ComotionLabs/markdown-live-preview/releases/latest)
2. Extract the ZIP file to a folder on your computer
3. Open Terminal (Mac) or PowerShell (Windows)
4. Navigate to the extracted folder and run:
   ```bash
   npm install
   npm install -g .
   ```

**Step 2: Use md-preview from anywhere**
1. Create or open your `.md` file in your text editor
2. Save it somewhere you can find it
3. Open Terminal (Mac) or PowerShell (Windows)
4. Type: `md-preview /path/to/your/file.md` (or drag your .md file into the terminal)
5. Press Enter

**Step 3: Edit and watch!**
1. Your browser will automatically open showing the preview
2. Edit your Markdown file in your text editor
3. Save the file (Ctrl+S or Cmd+S)
4. Watch the preview update automatically!

### Common Use Case: Working with ChatGPT/Claude
1. Ask ChatGPT or Claude to generate Markdown documentation
2. Copy the Markdown they provide
3. Paste it into a `.md` file and save it
4. Run `md-preview your-file.md`
5. See how it looks instantly!
6. Ask the AI to refine sections, paste updates, and see changes immediately

### Troubleshooting
- **"md-preview command not found"** - Make sure you ran `npm install -g .` and restarted your terminal
- **"File not found"** - Check the path to your Markdown file is correct
- **Browser doesn't open** - Manually open http://localhost:3000 in your browser
- **Need help?** - Open an issue on [GitHub](https://github.com/ComotionLabs/markdown-live-preview/issues)

## Usage

After installing globally, use the `md-preview` command from anywhere:

```bash
md-preview yourfile.md
md-preview yourfile.md 8080  # custom port
md-preview yourfile.md --theme comotion  # use a theme
```

### What Happens

1. 🚀 Server starts and watches your markdown file
2. 🌐 Browser automatically opens to http://localhost:3000
3. ✏️  Edit your markdown file in any editor
4. 🔄 Preview updates in real-time automatically!

## Configuration

You can customize the port by passing it as the second argument:

```bash
md-preview yourfile.md 8080
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

Use the `--theme` flag to apply a theme:

```bash
md-preview README.md --theme comotion
```

When a theme is active, its font is applied to the whole document and its logo is rendered at the top of the document content (so it appears when printing). The live preview header remains on-screen but is hidden in print.

#### Add a Theme

1. Create a folder under `themes/<your-theme-name>/`.
2. Place any assets under `themes/<your-theme-name>/assets/` (e.g., logos).
3. Add a `themes/<your-theme-name>/theme.json` with this structure:

```json
{
  "name": "your-theme-name",
  "companyName": "Your Company Name",
  "fontFamily": "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  "logoSrc": "/themes/your-theme-name/assets/your-logo.svg",
  "logoAlt": "Your Brand",
  "titleFontSize": "32px",
  "h1FontSize": "21px",
  "h2FontSize": "18px",
  "h3FontSize": "16px",
  "bodyFontSize": "14px",
  "headingNumbering": true,
  "printFooterEnabled": true,
  "printFooterLabel": "Page",
  "printMargins": { "top": "22mm", "right": "18mm", "bottom": "22mm", "left": "18mm" },
  "sensitivityLevels": {
    "Public": { "bg": "#e7f5ff", "fg": "#0b7285" },
    "Internal": { "bg": "#f1f3f5", "fg": "#343a40" },
    "Confidential": { "bg": "#fff3bf", "fg": "#7f5f01" },
    "Restricted": { "bg": "#ffe3e3", "fg": "#c92a2a" }
  }
}
```

Key fields:
- `companyName`: Appears in the bottom-left of PDF footers
- `logoSrc`: Must be a web path rooted at `/themes/...` (optional)
- `fontFamily`: Applied to the whole document body
- `titleFontSize`: Size of the document title (default: 32px)
- `h1FontSize`: Size of h1 headings (default: 21px)
- `h2FontSize`: Size of h2 headings (default: 18px)
- `h3FontSize`: Size of h3 headings (default: 16px)
- `bodyFontSize`: Size of body text (default: 14px)
- `headingNumbering`: Enables automatic numbering for h1-h3 headings
- `printMargins`: Safe margins for most printers (default: 20mm/15mm)
- `sensitivityLevels`: Maps sensitivity values to header colors in PDFs

### Export Options

#### Copy to Word

- Click the "📋 Copy to Word" button to copy the document in a format optimized for Microsoft Word
- The copied content includes:
  - Document logo (if present in theme)
  - Document title with proper formatting
  - All content with preserved styling
- Simply paste (Ctrl+V or Cmd+V) into Word to maintain formatting
- Works with both modern Clipboard API and fallback methods for older browsers

#### Convert to PDF

- Click the "📄 Export PDF" button for the most accurate result (uses Puppeteer if installed). You can still use your browser's Print dialog as a fallback.
- PDF footers display:
  - **Left side**: Company name (if defined in theme)
  - **Right side**: Page numbering (e.g., "Page 1 of 2")

Theme options for print:
- `companyName`: Company name shown in bottom-left of footer
- `printFooterEnabled`: Whether to show the footer (default true)
- `printFooterLabel`: Label before page numbers (default: "Page")
- `printMargins`: Page margins (default: 20mm top/bottom, 15mm left/right)

Puppeteer (optional):
- This project treats Puppeteer as an optional dependency to keep install size small.
- To enable accurate headers/footers and clean margins in PDFs, install it (Node 18+ required for Puppeteer v24+):
  ```bash
  npm install puppeteer
  ```
- If Puppeteer is not installed, the Export PDF button is hidden. You can still print via your browser menu, but headers/footers may not render correctly.

### Document Metadata

You can add metadata to your documents to control rendering behavior and document classification. Metadata can be specified using either YAML frontmatter or simple inline tags.

#### Sensitivity Classification

Mark your document's sensitivity level for PDF exports (appears in PDF header):

**YAML frontmatter:**
```md
---
sensitivity: Confidential
---

# Your Title
...
```

**Inline format:**
```md
Sensitivity: Confidential

# Your Title
...
```

Common sensitivity levels:
- `Public` - Blue header in PDF
- `Internal` - Gray header in PDF  
- `Confidential` - Yellow header in PDF
- `Restricted` - Red header in PDF

#### Document-Level Theme

Specify which theme to use directly in your document, overriding any command-line theme:

**YAML frontmatter:**
```md
---
theme: comotion
sensitivity: Internal
---

# Your Title
...
```

**Inline format:**
```md
Theme: comotion
Sensitivity: Internal

# Your Title
...
```

Features:
- Document theme overrides command-line `--theme` parameter
- Theme switches dynamically when opening different documents
- Affects fonts, logos, margins, and PDF headers/footers
- Both metadata lines are automatically hidden from rendered output

#### Metadata Processing

- Metadata must appear at the very beginning of the document
- Both `Theme:` and `Sensitivity:` lines are case-insensitive
- Values are trimmed of whitespace
- Inline metadata lines are removed from the rendered content
- Empty lines following metadata are also removed for cleaner output

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
