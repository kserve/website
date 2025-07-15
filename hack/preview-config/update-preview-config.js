#!/usr/bin/env node

/**
 * This script updates the Docusaurus configuration for Netlify preview deployments.
 * It changes the baseUrl to '/' and sets the url to the Netlify deploy preview URL.
 */

const fs = require("fs");
const path = require("path");

// Get the Netlify deploy preview URL from environment variables
const deployUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";

if (!deployUrl) {
  console.error(
    "Error: No DEPLOY_URL or DEPLOY_PRIME_URL environment variable found."
  );
  process.exit(1);
}

console.log(`Updating config for deploy preview URL: ${deployUrl}`);

// Path to the docusaurus config file
const configFilePath = path.join(__dirname, "..", "..", "docusaurus.config.ts");

try {
  // Read the current config file
  let configContent = fs.readFileSync(configFilePath, "utf8");

  // Replace baseUrl with '/'
  configContent = configContent.replace(
    /baseUrl:.*?['"]\/.*?['"]/,
    "baseUrl: '/'"
  );

  // Replace the URL with the Netlify deploy preview URL
  configContent = configContent.replace(
    /url:.*?['"].*?['"]/,
    `url: '${deployUrl}'`
  );

  // Write the updated config back to the file
  fs.writeFileSync(configFilePath, configContent);

  console.log(
    "Successfully updated docusaurus.config.ts for preview deployment."
  );
} catch (error) {
  console.error("Error updating configuration:", error);
  process.exit(1);
}
