# MyAgentive Release Guide

This document outlines the complete release process for MyAgentive.

## Prerequisites

- Access to the MyAgentive repository
- GitHub CLI (`gh`) installed and authenticated
- Bun runtime installed

## Branches

| Branch | Purpose | Install channel |
|--------|---------|-----------------|
| `main` | Stable releases | Default |
| `next` | Testing/prerelease builds | `--testing` |

All development happens on `next`. Once tested, merge into `main` for stable release.

## Installation

```bash
# Stable (default)
curl -fsSL https://myagentive.ai/install | bash

# Testing (prerelease)
curl -fsSL https://myagentive.ai/install | bash -s -- --testing
```

The web installer script is at `scripts/templates/web-install.sh`. Deploy it to myagentive.ai/install.

## Testing Release (on `next` branch)

### 1. Switch to `next`

```bash
git checkout next
```

### 2. Update Version

Use a prerelease version in `package.json`:

```json
{
  "version": "X.Y.Z-beta.1"
}
```

Increment the beta number for subsequent testing builds (e.g., `beta.2`, `beta.3`).

### 3. Commit Changes

```bash
git add -A
git commit -m "vX.Y.Z-beta.1: Brief description of changes

- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"
```

### 4. Build Release Packages

```bash
bash scripts/build-release.sh
```

### 5. Tag and Push

```bash
git tag -a vX.Y.Z-beta.1 -m "vX.Y.Z-beta.1: Testing release"
git push origin next
git push origin vX.Y.Z-beta.1
```

### 6. Create GitHub Prerelease

```bash
gh release create vX.Y.Z-beta.1 \
  release/MyAgentive-vX.Y.Z-beta.1-macos.tar.gz \
  release/MyAgentive-vX.Y.Z-beta.1-linux-x64.tar.gz \
  release/MyAgentive-vX.Y.Z-beta.1-linux-arm64.tar.gz \
  --title "vX.Y.Z-beta.1 (Testing)" \
  --notes "### Testing Release

- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)" \
  --prerelease
```

### 7. Verify Testing Install

```bash
curl -fsSL https://myagentive.ai/install | bash -s -- --testing
```

## Stable Release (on `main` branch)

### 1. Merge `next` into `main`

```bash
git checkout main
git merge next
```

### 2. Update Version

Remove the prerelease suffix in `package.json`:

```json
{
  "version": "X.Y.Z"
}
```

### 3. Commit, Build, Tag, Push

```bash
git add -A
git commit -m "vX.Y.Z: Brief description of changes

- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"

bash scripts/build-release.sh

git tag -a vX.Y.Z -m "vX.Y.Z: Brief description"
git push origin main
git push origin vX.Y.Z
```

### 4. Create GitHub Release

```bash
gh release create vX.Y.Z \
  release/MyAgentive-vX.Y.Z-macos.tar.gz \
  release/MyAgentive-vX.Y.Z-linux-x64.tar.gz \
  release/MyAgentive-vX.Y.Z-linux-arm64.tar.gz \
  --title "vX.Y.Z" \
  --notes "### Changes
- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"
```

### 5. Verify Stable Install

```bash
curl -fsSL https://myagentive.ai/install | bash
```

### 6. Continue on `next`

After a stable release, update `next` to stay in sync:

```bash
git checkout next
git merge main
git push origin next
```

## Quick Reference

### Testing Release (on `next`)

| Step | Command |
|------|---------|
| Build | `bash scripts/build-release.sh` |
| Tag | `git tag -a vX.Y.Z-beta.N -m "message"` |
| Push | `git push origin next && git push origin vX.Y.Z-beta.N` |
| Release | `gh release create vX.Y.Z-beta.N release/*.tar.gz --title "..." --prerelease` |
| Verify | `curl -fsSL https://myagentive.ai/install \| bash -s -- --testing` |

### Stable Release (on `main`)

| Step | Command |
|------|---------|
| Merge | `git checkout main && git merge next` |
| Build | `bash scripts/build-release.sh` |
| Tag | `git tag -a vX.Y.Z -m "message"` |
| Push | `git push origin main && git push origin vX.Y.Z` |
| Release | `gh release create vX.Y.Z release/*.tar.gz --title "vX.Y.Z" --notes "..."` |
| Verify | `curl -fsSL https://myagentive.ai/install \| bash` |
