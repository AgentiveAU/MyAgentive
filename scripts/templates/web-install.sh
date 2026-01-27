#!/bin/bash
# MyAgentive Web Installer
# Downloads and installs MyAgentive from GitHub releases
#
# Usage:
#   curl -fsSL https://myagentive.ai/install | bash
#   curl -fsSL https://myagentive.ai/install | bash -s -- --testing
#
# Options:
#   --testing    Install the latest testing (prerelease) build

set -e

REPO="AgentiveAU/MyAgentive"
CHANNEL="stable"
TMPDIR=$(mktemp -d)

cleanup() {
    rm -rf "$TMPDIR"
}
trap cleanup EXIT

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --testing)
            CHANNEL="testing"
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: curl -fsSL https://myagentive.ai/install | bash -s -- [--testing]"
            exit 1
            ;;
    esac
done

# Detect OS
OS=$(uname -s)
case "$OS" in
    Darwin)
        PLATFORM="macos"
        ;;
    Linux)
        PLATFORM="linux"
        ;;
    *)
        echo "Error: Unsupported operating system: $OS"
        exit 1
        ;;
esac

# Detect architecture (for Linux)
if [ "$PLATFORM" = "linux" ]; then
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64)
            PLATFORM="linux-x64"
            ;;
        aarch64|arm64)
            PLATFORM="linux-arm64"
            ;;
        *)
            echo "Error: Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
fi

echo "MyAgentive Installer"
echo "Channel: $CHANNEL"
echo "Platform: $PLATFORM"
echo ""

# Fetch release info from GitHub API
if [ "$CHANNEL" = "testing" ]; then
    echo "Fetching latest testing release..."
    RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases" | grep -m1 -B50 '"prerelease": true' | head -60)
    if [ -z "$RELEASE_JSON" ]; then
        echo "Error: No testing (prerelease) release found."
        echo "Try installing the stable version instead (without --testing)."
        exit 1
    fi
    # Extract tag from the first prerelease
    TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases" \
        | python3 -c "
import sys, json
releases = json.load(sys.stdin)
for r in releases:
    if r['prerelease']:
        print(r['tag_name'])
        break
" 2>/dev/null)
else
    echo "Fetching latest stable release..."
    TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
        | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data['tag_name'])
" 2>/dev/null)
fi

if [ -z "$TAG" ]; then
    echo "Error: Could not determine release version."
    echo "Check https://github.com/$REPO/releases for available releases."
    exit 1
fi

VERSION="${TAG#v}"
echo "Version: $VERSION ($TAG)"

# Construct download URL
ARCHIVE="MyAgentive-${TAG}-${PLATFORM}.tar.gz"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$ARCHIVE"

echo "Downloading $ARCHIVE..."
if ! curl -fSL --progress-bar -o "$TMPDIR/$ARCHIVE" "$DOWNLOAD_URL"; then
    echo ""
    echo "Error: Failed to download $DOWNLOAD_URL"
    echo "Check https://github.com/$REPO/releases/tag/$TAG for available assets."
    exit 1
fi

# Extract archive
echo "Extracting..."
cd "$TMPDIR"
tar -xzf "$ARCHIVE"

# Find and run the install script
# The archive extracts to MyAgentive/ or MyAgentive-linux/ etc.
INSTALL_DIR=$(find . -maxdepth 1 -type d -name 'MyAgentive*' | head -1)
if [ -z "$INSTALL_DIR" ] || [ ! -f "$INSTALL_DIR/install.sh" ]; then
    echo "Error: Could not find install.sh in extracted archive."
    exit 1
fi

cd "$INSTALL_DIR"
bash install.sh

echo ""
if [ "$CHANNEL" = "testing" ]; then
    echo "Testing build $TAG installed. Report issues at:"
    echo "  https://github.com/$REPO/issues"
fi
