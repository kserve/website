# KServe Documentation

Welcome to the source file repository for our documentation on [KServe website](https://kserve.github.io/website/).

## Website

The KServe documentation website is built using [Docusaurus](https://docusaurus.io/).

### View Published Documentation

View all KServe documentation and walk-through our code samples on the [website](https://kserve.github.io/website/).

The KServe website includes versioned docs for recent releases, the KServe blog, links to all community resources, as well as KServe governance and contributor guidelines.

### Run Website Locally

#### Prerequisites
- [Node.js (version 18 or later)](https://nodejs.org/en/download/)
- npm (Node package manager)

#### Steps to Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run start
   ```
By default, a browser window will open at http://localhost:3000.

### Project Structure

- `/blog/` - Contains the blog Markdown files
- `/docs/` - Contains the Markdown files for the documentation
- `/src/` - Non-documentation files like pages or custom React components
- `/src/pages` - Any JSX/TSX/MDX file within this directory will be converted into a website page
- `/static/` - Static directory for assets that will be copied into the root of the final build directory
- `/docusaurus.config.ts` - Configuration file containing the site settings
- `/package.json` - Project dependencies and scripts
- `/sidebars.ts` - Used by the documentation to specify the order of documents in the sidebar

### Documentation Versions for KServe Releases

Each release of the KServe docs is available in the website (starting with 0.3) and their source files are stored in branches of this repo. Take a look at the [release process](https://github.com/kserve/kserve/blob/master/release/RELEASE_PROCESS_v2.md) for more information.

## Contributing to Docs

We're excited that you're interested in contributing to the KServe documentation! Check out the resources below to get started.

### Getting Started

If you want to contribute a fix or add new content to the documentation, you can navigate through the `/docs` directory or use the `Edit this page` pencil icon on each of the pages of the website.

Before you can contribute, first start by reading the KServe contributor guidelines and learning about our community and requirements. In addition to reading about how to contribute to the docs, you should take a moment to learn about the KServe code of conduct, governance, values, and the KServe working groups and committees.

[KServe community and contributor guidelines](https://kserve.github.io/website/docs/developer-guide).

### Contribution Guidelines

When contributing to the documentation, please keep these guidelines in mind:

- Always use relative links for internal links except for static assets
- Use proper punctuation and capitalization
- Use tip admonition instead of success admonition
- Follow the Docusaurus format for documentation files

## Help and Support

Your help and feedback is always welcome!

If you find an issue, let us know by directly opening an [issue](https://github.com/kserve/website/issues/new/choose) in the repo.

If you have a question that you can't find an answer to, we would also like to hear about that too. In addition to our docs, you can also reach out to the community for assistance.
