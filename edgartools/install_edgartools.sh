#!/bin/bash

# Follow official edgartools installation guide
echo "Installing edgartools per official documentation..."

# Clean slate
python3 -m pip uninstall -y edgartools hishel httpx stamina beautifulsoup4

# Install following docs
python3 -m pip install edgartools

echo "✓ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Update your Python scripts to set identity:"
echo "   from edgar import *"
echo "   set_identity('your.email@example.com')"
echo ""
echo "2. View the quick start: https://edgartools.readthedocs.io/en/latest/quickstart/"
