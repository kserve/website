#!/bin/bash

set -euo pipefail # Exit on error, undefined variables, and pipe failures

# Function to compare versions
version_gt() {
  # Split versions into major and minor components
  IFS='.' read -r major1 minor1 <<< "$1"
  IFS='.' read -r major2 minor2 <<< "$2"

  # Compare major versions first, then minor versions
  if [ "$major1" -lt "$major2" ] || { [ "$major1" -eq "$major2" ] && [ "$minor1" -lt "$minor2" ]; }; then
    return 0
  else
    return 1
  fi
}

# Get the current announced version from docusaurus.config.ts
current_version=$(grep -oP "const announcedVersion = '\K[0-9]+\.[0-9]+(?=')" docusaurus.config.ts)

# Prompt user for the new release version
read -p "Enter the new release version (current: $current_version): " new_version

# Validate the new version is greater than the current version
if ! version_gt "$current_version" "$new_version"; then
  echo "Error: New version must be greater than the current version ($current_version)."
  exit 1
fi

# Set the RELEASE_VERSION environment variable which will be used in Makefile
RELEASE_VERSION=$new_version
export RELEASE_VERSION

# generate API documentation
make gen-api-docs

# Run the release command
npm run docusaurus docs:version "$new_version"

# Update the docsVersionDropdown in docusaurus.config.ts
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

# Update announcedVersion in docusaurus.config.ts
sed -i "s/const announcedVersion = '[0-9]\+\.[0-9]\+'/const announcedVersion = '$new_version'/" docusaurus.config.ts

# Notify the user
echo "Release process completed successfully for version $new_version."
