#!/bin/bash

set -euo pipefail # Exit on error, undefined variables, and pipe failures

# Parse flags
FORCE=false
PREVIOUS_VERSION=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    --previous-version) PREVIOUS_VERSION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Function to compare versions
version_gt() {
  # Split versions into major and minor components
  IFS='.' read -r major1 minor1 <<< "$1"
  IFS='.' read -r major2 minor2 <<< "$2"

  # Compare major versions first, then minor versions
  if [ "$major1" -lt "$major2" ] || { [ "$major1" -eq "$major2" ] && [ "$minor1" -le "$minor2" ]; }; then
    return 0
  else
    return 1
  fi
}

# Get the current announced version from docusaurus.config.ts
current_version=$(grep -oP "const announcedVersion = '\K[0-9]+\.[0-9]+(?=')" docusaurus.config.ts)

# Prompt user for the new release version
read -p "Enter the new release version (current: $current_version): " new_version

# Validate the new version is greater than the current version, unless --force is used to regenerate
if ! version_gt "$current_version" "$new_version" && [ "$FORCE" = false ]; then
  echo "Error: New version must be greater than the current version ($current_version). Use --force to regenerate."
  exit 1
fi

# When regenerating, clean up the old snapshot and temporarily update config
if [ "$FORCE" = true ]; then
  if [ -z "$PREVIOUS_VERSION" ]; then
    echo "Error: --previous-version is required with --force."
    exit 1
  fi
  rm -rf "versioned_docs/version-$new_version"
  rm -f "versioned_sidebars/version-$new_version-sidebars.json"
  sed -i "/\"$new_version\"/d" versions.json
  # Temporarily point announcedVersion to previous version so docusaurus can validate
  sed -i "s/const announcedVersion = '$new_version'/const announcedVersion = '$PREVIOUS_VERSION'/" docusaurus.config.ts
  sed -i "/'$new_version': { label: '$new_version' },/d" docusaurus.config.ts
fi

# Set the RELEASE_VERSION environment variable which will be used in Makefile
RELEASE_VERSION=$new_version
export RELEASE_VERSION

# Update version numbers in documentation (before creating snapshot)
echo "Updating version numbers in documentation from v$current_version to v$new_version..."

# Update helm commands with --version flag (including .0 patch version)
find docs/ -type f -name "*.md" \
  -exec sed -i "s|--version v$current_version\\.0|--version v$new_version.0|g" {} +

# Update kubectl apply URLs (including .0 patch version)
find docs/ -type f -name "*.md" \
  -exec sed -i "s|releases/download/v$current_version\\.0/|releases/download/v$new_version.0/|g" {} +

# Update container image tags (including .0 patch version)
find docs/ -type f -name "*.md" \
  -exec sed -i "s|\(image: kserve/[^:]*:\)v$current_version\\.0|\1v$new_version.0|g" {} +

# Update kserve-install.sh --kserve-version flag (including .0 patch version)
find docs/ -type f -name "*.md" \
  -exec sed -i "s|--kserve-version v$current_version\\.0|--kserve-version v$new_version.0|g" {} +

# Update "KServe v{version}" references (including .0 patch version)
find docs/ -type f -name "*.md" \
  -exec sed -i "s|KServe v$current_version\\.0|KServe v$new_version.0|g" {} +

echo "Version numbers updated successfully."

# Pin kserve version in example requirements.txt files (before snapshot so versioned_docs inherits it)
echo "Pinning kserve version in example requirements.txt files..."
find docs/ -type f -name "requirements.txt" \
  -exec sed -i "s|^kserve\(\[.*\]\)\{0,1\}\(==.*\)\{0,1\}$|kserve\1==$new_version.0|" {} +
echo "kserve version pinned to $new_version.0 in example requirements.txt files."

# generate API documentation
make gen-api-docs

# Run the release command (prepends $new_version to versions.json; prior versions stay)
npm run docusaurus docs:version "$new_version"

# When regenerating, restore the config and exit
if [ "$FORCE" = true ]; then
  sed -i "s/const announcedVersion = '$PREVIOUS_VERSION'/const announcedVersion = '$new_version'/" docusaurus.config.ts
  # Re-add version to dropdown
  sed -i "/label: 'nightly'/{n;s|$|\n            '$new_version': { label: '$new_version' },|}" docusaurus.config.ts
  echo "Version $new_version regenerated successfully."
  exit 0
fi

# Update the docsVersionDropdown in docusaurus.config.ts
# Step 1: Add new version to versions section
awk -v new_version="$new_version" '
  /versions: {/ {inside_versions=1; depth=1; print; next}
  inside_versions {
    if (/}/) depth--
    # detect closing of the "current" block
    if ($0 ~ /label:.*nightly/) {
      print
      getline
      print $0
      print "            \x27" new_version "\x27: { label: \x27" new_version "\x27 },"
      next
    }
  }
  {print}
' docusaurus.config.ts > temp && mv temp docusaurus.config.ts

# Prior stable versions remain in versions.json and navbar; legacy MkDocs snapshots
# stay under https://kserve.github.io/archive/ (dropdownItemsAfter) without adding new ones here.

# Update announcedVersion in docusaurus.config.ts
sed -i "s/const announcedVersion = '[0-9]\+\.[0-9]\+'/const announcedVersion = '$new_version'/" docusaurus.config.ts

# Notify the user
echo "Release process completed successfully for version $new_version."
