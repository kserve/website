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
        'getting-started/first_isvc',
        'getting-started/swagger_ui'
      ],
    },
    {
      type: 'category',
      label: 'Model Serving',
      items: [
        {
          type: 'category',
          label: 'Concepts',
          items: [
            'modelserving/control_plane',
            {
              type: 'category',
              label: 'Data Plane',
              items: [
                'modelserving/data_plane/data_plane',
                'modelserving/data_plane/v1_protocol',
                'modelserving/data_plane/v2_protocol',
                'modelserving/data_plane/binary_tensor_data_extension'
              ],
            },
            'modelserving/servingruntimes'
          ],
        },
        {
          type: 'category',
          label: 'Serving Runtimes',
          items: [
            'modelserving/v1beta1/serving_runtime',
            {
              type: 'category',
              label: 'Framework Support',
              items: [
                'modelserving/v1beta1/tensorflow/README',
                'modelserving/v1beta1/torchserve/README',
                'modelserving/v1beta1/sklearn/v2/README',
                'modelserving/v1beta1/xgboost/README',
                'modelserving/v1beta1/onnx/README',
                'modelserving/v1beta1/huggingface/README'
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Administration Guide',
      items: [
        'admin/serverless/serverless',
        'admin/kubernetes_deployment',
        'admin/modelmesh'
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'reference/api',
        'reference/swagger-ui'
      ],
    },
    {
      type: 'category',
      label: 'Community',
      items: [
        'community/adopters',
        'community/get_involved',
        'community/presentations'
      ],
    },
  ],
};

export default sidebars;
