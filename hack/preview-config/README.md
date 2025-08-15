# KServe Website Preview Configuration Scripts

This directory contains utility scripts for configuring Netlify preview deployments of the KServe documentation website.

### update-preview-config.js

This script updates the Docusaurus configuration for Netlify preview deployments:

- Changes the `baseUrl` to `/` (root path)
- Sets the `url` to the Netlify deploy preview URL from environment variables

The script is automatically executed in the Netlify CI/CD pipeline for:
- Deploy Previews (pull requests)
- Branch Deployments

#### Usage

```bash
# Manual execution
node hack/preview-config/update-preview-config.js

# Using npm script
npm run update-preview-config
```

## Implementation Details

The scripts are integrated into the Netlify build process through the `netlify.toml` configuration file, where they run before the build command for deploy previews and branch deployments.
