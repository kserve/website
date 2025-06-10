import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // KServe documentation sidebar
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quickstart-guide',
        'getting-started/first-isvc',
        'getting-started/swagger-ui'
      ],
    },
    // {
    //   type: 'category',
    //   label: 'Concepts',
    //   items: [
        
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Generative Inference',
    //   items: [
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Predictive Inference',
    //   items: [
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Advanced Topics',
    //   items: [
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Administration Guide',
    //   items: [
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Contributing',
    //   items: [
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'API Reference',
    //   items: [
    //   ],
    // },
  ],
};

export default sidebars;
