# Building Claude skills

This directory contains skills that can be packaged and uploaded to Claude. The build script zips a skill directory and saves it as a `.skill` file for deployment.

## Prerequisites

- **Bash** (macOS/Linux)
- **zip** (standard on macOS and most Linux distros)

## How to build

From the repository root:

```bash
./claude_skills/build_skill.sh [skill_name]
```

- **Default:** If you omit the skill name, `md-document` is built.
- **Example:** To build the md-document skill explicitly:

  ```bash
  ./claude_skills/build_skill.sh md-document
  ```

- **Other skills:** Pass the name of the skill directory (e.g. the folder under `claude_skills/`):

  ```bash
  ./claude_skills/build_skill.sh my-other-skill
  ```

## Output

- The script creates a **`build`** directory inside `claude_skills/` (if it doesn’t exist).
- The packaged skill is written as **`build/<skill_name>.skill`** (e.g. `build/md-document.skill`).
- The `.skill` file is a zip archive. The following are excluded from the archive:
  - `.venv/` (Python virtual environment)
  - `__pycache__/` and `*.pyc`
  - `.DS_Store`

## Deployment (build + publish as artifact)

Deployment builds the skill and publishes it as a Git artifact so others can download it without building locally.

**Version tags and GitHub Releases (policy, manual releases, permissions):** see [RELEASING.md](../RELEASING.md) in the repository root.

### Automated deployment (GitHub Actions)

#### One-time: approval gate for releases

The workflow uses a GitHub **Environment** named `release` so publishing waits for human approval:

1. In the repo: **Settings** → **Environments** → **New environment** → name it **`release`** (must match the workflow).
2. Under **Environment protection rules**, enable **Required reviewers** and add the people or teams who may approve a release.
3. (Optional) Add a **wait timer** if you want a minimum delay before approvers can act.

After you push a version tag, the **build** job runs immediately. The **publish-release** job then pauses until an approver approves it in the Actions run (or via the pending deployment notification). Only after approval does GitHub create the release and attach `md-document.skill`.

The workflow **`.github/workflows/deploy-skill.yml`** runs when:

1. **A version tag is pushed** (recommended, e.g. `v1.2.0`)  
   The skill is **built** first (artifact available on the run). Creating the **published release** happens only after approval on the `release` environment, then `md-document.skill` is attached.

   To deploy:

   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

   Approve the pending **publish-release** deployment when ready. Users download `md-document.skill` from the release assets.

2. **Manual run (workflow_dispatch)**  
   You can run the workflow from the Actions tab without creating a release. The workflow builds the skill and publishes it as a **workflow artifact**. Download the `.skill` file from the run’s Summary page (Artifacts section).

### Local deploy (build only)

To build locally and then upload to Claude yourself:

1. Run the build script as above.
2. In Claude, use the option to add or upload a custom skill.
3. Select or upload the generated `.skill` file from `claude_skills/build/`.

The `build/` directory is listed in the project `.gitignore`, so built artifacts are not committed to the repo; they are only published as release or workflow artifacts when using the deployment workflow.

## Install for Cursor (personal skill)

Cursor discovers personal skills at `~/.cursor/skills/<name>/SKILL.md`. Once installed, the skill is available in **every** Cursor project on that machine — no per-repo setup.

> **Important:** install to `~/.cursor/skills/`, **not** `~/.cursor/skills-cursor/`. The latter is reserved for Cursor's built-in skills.

The packaged `.skill` file is a zip of the skill folder. The `SKILL.md` inside uses Claude Code paths (`/mnt/skills/user/...`). After installing for Cursor, rewrite those paths once (see step 2 below).

### Option 1 — from a release or workflow artifact (recommended)

1. Download `md-document.skill` from a [GitHub Release](https://github.com/ComotionLabs/markdown-live-preview/releases) or from the **Artifacts** section of a **Deploy skill** workflow run.

2. Install and patch paths for Cursor:

   ```bash
   mkdir -p ~/.cursor/skills/md-document
   unzip -oq md-document.skill -d ~/.cursor/skills/md-document

   python3 - <<'PY'
   import pathlib
   p = pathlib.Path.home() / ".cursor/skills/md-document/SKILL.md"
   t = p.read_text()
   t = t.replace("/mnt/skills/user/md-document", "~/.cursor/skills/md-document")
   t = t.replace("/mnt/user-data/outputs/", "./")
   t = t.replace("/home/claude/", "./")
   p.write_text(t)
   print("Patched:", p)
   PY
   ```

3. Install runtime dependencies (optional on first run — scripts auto-install Python deps):

   ```bash
   pip3 install -r ~/.cursor/skills/md-document/requirements.txt
   brew install pandoc   # macOS; only needed for .docx output
   ```

4. Verify:

   ```bash
   python3 ~/.cursor/skills/md-document/scripts/md_to_pdf.py \
     ~/.cursor/skills/md-document/examples/seedanalytics-document-example.md \
     /tmp/md-document-test.pdf \
     --themes-dir ~/.cursor/skills/md-document/themes
   ```

   Open Cursor in any project and ask for e.g. *"a Comotion confidential one-page memo on Q3 highlights"*. The agent should apply `theme:` / `sensitivity:` frontmatter and call `md_to_pdf.py`.

### Option 2 — from a local build

From the repository root:

```bash
./claude_skills/build_skill.sh md-document
mkdir -p ~/.cursor/skills/md-document
unzip -oq claude_skills/build/md-document.skill -d ~/.cursor/skills/md-document
# then run the python3 patch block from Option 1, step 2
```

### Option 3 — from repo source (dev / symlink)

When actively editing the skill in this repo, symlink so changes are picked up immediately:

```bash
mkdir -p ~/.cursor/skills
ln -sf "$PWD/claude_skills/md-document" ~/.cursor/skills/md-document
```

Then patch `~/.cursor/skills/md-document/SKILL.md` with the python3 block above (or keep a Cursor-patched copy locally).

Alternatively, rsync a snapshot (excludes venv and caches):

```bash
mkdir -p ~/.cursor/skills
rsync -a --delete \
  --exclude '.venv' --exclude '.pytest_cache' --exclude '__pycache__' --exclude '.DS_Store' \
  claude_skills/md-document/ ~/.cursor/skills/md-document/
# then patch SKILL.md as above
```

### Update or uninstall

```bash
# update from a new .skill download
rm -rf ~/.cursor/skills/md-document
# repeat Option 1 steps 2–3

# uninstall
rm -rf ~/.cursor/skills/md-document
```

### Also install for Claude Code

The same folder follows the [Agent Skills](https://agentskills.io/) standard. For Claude Code, upload the `.skill` file as-is (paths in `SKILL.md` are already Claude-branded) or copy/symlink into `~/.claude/skills/md-document/`.
