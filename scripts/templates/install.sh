#!/bin/bash
# MyAgentive Installation Script

set -e

VERSION="__VERSION__"
INSTALL_DIR="${HOME}/.myagentive"

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

# Remove old bin/ directory structure if it exists (migration from old layout)
if [ -d "$INSTALL_DIR/bin" ]; then
    echo "Migrating from old installation layout..."
    rm -f "$INSTALL_DIR/bin/myagentive"
    rm -f "$INSTALL_DIR/bin/myagentivectl"
fi

# Copy files with force overwrite
cp -rf myagentive myagentivectl default-system-prompt.md LICENSE install.sh "$INSTALL_DIR/"
cp -rf dist "$INSTALL_DIR/"
cp -rf .claude "$INSTALL_DIR/"

# Create symlink for CLI
mkdir -p "${HOME}/.local/bin"
ln -sf "$INSTALL_DIR/myagentive" "${HOME}/.local/bin/myagentive"
ln -sf "$INSTALL_DIR/myagentivectl" "${HOME}/.local/bin/myagentivectl"

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
