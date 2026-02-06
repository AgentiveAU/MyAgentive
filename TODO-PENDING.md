# Pending Tasks - Issue #97 File Delivery Fix

## Waiting on Boss Response

### 1. Website Repo - Installer Fix
**Location:** `/home/amir/Documents/career/recent-projects/www.MyAgentive.ai`
**Branch:** `feature/fix-installer-missing-files`

The web installer (`public/install`) was missing critical files:
- `save-for-download` tool
- `send-file` tool
- `default-system-prompt.md`

**Action needed:** Push branch and create PR to merge into main, then deploy website.

```bash
cd /home/amir/Documents/career/recent-projects/www.MyAgentive.ai
git push origin feature/fix-installer-missing-files
# Then create PR on GitHub
```

### 2. Stable Release (next → main)
**MyAgentive repo is ready** - all changes on `next` branch, tested on MA002.

When ready for stable release:
```bash
cd /home/amir/Documents/career/recent-projects/MyAgentive
git checkout main
git merge next
# Update version in package.json to 0.7.3 (remove -beta.4)
# Run: ./scripts/build-release.sh
# Create GitHub release
```

## Summary of Fixes in v0.7.3

1. **Agent now uses `save-for-download` tool** - files go to correct location
2. **System prompt auto-upgrade** - version-based, backs up old prompt
3. **Telegram file uploads fixed** - Buffer workaround for Bun HTTPS bug
4. **`send-file` tool added** - explicit file delivery to users
5. **Binary default prompt path fixed** - looks in ~/.myagentive/ not bin/

## Test Confirmation
- MA002 server tested and working
- Prompt auto-upgrade v1 → v2 confirmed
- File delivery to Telegram confirmed
