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
      }, items: [
        {
          type: 'category',
          label: 'Architecture',
          link: {
            type: 'doc',
            id: 'concepts/architecture/index',
          },
          items: [
            "concepts/architecture/control-plane",
            "concepts/architecture/data-plane/data-plane",
            "concepts/architecture/data-plane/v1-protocol",
            {
              type: 'category',
              label: 'Open Inference Protocol (V2)',
              items: [
                "concepts/architecture/data-plane/v2-protocol/v2-protocol",
                {
                  type: 'category',
                  label: 'Extensions',
                  items: [
                    "concepts/architecture/data-plane/v2-protocol/binary-tensor-data-extension"
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
            {
              type: 'category',
              label: 'Tasks',
              items: [
                "model-serving/generative-inference/tasks/text-generation/text-generation",
                "model-serving/generative-inference/tasks/text2text-generation/text2text-generation",
                "model-serving/generative-inference/tasks/embedding/embedding",
                "model-serving/generative-inference/tasks/reranking/rerank",
              ],
            },
            "model-serving/generative-inference/sdk-integration/sdk-integration",
            "model-serving/generative-inference/kvcache-offloading/kvcache-offloading",
            "model-serving/generative-inference/modelcache/localmodel",
            "model-serving/generative-inference/autoscaling/autoscaling",
            "model-serving/generative-inference/multi-node/multi-node",
            "model-serving/generative-inference/ai-gateway/envoy-ai-gateway",
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Administrator Guide',
      items: [
        'admin-guide/overview',
        {
          type: 'category',
          label: 'Generative Inference',
          items: [
            'admin-guide/kubernetes-deployment'
          ]
        },
        {
          type: 'category',
          label: 'Predictive Inference',
          items: [
            'admin-guide/kubernetes-deployment',
            'admin-guide/modelmesh',
            {
              type: 'category',
              label: 'Serverless Deployment',
              items: [
                'admin-guide/serverless/serverless',
                'admin-guide/serverless/kourier-networking/index',
                'admin-guide/serverless/servicemesh/index'
              ]
            }
          ]
        },
        'admin-guide/gatewayapi-migration',
        'admin-guide/configurations',
      ]
    },
    {
      type: 'category',
      label: 'Developer Guide',
      link: {
        type: 'doc',
        id: 'developer-guide/index',
      },
      items: [
        'developer-guide/index',
        'developer-guide/contribution',
        'developer-guide/debugging',
      ],
    },
    // {
    //   type: 'category',
    //   label: 'Advanced Topics',
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
