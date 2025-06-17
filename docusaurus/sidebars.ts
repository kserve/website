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
    {
      type: 'category',
      label: 'Concepts',
      link: {
        type: 'doc',
        id: 'concepts/index',
      },
      items: [
        {
          type: 'category',
          label: 'Architecture',
          link: {
            type: 'doc',
            id: 'concepts/architecture/index',
          },
          items: [
            // "concepts/architecture/system-overview",
            "concepts/architecture/control_plane",
            "concepts/architecture/data_plane/data_plane",
            "concepts/architecture/data_plane/v1_protocol",
            {
              type: 'category',
              label: 'Open Inference Protocol (V2)',
              items: [
                "concepts/architecture/data_plane/v2_protocol/v2_protocol",
                {
                  type: 'category',
                  label: 'Extensions',
                  items: [
                    "concepts/architecture/data_plane/v2_protocol/binary_tensor_data_extension"
                  ],
                }
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Resources',
          link: {
            type: 'doc',
            id: 'concepts/resources/index',
          },
          items: [
            // "concepts/resources/inferenceservice",
            // "concepts/resources/inferencegraph",
            // "concepts/resources/servingruntime",
            // "concepts/resources/localmodel",
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Model Serving',
      items: [
        {
      type: 'category',
      label: 'Generative Inference',
      items: [
        "model-serving/generative-inference/overview",
      ],
    },
      ],
    },
    // {
    //   type: 'category',
    //   label: 'Generative Inference',
    //   items: [
    //   ],`
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
