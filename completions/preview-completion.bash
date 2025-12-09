# Bash completion for markdown preview command

_preview_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  # Options
  opts="--help --version --theme -h -v -t"

  # If previous word is --theme or -t, suggest theme names
  if [[ ${prev} == "--theme" ]] || [[ ${prev} == "-t" ]]; then
    local themes_dir

    # Try to find the themes directory
    if [[ -f ~/.preview-script-path ]]; then
      local preview_path=$(cat ~/.preview-script-path)
      themes_dir="${preview_path%/*}/themes"
    else
      # Fallback: check common locations
      for dir in ~/Documents/GitHub/markdown-live-preview ~/.markdown-preview /usr/local/lib/markdown-preview; do
        if [[ -d "$dir/themes" ]]; then
          themes_dir="$dir/themes"
          break
        fi
      done
    fi

    if [[ -d "$themes_dir" ]]; then
      local themes=$(ls -1 "$themes_dir" 2>/dev/null)
      COMPREPLY=( $(compgen -W "${themes}" -- ${cur}) )
      return 0
    fi
  fi

  # If current word starts with -, suggest options
  if [[ ${cur} == -* ]]; then
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
    return 0
  fi

  # For first argument, suggest markdown files
  if [[ ${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -f -X '!*.md' -- ${cur}) )
    return 0
  fi

  # For second argument, suggest port numbers
  if [[ ${COMP_CWORD} -eq 2 ]] && [[ ! ${cur} == -* ]]; then
    COMPREPLY=( $(compgen -W "3000 8080 8000 5000" -- ${cur}) )
    return 0
  fi
}

complete -F _preview_completion preview
