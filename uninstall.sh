#!/bin/bash

# Uninstallation script for markdown-live-preview

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Uninstalling Markdown Live Preview...${NC}\n"

# Remove symlink
if [ -L "/usr/local/bin/preview" ]; then
    echo -e "${BLUE}Removing system command...${NC}"
    sudo rm /usr/local/bin/preview
    echo -e "${GREEN}✓ Command removed${NC}\n"
fi

# Remove Zsh completion
if [ -f ~/.zsh/completions/_preview ]; then
    echo -e "${BLUE}Removing Zsh completion...${NC}"
    rm ~/.zsh/completions/_preview
    echo -e "${GREEN}✓ Zsh completion removed${NC}"
    echo -e "${YELLOW}Note: You may want to remove the fpath line from ~/.zshrc${NC}\n"
fi

# Remove Bash completion
if [ -f ~/.bash_completions/preview ]; then
    echo -e "${BLUE}Removing Bash completion...${NC}"
    rm ~/.bash_completions/preview
    echo -e "${GREEN}✓ Bash completion removed${NC}"
    echo -e "${YELLOW}Note: You may want to remove the source line from ~/.bashrc${NC}\n"
fi

if [ -f /usr/local/etc/bash_completion.d/preview ]; then
    sudo rm /usr/local/etc/bash_completion.d/preview
fi

if [ -f /etc/bash_completion.d/preview ]; then
    sudo rm /etc/bash_completion.d/preview
fi

# Remove script path file
if [ -f ~/.preview-script-path ]; then
    rm ~/.preview-script-path
fi

echo -e "${GREEN}✨ Uninstallation complete!${NC}\n"
