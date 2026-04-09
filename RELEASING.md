# Releasing the md-document skill (GitHub)

This repository publishes **`md-document.skill`** and **`md-document-theme-examples.zip`** through GitHub Actions when you push a **version tag**. The workflow is [`.github/workflows/deploy-skill.yml`](.github/workflows/deploy-skill.yml).

Local packaging and build commands are documented in [claude_skills/DEPLOYMENT.md](claude_skills/DEPLOYMENT.md).

## How releases work here

1. **Build first** — On `git push` of a tag matching `v*`, the `build` job produces the skill zip and the theme-examples zip and uploads them as workflow artifacts.
2. **Publish second** — The `publish-release` job has `needs: build`, so it only runs after a successful build. It downloads those artifacts and uses [`softprops/action-gh-release`](https://github.com/softprops/action-gh-release) to create or update the GitHub Release and attach the files.
3. **Optional approval** — If the repo defines a protected GitHub **Environment** named `release` (recommended), the publish job waits for an approver before the release is created or updated. Configure it under **Settings → Environments → release** (required reviewers, optional wait timer).

So the automation already enforces **artifacts before the workflow publishes**. The risky case is **people** (or another integration) creating or publishing a release **outside** that flow before assets exist.

## Recommended release steps

1. **Do not** use **Releases → Draft a new release** in the GitHub UI to cut a version for this project, unless you know exactly what you are doing and accept that you may race CI or conflict with immutability rules (see below).
2. From a clean `main` (or your release branch), create and push a tag:

   ```bash
   git fetch origin
   git checkout main && git pull origin main   # adjust branch if needed
   git tag v1.2.0
   git push origin v1.2.0
   ```

3. Open **Actions**, select the **Deploy skill** run for that tag, and wait for **build** to finish.
4. If the `release` environment is protected, **approve** the pending **publish-release** deployment when you are ready for the release to go public.
5. Confirm on **Releases** that **`md-document.skill`** and **`md-document-theme-examples.zip`** are attached and that notes look correct.

**Dry run without a release:** Use **Actions → Deploy skill → Run workflow** (workflow_dispatch). That builds and exposes **Artifacts** on the run summary; it does not create a GitHub Release for tags in the same way as the tag-driven path (the publish job only runs for `refs/tags/`).

## Can GitHub block manual releases?

**There is no repository setting that turns off manual release creation** or limits it to GitHub Actions only. Anyone with permission to manage releases can still use the web UI or API.

Practical mitigations:

| Approach | What it does |
| -------- | ------------- |
| **Access control** | Restrict **Write** / **Maintain** / **Admin** to people who follow this process. Release creation is tied to those roles, not to a separate “releases only” toggle. |
| **Process + documentation** | Treat this file (and team norms) as the source of truth: **tag push → CI owns the release**. |
| **Immutable releases** | Repo or org setting **“Enable release immutability”** ([GitHub docs](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/preventing-changes-to-your-releases)) stops **changes** to a release after it is published. It does **not** prevent someone from publishing an empty release early; if they do, fixing assets can be harder. Use immutability when you want stronger integrity guarantees, not as a substitute for the tag-driven workflow. |

If a published release was created too early and your org forbids adding or changing assets afterward, recovery usually means **policy and git**: delete the release if GitHub allows it, address the tag if needed, and cut a new patch tag so CI publishes a fresh, complete release—exact steps depend on your immutability and tag rules.

## One-time: `release` environment

See [claude_skills/DEPLOYMENT.md](claude_skills/DEPLOYMENT.md) → *One-time: approval gate for releases* for creating the **`release`** environment and required reviewers so publishing never happens until someone explicitly approves after the build succeeds.
