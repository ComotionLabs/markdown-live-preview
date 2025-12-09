#!/bin/bash

# User-level installation script for markdown-live-preview
# No sudo required - installs to user directories

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Installing Markdown Live Preview (User Mode)...${NC}\n"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if running on macOS or Linux
if [[ "$OSTYPE" != "darwin"* ]] && [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: This script only supports macOS and Linux${NC}"
    exit 1
fi

# 1. Create symlink in user's local bin
echo -e "${BLUE}Step 1: Creating user-level command...${NC}"

# Create ~/bin if it doesn't exist
mkdir -p ~/bin

# Remove existing symlink if present
if [ -L ~/bin/preview ]; then
    echo -e "${YELLOW}Removing existing preview command...${NC}"
    rm ~/bin/preview
fi

# Create new symlink
echo -e "${BLUE}Creating symlink...${NC}"
ln -s "$SCRIPT_DIR/preview.sh" ~/bin/preview
chmod +x "$SCRIPT_DIR/preview.sh"

echo -e "${GREEN}✓ Command 'preview' installed to ~/bin${NC}\n"

# Store the script path for completion scripts
echo "$SCRIPT_DIR/preview.sh" > ~/.preview-script-path

# Add ~/bin to PATH if not already there
SHELL_RC="$HOME/.zshrc"
if [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
    if [ ! -f "$SHELL_RC" ]; then
        SHELL_RC="$HOME/.bash_profile"
    fi
fi

if ! grep -q 'export PATH="$HOME/bin:$PATH"' "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Add ~/bin to PATH" >> "$SHELL_RC"
    echo 'export PATH="$HOME/bin:$PATH"' >> "$SHELL_RC"
    echo -e "${GREEN}✓ Added ~/bin to PATH in $SHELL_RC${NC}"
else
    echo -e "${YELLOW}~/bin already in PATH${NC}"
fi

# 2. Install completions based on shell
echo -e "\n${BLUE}Step 2: Installing auto-completion...${NC}"

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_TYPE="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_TYPE="bash"
else
    # Check default shell
    if [[ "$SHELL" == *"zsh"* ]]; then
        SHELL_TYPE="zsh"
    elif [[ "$SHELL" == *"bash"* ]]; then
        SHELL_TYPE="bash"
    else
        SHELL_TYPE="unknown"
    fi
fi

# Install Zsh completion
if [[ "$SHELL_TYPE" == "zsh" ]] || [[ "$SHELL" == *"zsh"* ]]; then
    echo -e "${BLUE}Installing Zsh completion...${NC}"

    # Create completion directory if it doesn't exist
    mkdir -p ~/.zsh/completions

    # Copy completion file
    cp "$SCRIPT_DIR/completions/_preview" ~/.zsh/completions/

    # Add to .zshrc if not already present
    if ! grep -q "fpath=(~/.zsh/completions \$fpath)" ~/.zshrc 2>/dev/null; then
        echo "" >> ~/.zshrc
        echo "# Markdown Preview completion" >> ~/.zshrc
        echo "fpath=(~/.zsh/completions \$fpath)" >> ~/.zshrc
        echo "autoload -Uz compinit && compinit" >> ~/.zshrc
        echo -e "${GREEN}✓ Added completion to ~/.zshrc${NC}"
    else
        echo -e "${YELLOW}Completion already configured in ~/.zshrc${NC}"
    fi

    echo -e "${GREEN}✓ Zsh completion installed${NC}"
fi

# Install Bash completion
if [[ "$SHELL_TYPE" == "bash" ]] || [[ "$SHELL" == *"bash"* ]]; then
    echo -e "${BLUE}Installing Bash completion...${NC}"

    # Install to user's home directory
    mkdir -p ~/.bash_completions
    cp "$SCRIPT_DIR/completions/preview-completion.bash" ~/.bash_completions/preview

    # Add to .bashrc or .bash_profile
    BASH_RC="$HOME/.bashrc"
    if [ ! -f "$BASH_RC" ]; then
        BASH_RC="$HOME/.bash_profile"
    fi

    if ! grep -q "source ~/.bash_completions/preview" "$BASH_RC" 2>/dev/null; then
        echo "" >> "$BASH_RC"
        echo "# Markdown Preview completion" >> "$BASH_RC"
        echo "source ~/.bash_completions/preview" >> "$BASH_RC"
        echo -e "${GREEN}✓ Added completion to $BASH_RC${NC}"
    else
        echo -e "${YELLOW}Completion already configured${NC}"
    fi

    echo -e "${GREEN}✓ Bash completion installed${NC}"
fi

# 3. Install npm dependencies if needed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo -e "\n${BLUE}Step 3: Installing npm dependencies...${NC}"
    cd "$SCRIPT_DIR"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}\n"
else
    echo -e "\n${GREEN}Step 3: Dependencies already installed${NC}\n"
fi

# Done!
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Installation complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}Usage:${NC}"
echo -e "  preview <markdown-file> [port] [--theme <name>]"
echo -e "\n${BLUE}Examples:${NC}"
echo -e "  preview README.md"
echo -e "  preview docs/guide.md 8080 --theme comotion"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Restart your terminal or run: ${YELLOW}source $SHELL_RC${NC}"
echo -e "  2. Try: ${YELLOW}preview --help${NC}"
echo -e "  3. Test auto-completion by typing: ${YELLOW}preview <TAB>${NC}\n"

echo -e "${YELLOW}Note: The 'preview' command is installed in ~/bin${NC}"
echo -e "${YELLOW}Make sure ~/bin is in your PATH (added to $SHELL_RC)${NC}\n"
