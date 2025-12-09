# Installation Guide

This guide explains how to install the `md-preview` command system-wide with auto-completion.

## Quick Install

```bash
npm install
npm install -g .
```

Then restart your terminal.

## What Gets Installed

1. **Command**: `md-preview` command available system-wide
2. **Auto-completion**: Tab completion for Zsh and Bash (if using install scripts)
3. **Global access**: Use `md-preview` from any directory

## Installation Methods

### NPM Global Installation (Recommended)

```bash
npm install
npm install -g .
```

This installs the `md-preview` command globally using npm's standard installation process.

### User Installation with Auto-completion (No sudo required)

```bash
./install-user.sh
```

Installs to:
- Command: `~/bin/md-preview`
- Zsh completion: `~/.zsh/completions/_md-preview`
- Bash completion: `~/.bash_completions/md-preview`

### System Installation with Auto-completion (Requires sudo)

```bash
./install.sh
```

Installs to:
- Command: `/usr/local/bin/md-preview`
- Zsh completion: `~/.zsh/completions/_md-preview`
- Bash completion: `/usr/local/etc/bash_completion.d/md-preview`

## Usage

After installation, you can use the `md-preview` command from anywhere:

```bash
md-preview README.md
md-preview docs/guide.md 8080
md-preview README.md --theme comotion
md-preview --help
```

## Auto-Completion Features

The completion scripts (if installed via shell scripts) provide intelligent suggestions:

- **Markdown files**: Typing `md-preview <TAB>` shows only `.md` files
- **Themes**: Typing `md-preview file.md --theme <TAB>` lists available themes
- **Ports**: Suggests common ports (3000, 8080, 8000, 5000)
- **Options**: Auto-completes `--help`, `--version`, `--theme`

## Testing Auto-Completion

Try these commands after installation:

```bash
md-preview <TAB>           # Shows markdown files in current directory
md-preview --<TAB>         # Shows available options
md-preview file.md --theme <TAB>  # Shows available themes
```

## Uninstallation

To remove the installation:

```bash
./uninstall.sh
```

## Troubleshooting

### Command not found

If `md-preview` command is not found after installation:

1. Check if `~/bin` is in your PATH:
   ```bash
   echo $PATH | grep "$HOME/bin"
   ```

2. Reload your shell configuration:
   ```bash
   source ~/.zshrc
   ```

3. Or restart your terminal

### Auto-completion not working

1. Verify completion file exists:
   ```bash
   ls -la ~/.zsh/completions/_md-preview
   ```

2. Check `.zshrc` configuration:
   ```bash
   grep "fpath" ~/.zshrc
   ```

3. Reload completions:
   ```bash
   rm -f ~/.zcompdump && compinit
   ```

### NPM installation issues

If you have issues with npm global installation:

1. Check npm global directory:
   ```bash
   npm list -g --depth=0 | grep markdown-live-preview
   ```

2. Reinstall:
   ```bash
   npm uninstall -g markdown-live-preview
   npm install -g .
   ```

3. Check npm bin directory is in PATH:
   ```bash
   npm config get prefix
   ```

   The bin directory should be in your PATH (usually `/usr/local/bin` or `~/.npm-global/bin`).
