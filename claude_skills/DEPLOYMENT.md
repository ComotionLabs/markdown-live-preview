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
