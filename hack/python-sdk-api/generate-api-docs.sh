#!/bin/bash

# This script generates API documentation for the Python Runtime SDK.

set -eo pipefail

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

# Generate runtime API documentation
echo "Generating runtime API documentation..."
pydoc-markdown -m kserve.model_server -m kserve.model -m kserve.protocol.infer_type hack/python-sdk-api/runtime-sdk-pydoc-markdown.yml

# Add frontmatter to the generated runtime API documentation
RUNTIME_API_DOC_PATH="docs/reference/python-runtime-sdk/python-runtime-sdk-api.md"
if [ -f "$RUNTIME_API_DOC_PATH" ]; then
  echo "Adding frontmatter to the API documentation..."
  # Create a temporary file with the desired frontmatter
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOF
---
title: Python Runtime SDK API
displayed_sidebar: docsSidebar
---
# Python Runtime SDK API
$(cat "$RUNTIME_API_DOC_PATH")
EOF
  # Replace the original file with the temporary file
  mv "$TEMP_FILE" "$RUNTIME_API_DOC_PATH"
  echo "Frontmatter added successfully."
else
  echo "Error: Generated API documentation not found at $RUNTIME_API_DOC_PATH"
  exit 1
fi

# Add frontmatter to the generated controlplane API documentation
RUNTIME_API_DOC_PATH="docs/reference/python-runtime-sdk/python-runtime-sdk-api.md"
if [ -f "$RUNTIME_API_DOC_PATH" ]; then
  echo "Adding frontmatter to the runtime API documentation..."
  # Create a temporary file with the desired frontmatter
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOF
---
title: Python Runtime SDK API
displayed_sidebar: docsSidebar
---
# Python Runtime SDK API
$(cat "$RUNTIME_API_DOC_PATH")
EOF
  # Replace the original file with the temporary file
  mv "$TEMP_FILE" "$RUNTIME_API_DOC_PATH"
  echo "Frontmatter added successfully."
else
  echo "Error: Generated API documentation not found at $RUNTIME_API_DOC_PATH"
  exit 1
fi



# Generate controlplane API documentation
echo "Generating controlplane API documentation..."
pydoc-markdown -m kserve.api.kserve_client -m kserve.api.creds_utils -p kserve.models hack/python-sdk-api/controlplane-sdk-pydoc-markdown.yml

# Add frontmatter to the generated controlplane API documentation
CONTROLPLANE_API_DOC_PATH="docs/reference/controlplane-client/controlplane-client-api.md"
if [ -f "$CONTROLPLANE_API_DOC_PATH" ]; then
  echo "Adding frontmatter to the control plane API documentation..."
  # Create a temporary file with the desired frontmatter
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOF
---
title: Python Control Plane SDK API
displayed_sidebar: docsSidebar
---
# Python Control Plane SDK API
$(cat "$CONTROLPLANE_API_DOC_PATH")
EOF
  # Replace the original file with the temporary file
  mv "$TEMP_FILE" "$CONTROLPLANE_API_DOC_PATH"
  echo "Frontmatter added successfully."
else
  echo "Error: Generated API documentation not found at $CONTROLPLANE_API_DOC_PATH"
  exit 1
fi

# Replace the entire sentence '<hostname>.<subdomain>.<pod namespace>.svc.<cluster domain>' with '&lt;hostname&gt;.&lt;subdomain&gt;.&lt;pod namespace&gt;.svc.&lt;cluster domain&gt;'
find docs/reference -type f -name "*.md" -exec \
sed -i 's|<hostname>\.<subdomain>\.<pod namespace>\.svc\.<cluster domain>|\&lt;hostname\&gt;.\&lt;subdomain\&gt;.\&lt;pod namespace\&gt;.svc.\&lt;cluster domain\&gt;|g' {} +

echo "API documentation generation completed successfully."

# Deactivate virtual environment
deactivate
