#!/bin/bash
# Build release packages for MyAgentive
# Creates versioned archives for macOS and Linux

set -e

# Get version from package.json
VERSION=$(grep '"version"' package.json | sed 's/.*"version": "\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Error: Could not read version from package.json"
    exit 1
fi

echo "Building MyAgentive v$VERSION release packages..."

# Update version.ts with current version (for compiled binary)
echo "Updating version.ts..."
cat > server/version.ts << EOF
// This file is auto-generated during build
// DO NOT EDIT MANUALLY - it will be overwritten by build-release.sh
export const APP_VERSION = "$VERSION";
EOF

# Create release directory (clean old files to prevent stale builds)
RELEASE_DIR="release"
echo "Cleaning old release artifacts..."
rm -rf "$RELEASE_DIR/MyAgentive"
rm -rf "$RELEASE_DIR/MyAgentive-linux"
rm -rf "$RELEASE_DIR/MyAgentive-linux-arm64"
rm -rf dist
mkdir -p "$RELEASE_DIR/MyAgentive"
mkdir -p "$RELEASE_DIR/MyAgentive-linux"
mkdir -p "$RELEASE_DIR/MyAgentive-linux-arm64"

# Build frontend
echo "Building frontend..."
bunx vite build

# Build macOS binary (Apple Silicon M1/M2/M3/M4/M5)
# Uses --target for cross-compilation so builds work from any platform
echo "Building macOS binary..."
bun build --compile --target=bun-darwin-arm64 server/index.ts --outfile dist/myagentive

# Build Linux binary
echo "Building Linux x64 binary..."
bun build --compile --target=bun-linux-x64 server/index.ts --outfile "$RELEASE_DIR/MyAgentive-linux/myagentive"

# Build Linux ARM64 binary
echo "Building Linux ARM64 binary..."
bun build --compile --target=bun-linux-arm64 server/index.ts --outfile "$RELEASE_DIR/MyAgentive-linux-arm64/myagentive"

# Prepare macOS package
echo "Preparing macOS package..."
cp dist/myagentive "$RELEASE_DIR/MyAgentive/"
# Copy and configure install script and control script from templates
cp scripts/templates/install.sh "$RELEASE_DIR/MyAgentive/install.sh"
cp scripts/templates/myagentivectl "$RELEASE_DIR/MyAgentive/myagentivectl"
sed -i.bak "s/__VERSION__/$VERSION/g" "$RELEASE_DIR/MyAgentive/install.sh" && rm -f "$RELEASE_DIR/MyAgentive/install.sh.bak"
mkdir -p "$RELEASE_DIR/MyAgentive/dist"
cp -r dist/assets dist/index.html dist/manifest.webmanifest dist/registerSW.js dist/sw.js dist/workbox-*.js "$RELEASE_DIR/MyAgentive/dist/"
cp LICENSE "$RELEASE_DIR/MyAgentive/"
cp server/default-system-prompt.md "$RELEASE_DIR/MyAgentive/"

# Copy skills to discoverable location (install script creates symlink for SDK compatibility)
echo "Copying skills..."
rm -rf "$RELEASE_DIR/MyAgentive/skills"
mkdir -p "$RELEASE_DIR/MyAgentive/skills"
cp -r .claude/skills/* "$RELEASE_DIR/MyAgentive/skills/"
# Remove .DS_Store, venv, and other junk
find "$RELEASE_DIR/MyAgentive/skills" -name '.DS_Store' -delete
find "$RELEASE_DIR/MyAgentive/skills" -name 'venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive/skills" -name '.venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive/skills" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive/skills" -name '*.pyc' -delete
find "$RELEASE_DIR/MyAgentive/skills" -name '.env' -delete

chmod +x "$RELEASE_DIR/MyAgentive/install.sh" "$RELEASE_DIR/MyAgentive/myagentivectl" "$RELEASE_DIR/MyAgentive/myagentive"

# Prepare Linux package
echo "Preparing Linux package..."
# Copy and configure install script and control script from templates
cp scripts/templates/install.sh "$RELEASE_DIR/MyAgentive-linux/install.sh"
cp scripts/templates/myagentivectl "$RELEASE_DIR/MyAgentive-linux/myagentivectl"
sed -i.bak "s/__VERSION__/$VERSION/g" "$RELEASE_DIR/MyAgentive-linux/install.sh" && rm -f "$RELEASE_DIR/MyAgentive-linux/install.sh.bak"
mkdir -p "$RELEASE_DIR/MyAgentive-linux/dist"
cp -r dist/assets dist/index.html dist/manifest.webmanifest dist/registerSW.js dist/sw.js dist/workbox-*.js "$RELEASE_DIR/MyAgentive-linux/dist/"
cp LICENSE "$RELEASE_DIR/MyAgentive-linux/"
cp server/default-system-prompt.md "$RELEASE_DIR/MyAgentive-linux/"

# Copy skills to discoverable location (install script creates symlink for SDK compatibility)
rm -rf "$RELEASE_DIR/MyAgentive-linux/skills"
mkdir -p "$RELEASE_DIR/MyAgentive-linux/skills"
cp -r .claude/skills/* "$RELEASE_DIR/MyAgentive-linux/skills/"
find "$RELEASE_DIR/MyAgentive-linux/skills" -name '.DS_Store' -delete
find "$RELEASE_DIR/MyAgentive-linux/skills" -name 'venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux/skills" -name '.venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux/skills" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux/skills" -name '*.pyc' -delete
find "$RELEASE_DIR/MyAgentive-linux/skills" -name '.env' -delete

chmod +x "$RELEASE_DIR/MyAgentive-linux/myagentive" "$RELEASE_DIR/MyAgentive-linux/install.sh" "$RELEASE_DIR/MyAgentive-linux/myagentivectl"

# Prepare Linux ARM64 package
echo "Preparing Linux ARM64 package..."
cp scripts/templates/install.sh "$RELEASE_DIR/MyAgentive-linux-arm64/install.sh"
cp scripts/templates/myagentivectl "$RELEASE_DIR/MyAgentive-linux-arm64/myagentivectl"
sed -i.bak "s/__VERSION__/$VERSION/g" "$RELEASE_DIR/MyAgentive-linux-arm64/install.sh" && rm -f "$RELEASE_DIR/MyAgentive-linux-arm64/install.sh.bak"
mkdir -p "$RELEASE_DIR/MyAgentive-linux-arm64/dist"
cp -r dist/assets dist/index.html dist/manifest.webmanifest dist/registerSW.js dist/sw.js dist/workbox-*.js "$RELEASE_DIR/MyAgentive-linux-arm64/dist/"
cp LICENSE "$RELEASE_DIR/MyAgentive-linux-arm64/"
cp server/default-system-prompt.md "$RELEASE_DIR/MyAgentive-linux-arm64/"

# Copy skills to discoverable location (install script creates symlink for SDK compatibility)
rm -rf "$RELEASE_DIR/MyAgentive-linux-arm64/skills"
mkdir -p "$RELEASE_DIR/MyAgentive-linux-arm64/skills"
cp -r .claude/skills/* "$RELEASE_DIR/MyAgentive-linux-arm64/skills/"
find "$RELEASE_DIR/MyAgentive-linux-arm64/skills" -name '.DS_Store' -delete
find "$RELEASE_DIR/MyAgentive-linux-arm64/skills" -name 'venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux-arm64/skills" -name '.venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux-arm64/skills" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux-arm64/skills" -name '*.pyc' -delete
find "$RELEASE_DIR/MyAgentive-linux-arm64/skills" -name '.env' -delete

chmod +x "$RELEASE_DIR/MyAgentive-linux-arm64/myagentive" "$RELEASE_DIR/MyAgentive-linux-arm64/install.sh" "$RELEASE_DIR/MyAgentive-linux-arm64/myagentivectl"

# Create archives with version
echo "Creating archives..."
cd "$RELEASE_DIR"

# Remove old archives
rm -f MyAgentive-*.tar.gz

# Strip macOS extended attributes to avoid tar warnings on Linux/WSL
echo "Stripping macOS extended attributes..."
xattr -cr MyAgentive 2>/dev/null || true
xattr -cr MyAgentive-linux 2>/dev/null || true
xattr -cr MyAgentive-linux-arm64 2>/dev/null || true

# Use GNU tar if available (supports --no-xattrs to prevent xattr headers in archive)
# Install with: brew install gnu-tar
if command -v gtar &> /dev/null; then
    echo "Using GNU tar (gtar) for clean archives..."
    COPYFILE_DISABLE=1 gtar --no-xattrs -czvf "MyAgentive-v${VERSION}-macos.tar.gz" MyAgentive
    COPYFILE_DISABLE=1 gtar --no-xattrs -czvf "MyAgentive-v${VERSION}-linux-x64.tar.gz" MyAgentive-linux
    COPYFILE_DISABLE=1 gtar --no-xattrs -czvf "MyAgentive-v${VERSION}-linux-arm64.tar.gz" MyAgentive-linux-arm64
else
    echo "Warning: GNU tar (gtar) not found. Archives may show xattr warnings on Linux."
    echo "Install with: brew install gnu-tar"
    # Fallback to BSD tar (COPYFILE_DISABLE prevents ._* AppleDouble files but not xattr headers)
    COPYFILE_DISABLE=1 tar -czvf "MyAgentive-v${VERSION}-macos.tar.gz" MyAgentive
    COPYFILE_DISABLE=1 tar -czvf "MyAgentive-v${VERSION}-linux-x64.tar.gz" MyAgentive-linux
    COPYFILE_DISABLE=1 tar -czvf "MyAgentive-v${VERSION}-linux-arm64.tar.gz" MyAgentive-linux-arm64
fi

echo ""
echo "Release packages created:"
ls -lh MyAgentive-v${VERSION}-*.tar.gz
echo ""
echo "Done! Version: $VERSION"
