# MyAgentive Release Guide

This document outlines the complete release process for MyAgentive.

## Prerequisites

- Access to the MyAgentive repository
- Access to the homebrew-tap repository (`~/repo-agentive/homebrew-tap`)
- GitHub CLI (`gh`) installed and authenticated
- Bun runtime installed

## Release Checklist

### 1. Update Version

Edit `package.json` and update the version number:

```json
{
  "version": "X.Y.Z"
}
```

### 2. Commit Changes

Commit all changes with a descriptive message:

```bash
git add -A
git commit -m "vX.Y.Z: Brief description of changes

- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"
```

### 3. Build Release Packages

Run the build script to create release archives:

```bash
bash scripts/build-release.sh
```

This creates:
- `release/MyAgentive-vX.Y.Z-macos.tar.gz`
- `release/MyAgentive-vX.Y.Z-linux-x64.tar.gz`

### 4. Create Git Tag

```bash
git tag -a vX.Y.Z -m "vX.Y.Z: Brief description"
```

### 5. Push to Remote

```bash
git push origin main
git push origin vX.Y.Z
```

### 6. Create GitHub Release

Upload the release assets to GitHub:

```bash
gh release create vX.Y.Z \
  release/MyAgentive-vX.Y.Z-macos.tar.gz \
  release/MyAgentive-vX.Y.Z-linux-x64.tar.gz \
  --title "vX.Y.Z" \
  --notes "### Changes
- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"
```

### 7. Update Homebrew Tap

Get the SHA256 hashes for both release archives:

```bash
shasum -a 256 release/MyAgentive-vX.Y.Z-macos.tar.gz
shasum -a 256 release/MyAgentive-vX.Y.Z-linux-x64.tar.gz
```

Update the formula in `~/repo-agentive/homebrew-tap/Formula/myagentive.rb`:

```ruby
version "X.Y.Z"

on_macos do
  url "https://github.com/AgentiveIS/MyAgentive/releases/download/vX.Y.Z/MyAgentive-vX.Y.Z-macos.tar.gz"
  sha256 "<macos-sha256>"
end

on_linux do
  url "https://github.com/AgentiveIS/MyAgentive/releases/download/vX.Y.Z/MyAgentive-vX.Y.Z-linux-x64.tar.gz"
  sha256 "<linux-sha256>"
end
```

Commit and push:

```bash
cd ~/repo-agentive/homebrew-tap
git add -A
git commit -m "Update myagentive to vX.Y.Z

By Agentive (https://MyAgentive.ai)"
git push
```

### 8. Verify Installation

Test the release via Homebrew:

```bash
brew update
brew upgrade myagentive
brew info myagentive
```

Test the install script (auto-fetches latest version):

```bash
curl -fsSL https://myagentive.agentive.is/install | bash
```

## Quick Reference

| Step | Command |
|------|---------|
| Build | `bash scripts/build-release.sh` |
| Tag | `git tag -a vX.Y.Z -m "message"` |
| Push | `git push origin main && git push origin vX.Y.Z` |
| Release | `gh release create vX.Y.Z release/*.tar.gz --title "vX.Y.Z" --notes "..."` |
| SHA256 | `shasum -a 256 release/*.tar.gz` |

## Notes

- The install script at `myagentive.agentive.is/install` automatically fetches the latest version from GitHub API
- Homebrew requires manual SHA256 updates for security verification
- Always test both Homebrew and curl installation methods after release
