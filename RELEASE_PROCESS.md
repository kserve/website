# Release Process for KServe Documentation Website

This document outlines the steps to create a new release for the KServe documentation website. Follow these steps carefully to ensure a smooth release process.

## Prerequisites

1. Ensure you have the necessary permissions to make changes to the repository.
2. Install the required tools:
   - Node.js and npm
3. Verify that the `Makefile` and `release.sh` scripts are up-to-date.

## Steps

### 1. Update the Version

1. Run the following command to start the release process:
   ```bash
   make bump-version
   ```
2. Enter the new version when prompted. Ensure the new version is greater than the current version.

### 2. Verify Changes

1. Check the `docusaurus.config.ts` file to ensure the following:
   - The `announcedVersion` variable is updated to the new version.
   - The new version is added to the `docsVersionDropdown` field.
2. Verify that the API documentation files are updated in the `docs/reference` directory. Note that the API documentation is automatically generated as part of the `bump-version` process in the `release.sh` script.

### 3. Test the Changes

1. Start the local development server:
   ```bash
   npm run start
   ```
2. Navigate to the website in your browser and verify the following:
   - The new version appears in the version dropdown.
   - The announcement bar displays the correct version.
   - All links and pages work as expected.

### 4. Commit and Push Changes

1. Commit the changes:
   ```bash
   git add .
   git commit -m "Release version <new_version>"
   ```
2. Push the changes to the repository:
   ```bash
   git push origin main
   ```

### 5. Create a Pull Request

1. Open a pull request to merge the changes into the `main` branch.
2. Add a detailed description of the changes.
3. Request reviews from the team.

### 6. Merge and Deploy

1. Once the pull request is approved, merge it into the `main` branch.
2. The website will automatically deploy the changes upon merging using GitHub Actions.

### 7. Post-Release Tasks

1. Verify the deploy GitHub Action logs to ensure the deployment was successful.
2. Verify the live website to ensure the changes are reflected.
3. Announce the new release on relevant channels (e.g., Slack, mailing list).

## Notes

- The `release.sh` script handles most of the release process automatically, including generating API documentation.
- Always test the changes locally before pushing them to the repository.
