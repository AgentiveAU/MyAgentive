#!/bin/bash
# MyAgentive Installation Script

set -e

VERSION="__VERSION__"
INSTALL_DIR="${HOME}/.myagentive"
BIN_DIR="$INSTALL_DIR/bin"

echo "Installing MyAgentive v${VERSION}..."

# Stop running service if myagentivectl exists and service is running
if [ -x "${HOME}/.local/bin/myagentivectl" ]; then
    if "${HOME}/.local/bin/myagentivectl" status 2>/dev/null | grep -q "is running"; then
        echo "Stopping running MyAgentive service..."
        "${HOME}/.local/bin/myagentivectl" stop || true
        sleep 1
    fi
elif [ -x "$INSTALL_DIR/myagentivectl" ]; then
    if "$INSTALL_DIR/myagentivectl" status 2>/dev/null | grep -q "is running"; then
        echo "Stopping running MyAgentive service..."
        "$INSTALL_DIR/myagentivectl" stop || true
        sleep 1
    fi
fi

# Create installation directory
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

# Remove old flat layout binaries if they exist (migration to bin/ structure)
if [ -f "$INSTALL_DIR/myagentive" ] && [ ! -L "$INSTALL_DIR/myagentive" ]; then
    echo "Migrating from old installation layout..."
    rm -f "$INSTALL_DIR/myagentive"
    rm -f "$INSTALL_DIR/myagentivectl"
fi

# Copy files with force overwrite
cp -rf myagentive myagentivectl save-for-download "$BIN_DIR/"
if [ -f "send-file" ]; then
    cp -rf send-file "$BIN_DIR/"
fi
cp -rf default-system-prompt.md LICENSE install.sh "$INSTALL_DIR/"
cp -rf dist "$INSTALL_DIR/"
# Copy skills to discoverable location
mkdir -p "$INSTALL_DIR/skills"
if [ -d "skills" ]; then
    cp -rf skills/* "$INSTALL_DIR/skills/" 2>/dev/null || true
fi

# Create .claude directory and symlink for SDK compatibility
mkdir -p "$INSTALL_DIR/.claude"
rm -rf "$INSTALL_DIR/.claude/skills"
ln -sf "../skills" "$INSTALL_DIR/.claude/skills"

# Create symlinks for CLI and tools
mkdir -p "${HOME}/.local/bin"
ln -sf "$BIN_DIR/myagentive" "${HOME}/.local/bin/myagentive"
ln -sf "$BIN_DIR/myagentivectl" "${HOME}/.local/bin/myagentivectl"
ln -sf "$BIN_DIR/save-for-download" "${HOME}/.local/bin/save-for-download"
if [ -f "$BIN_DIR/send-file" ]; then
    ln -sf "$BIN_DIR/send-file" "${HOME}/.local/bin/send-file"
fi

echo ""
echo "MyAgentive v${VERSION} installed successfully!"
echo ""
echo "Make sure ~/.local/bin is in your PATH:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Start MyAgentive with:"
echo "  myagentive"
echo ""
echo "Or use the control script:"
echo "  myagentivectl start"
