## KServe Website

The KServe documentation website is built using [Docusaurus](https://docusaurus.io/).

### Run website locally

#### Prerequisites
- [Node.js (version 18 or later)](https://nodejs.org/en/download/)
- npm (Node package manager)

#### Steps to run locally
1. Change directory to docusaurus:
  ```bash
  cd docusaurus
  ```
2. Install dependencies:
  ```bash
  npm install
  ```
3. Start the development server:
  ```bash
  npm run start
  ```
By default, a browser window will open at http://localhost:3000.


### Project structure

- `/blog/` - Contains the blog Markdown files. You can delete the directory if you've disabled the blog plugin, or you can change its name after setting the path option. More details can be found in the blog guide
- `/docs/` - Contains the Markdown files for the docs. Customize the order of the docs sidebar in sidebars.js. You can delete the directory if you've disabled the docs plugin, or you can change its name after setting the path option. More details can be found in the docs guide
- `/src/` - Non-documentation files like pages or custom React components. You don't have to strictly put your non-documentation files here, but putting them under a centralized directory makes it easier to specify in case you need to do some sort of linting/processing
- `/src/pages` - Any JSX/TSX/MDX file within this directory will be converted into a website page. More details can be found in the pages guide
- `/static/` - Static directory. Any contents inside here will be copied into the root of the final build directory
- `/docusaurus.config.js` - A config file containing the site configuration. This is the equivalent of siteConfig.js in Docusaurus v1
- `/package.json` - A Docusaurus website is a React app. You can install and use any npm packages you like in them
- `/sidebars.js` - Used by the documentation to specify the order of documents in the sidebar
