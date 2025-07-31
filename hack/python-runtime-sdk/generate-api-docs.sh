#!/bin/bash

# This script generates API documentation for the Python Runtime SDK.

set -e

# Set working directory to the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$ROOT_DIR"

echo "Working directory: $(pwd)"

# Create virtual environment if not present
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install required packages
echo "Installing required packages..."
pip install pydoc-markdown
pip install kserve

# Generate API documentation
echo "Generating API documentation..."
pydoc-markdown -m kserve.model_server -m kserve.model -m kserve.protocol.infer_type hack/python-runtime-sdk/pydoc-markdown.yml

# Add frontmatter to the generated API documentation
API_DOC_PATH="docs/reference/python-runtime-sdk/python-runtime-sdk-api.md"
if [ -f "$API_DOC_PATH" ]; then
  echo "Adding frontmatter to the API documentation..."
  # Create a temporary file with the desired frontmatter
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOF
---
title: Python Runtime SDK API
displayed_sidebar: docsSidebar
---
# Python Runtime SDK API
$(cat "$API_DOC_PATH")
EOF
  # Replace the original file with the temporary file
  mv "$TEMP_FILE" "$API_DOC_PATH"
  echo "Frontmatter added successfully."
else
  echo "Error: Generated API documentation not found at $API_DOC_PATH"
  exit 1
fi

echo "API documentation generation completed successfully."
echo "Documentation available at: $API_DOC_PATH"

# Deactivate virtual environment
deactivate
