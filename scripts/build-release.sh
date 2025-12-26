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

# Create release directory
RELEASE_DIR="release"
mkdir -p "$RELEASE_DIR"

# Build frontend
echo "Building frontend..."
bunx vite build

# Build macOS binary
echo "Building macOS binary..."
bun build --compile server/index.ts --outfile dist/myagentive

# Build Linux binary
echo "Building Linux x64 binary..."
bun build --compile --target=bun-linux-x64 server/index.ts --outfile "$RELEASE_DIR/MyAgentive-linux/myagentive"

# Prepare macOS package
echo "Preparing macOS package..."
cp dist/myagentive "$RELEASE_DIR/MyAgentive/"
mkdir -p "$RELEASE_DIR/MyAgentive/dist"
cp -r dist/assets dist/index.html "$RELEASE_DIR/MyAgentive/dist/"
cp LICENSE "$RELEASE_DIR/MyAgentive/"

# Copy skills to .claude/skills (SDK expects this location)
echo "Copying skills..."
rm -rf "$RELEASE_DIR/MyAgentive/.claude/skills"
mkdir -p "$RELEASE_DIR/MyAgentive/.claude"
cp -r .claude/skills "$RELEASE_DIR/MyAgentive/.claude/skills"
# Remove .DS_Store, venv, and other junk
find "$RELEASE_DIR/MyAgentive/.claude/skills" -name '.DS_Store' -delete
find "$RELEASE_DIR/MyAgentive/.claude/skills" -name 'venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive/.claude/skills" -name '.venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive/.claude/skills" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive/.claude/skills" -name '*.pyc' -delete
find "$RELEASE_DIR/MyAgentive/.claude/skills" -name '.env' -delete

chmod +x "$RELEASE_DIR/MyAgentive/install.sh" "$RELEASE_DIR/MyAgentive/myagentivectl" "$RELEASE_DIR/MyAgentive/myagentive"

# Prepare Linux package
echo "Preparing Linux package..."
mkdir -p "$RELEASE_DIR/MyAgentive-linux/dist"
cp -r dist/assets dist/index.html "$RELEASE_DIR/MyAgentive-linux/dist/"
cp LICENSE "$RELEASE_DIR/MyAgentive-linux/"

# Copy skills for Linux to .claude/skills (SDK expects this location)
rm -rf "$RELEASE_DIR/MyAgentive-linux/.claude/skills"
mkdir -p "$RELEASE_DIR/MyAgentive-linux/.claude"
cp -r .claude/skills "$RELEASE_DIR/MyAgentive-linux/.claude/skills"
find "$RELEASE_DIR/MyAgentive-linux/.claude/skills" -name '.DS_Store' -delete
find "$RELEASE_DIR/MyAgentive-linux/.claude/skills" -name 'venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux/.claude/skills" -name '.venv' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux/.claude/skills" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/MyAgentive-linux/.claude/skills" -name '*.pyc' -delete
find "$RELEASE_DIR/MyAgentive-linux/.claude/skills" -name '.env' -delete

chmod +x "$RELEASE_DIR/MyAgentive-linux/myagentive" "$RELEASE_DIR/MyAgentive-linux/install.sh" "$RELEASE_DIR/MyAgentive-linux/myagentivectl"

# Create archives with version
echo "Creating archives..."
cd "$RELEASE_DIR"

# Remove old archives
rm -f MyAgentive-*.tar.gz

# Strip macOS extended attributes to avoid tar warnings on Linux/WSL
echo "Stripping macOS extended attributes..."
xattr -cr MyAgentive 2>/dev/null || true
xattr -cr MyAgentive-linux 2>/dev/null || true

# Create versioned archives (COPYFILE_DISABLE prevents ._* AppleDouble files)
COPYFILE_DISABLE=1 tar -czvf "MyAgentive-v${VERSION}-macos.tar.gz" MyAgentive
COPYFILE_DISABLE=1 tar -czvf "MyAgentive-v${VERSION}-linux-x64.tar.gz" MyAgentive-linux

echo ""
echo "Release packages created:"
ls -lh MyAgentive-v${VERSION}-*.tar.gz
echo ""
echo "Done! Version: $VERSION"
