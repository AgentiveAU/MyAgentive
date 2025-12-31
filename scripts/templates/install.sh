#!/bin/bash
# MyAgentive Installation Script

set -e

VERSION="__VERSION__"
INSTALL_DIR="${HOME}/.myagentive"

echo "Installing MyAgentive v${VERSION}..."

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy files
cp -r . "$INSTALL_DIR/"

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
