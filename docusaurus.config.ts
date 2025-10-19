import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import rehypeExternalLinks from 'rehype-external-links'
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// TODO: Automatically update this version when releasing a new version
// The latest announcedVersion
const announcedVersion = '0.15';

const config: Config = {
  title: 'KServe',
  tagline: 'Standardized Distributed Generative and Predictive AI Inference Platform for Scalable, Multi-Framework Deployment on Kubernetes',
  favicon: 'img/favicon-32x32.png',

  // Set the production url of your site here
  url: 'https://kserve.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/website/',

  // GitHub pages deployment config.
  organizationName: 'kserve', // Usually your GitHub org/user name.
  projectName: 'website', // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  staticDirectories: ['static'],

  // Enable mermaid diagrams
  markdown: {
    mermaid: true,
  },
  themes: [
    // This theme is used to render mermaid diagrams in markdown files
    '@docusaurus/theme-mermaid',
    // This theme is used to render OpenAPI documentation
    'docusaurus-theme-openapi-docs',
  ],

  presets: [
    [
      'classic',
      {
        debug: true,
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/kserve/website/tree/main/',
          // TODO: Uncomment this once the 0.16 release is out
          // lastVersion: announcedVersion,
          rehypePlugins: [rehypeExternalLinks],
          // Used by OpenAPI Plugin for Open Inference Protocol API documentation.
          docItemComponent: "@theme/ApiItem",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/kserve/website/tree/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/kserve-logo.png',
    metadata: [
      { name: 'keywords', content: 'machine learning, kubernetes, model serving, inference, AI, ML, serverless, MLOps, model inference, generative AI, LLM, AI model deployment' },
      { name: 'description', content: 'KServe: A Kubernetes Custom Resource for serving ML models on Kubernetes with autoscaling and standardized inference protocols for both predictive and generative AI models' }
    ],
    announcementBar: {
      id: `announcementBar-v${announcedVersion}`,
      content: `🎉️ <b><a target="_blank" href="https://kserve.github.io/website/blog/kserve-${announcedVersion}-release">KServe v${announcedVersion}</a> is out!</b> 🥳️`,
      backgroundColor: '#588be8',
      textColor: '#ffffff',
    },
    navbar: {
      title: 'KServe',
      logo: {
        alt: 'KServe Logo',
        src: 'img/kserve-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          type: 'docsVersionDropdown',
          position: 'left',
          versions: {
            'current': {
              label: 'nightly',
            },
          },
          dropdownItemsAfter: [
            {
              href: 'https://kserve.github.io/archive/0.15/',
              label: '0.15',
            },
            {
              href: 'https://kserve.github.io/archive/0.14/',
              label: '0.14 ',
            },
            {
              href: 'https://kserve.github.io/archive/0.13/',
              label: '0.13',
            },
            {
              href: 'https://kserve.github.io/archive/0.12/',
              label: '0.12',
            },
            {
              href: 'https://kserve.github.io/archive/0.11/',
              label: '0.11',
            },
          ],
        },
        {
          type: 'docSidebar',
          sidebarId: 'communitySidebar',
          position: 'right',
          label: 'Community',
        },
        {
          href: 'https://github.com/kserve/kserve',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Get Started',
              to: '/docs/getting-started/quickstart-guide',
            },
            {
              label: 'GenAI Model Serving Guide',
              to: '/docs/model-serving/generative-inference/overview',
            },
            {
              label: 'Predictive AI Model Serving Guide',
              to: '/docs/model-serving/predictive-inference/frameworks/overview',
            },
            {
              label: 'API Reference',
              to: '/docs/reference/crd-api',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Slack',
              href: 'https://cloud-native.slack.com/archives/C06AH2C3K8B',
            },
            {
              label: 'Community Meetings',
              href: 'https://zoom-lfx.platform.linuxfoundation.org/meetings/kserve?view=month',
            },
            {
              label: 'Community Meetings Notes',
              href: 'https://docs.google.com/document/d/1KZUURwr9MnHXqHA08TFbfVbM8EAJSJjmaMhnvstvi-k',
            },
            {
              label: 'Get Involved',
              to: '/docs/community/get-involved',
            },
            {
              label: 'Adopters',
              to: '/docs/community/adopters',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'Presentations',
              to: '/docs/community/presentations',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/kserve/kserve',
            },

          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The KServe Authors. All rights reserved. <br/> The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our Trademark Usage page.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
  plugins: [
    // Local Search Plugin
    // This plugin adds a search box to the navbar and generates a search index
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: 'docs',
        blogRouteBasePath: 'blog',
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
    // OpenAPI Docs Plugin for Open Inference Protocol API documentation.
    // This plugin generates API documentation from OpenAPI specs
    // https://github.com/PaloAltoNetworks/docusaurus-openapi-docs
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: "oip", // plugin id
        docsPluginId: "classic", // configured for preset-classic
        config: {
          oip: {
            specPath: "https://raw.githubusercontent.com/kserve/open-inference-protocol/main/specification/protocol/open_inference_rest.yaml",
            outputDir: "docs/reference/oip",
            hideSendButton: false,
            sidebarOptions: {
              groupPathsBy: "tag",
            },
          } satisfies OpenApiPlugin.Options,
        }
      },
    ],
    // Old Url Redirects
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          // Get Started Section
          {
            from: '/latest/get_started',
            to: '/docs/getting-started/quickstart-guide',
          },
          {
            from: '/latest/get_started/first_isvc/',
            to: '/docs/getting-started/predictive-first-isvc',
          },
          {
            from: '/latest/get_started/swagger_ui/',
            to: '/docs/getting-started/swagger-ui',
          },

          // Concepts Section
          {
            from: '/latest/modelserving/control_plane/',
            to: '/docs/concepts/architecture/control-plane',
          },
          {
            from: '/latest/modelserving/data_plane/data_plane/',
            to: '/docs/concepts/architecture/data-plane',
          },
          {
            from: '/latest/modelserving/data_plane/v1_protocol/',
            to: '/docs/concepts/architecture/data-plane/v1-protocol',
          },
          {
            from: '/latest/modelserving/data_plane/v2_protocol/',
            to: '/docs/concepts/architecture/data-plane/v2-protocol',
          },
          {
            from: '/latest/modelserving/data_plane/binary_tensor_data_extension/',
            to: '/docs/concepts/architecture/data-plane/v2-protocol/binary-tensor-data-extension',
          },
          {
            from: '/latest/modelserving/servingruntimes/',
            to: '/docs/concepts/resources/servingruntime',
          },

          // Generative Inference Section
          {
            from: '/latest/modelserving/v1beta1/llm/huggingface/',
            to: '/docs/model-serving/generative-inference/overview',
          },
          {
            from: '/latest/modelserving/v1beta1/llm/huggingface/text_generation/',
            to: '/docs/model-serving/generative-inference/tasks/text-generation',
          },
          {
            from: '/latest/modelserving/v1beta1/llm/huggingface/text2text_generation/',
            to: '/docs/model-serving/generative-inference/tasks/text2text-generation',
          },
          {
            from: '/latest/modelserving/v1beta1/llm/huggingface/sdk_integration/',
            to: '/docs/model-serving/generative-inference/sdk-integration',
          },
          {
            from: '/latest/modelserving/v1beta1/llm/huggingface/multi-node/',
            to: '/docs/model-serving/generative-inference/multi-node',
          },
          {
            from: '/latest/modelserving/storage/modelcache/localmodel/',
            to: '/docs/model-serving/generative-inference/modelcache/localmodel',
          },
          {
            from: '/latest/modelserving/autoscaling/keda/autoscaling_llm/',
            to: '/docs/model-serving/generative-inference/autoscaling',
          },
          {
            from: '/latest/modelserving/v1beta1/llm/huggingface/kv_cache_offloading/',
            to: '/docs/model-serving/generative-inference/kvcache-offloading',
          },
          {
            from: '/latest/admin/ai-gateway_integration/',
            to: '/docs/model-serving/generative-inference/ai-gateway/envoy-ai-gateway',
          },

          // Predictive Inference Section
          {
            from: '/latest/modelserving/v1beta1/serving_runtime/',
            to: '/docs/model-serving/predictive-inference/frameworks/tensorflow',
          },
          {
            from: '/latest/modelserving/v1beta1/sklearn/v2/',
            to: '/docs/model-serving/predictive-inference/frameworks/sklearn',
          },
          {
            from: '/latest/modelserving/v1beta1/xgboost/',
            to: '/docs/model-serving/predictive-inference/frameworks/xgboost',
          },
          {
            from: '/latest/modelserving/v1beta1/pmml/',
            to: '/docs/model-serving/predictive-inference/frameworks/pmml',
          },
          {
            from: '/latest/modelserving/v1beta1/spark/',
            to: '/docs/model-serving/predictive-inference/frameworks/spark-mllib',
          },
          {
            from: '/latest/modelserving/v1beta1/lightgbm/',
            to: '/docs/model-serving/predictive-inference/frameworks/lightgbm',
          },
          {
            from: '/latest/modelserving/v1beta1/paddle/',
            to: '/docs/model-serving/predictive-inference/frameworks/paddle',
          },
          {
            from: '/latest/modelserving/v1beta1/mlflow/v2/',
            to: '/docs/model-serving/predictive-inference/frameworks/mlflow',
          },
          {
            from: '/latest/modelserving/v1beta1/onnx/',
            to: '/docs/model-serving/predictive-inference/frameworks/onnx',
          },
          {
            from: '/latest/modelserving/v1beta1/huggingface/',
            to: '/docs/model-serving/predictive-inference/frameworks/huggingface/overview',
          },
          {
            from: '/latest/modelserving/v1beta1/huggingface/token_classification/',
            to: '/docs/model-serving/predictive-inference/frameworks/huggingface/token-classification',
          },
          {
            from: '/latest/modelserving/v1beta1/huggingface/text_classification/',
            to: '/docs/model-serving/predictive-inference/frameworks/huggingface/text-classification',
          },
          {
            from: '/latest/modelserving/v1beta1/huggingface/fill_mask/',
            to: '/docs/model-serving/predictive-inference/frameworks/huggingface/fill-mask',
          },
          {
            from: '/latest/modelserving/v1beta1/triton/torchscript/',
            to: '/docs/model-serving/predictive-inference/frameworks/triton/torchscript',
          },
          {
            from: '/latest/modelserving/v1beta1/triton/bert/',
            to: '/docs/model-serving/predictive-inference/frameworks/triton/tensorflow',
          },
          {
            from: '/latest/modelserving/v1beta1/triton/huggingface/',
            to: '/docs/model-serving/predictive-inference/frameworks/triton/huggingface',
          },
          {
            from: '/latest/modelserving/v1beta1/custom/custom_model/',
            to: '/docs/model-serving/predictive-inference/frameworks/custom-predictor',
          },
          {
            from: '/latest/modelserving/v1beta1/transformer/torchserve_image_transformer/',
            to: '/docs/model-serving/predictive-inference/transformers/custom-transformer',
          },
          {
            from: '/latest/modelserving/v1beta1/transformer/collocation/',
            to: '/docs/model-serving/predictive-inference/transformers/collocation',
          },
          {
            from: '/latest/modelserving/v1beta1/transformer/feast/',
            to: '/docs/model-serving/predictive-inference/transformers/feast-feature-store',
          },
          {
            from: '/latest/modelserving/v1beta1/rollout/canary/',
            to: '/docs/model-serving/predictive-inference/rollout-strategies/canary',
          },
          {
            from: '/latest/modelserving/v1beta1/rollout/canary-example/',
            to: '/docs/model-serving/predictive-inference/rollout-strategies/canary-example',
          },
          {
            from: '/latest/modelserving/autoscaling/autoscaling/',
            to: '/docs/model-serving/predictive-inference/autoscaling/kpa-autoscaler',
          },
          {
            from: '/latest/modelserving/autoscaling/raw_deployment_autoscaling/',
            to: '/docs/model-serving/predictive-inference/autoscaling/hpa-autoscaler',
          },
          {
            from: '/latest/modelserving/autoscaling/keda/autoscaling_keda/',
            to: '/docs/model-serving/predictive-inference/autoscaling/keda-autoscaler',
          },
          {
            from: '/latest/modelserving/batcher/batcher/',
            to: '/docs/model-serving/predictive-inference/batcher',
          },
          {
            from: '/latest/modelserving/logger/logger/',
            to: '/docs/model-serving/predictive-inference/logger',
          },
          {
            from: '/latest/modelserving/kafka/kafka/',
            to: '/docs/model-serving/predictive-inference/kafka',
          },
          {
            from: '/latest/modelserving/explainer/explainer/',
            to: '/docs/model-serving/predictive-inference/explainers/overview',
          },
          {
            from: '/latest/modelserving/explainer/trustyai/',
            to: '/docs/model-serving/predictive-inference/explainers/trustyai',
          },
          {
            from: '/latest/modelserving/explainer/alibi/cifar10/',
            to: '/docs/model-serving/predictive-inference/explainers/alibi/image-explainer',
          },
          {
            from: '/latest/modelserving/explainer/alibi/income/',
            to: '/docs/model-serving/predictive-inference/explainers/alibi/tabular-explainer',
          },
          {
            from: '/latest/modelserving/explainer/alibi/moviesentiment/',
            to: '/docs/model-serving/predictive-inference/explainers/alibi/text-explainer',
          },
          {
            from: '/latest/modelserving/detect/alibi_detect/alibi_detect/',
            to: '/docs/model-serving/predictive-inference/detect/alibi/alibi-detect',
          },
          {
            from: '/latest/modelserving/detect/aif/germancredit/',
            to: '/docs/model-serving/predictive-inference/detect/aif',
          },
          {
            from: '/latest/modelserving/detect/art/mnist/',
            to: '/docs/model-serving/predictive-inference/detect/art',
          },

          //  Inferencegraph Section
          {
            from: '/latest/modelserving/inference_graph/',
            to: '/docs/concepts/resources/inferencegraph',
          },
          {
            from: '/latest/modelserving/inference_graph/image_pipeline/',
            to: '/docs/model-serving/inferencegraph/image-pipeline',
          },

          //  Model Storage Section
          {
            from: '/latest/modelserving/storage/storagecontainers/',
            to: '/docs/model-serving/storage/storage-containers',
          },
          {
            from: '/latest/modelserving/certificate/kserve/',
            to: '/docs/model-serving/storage/certificate/self-signed',
          },
          {
            from: '/latest/modelserving/storage/azure/azure/',
            to: '/docs/model-serving/storage/providers/azure',
          },
          {
            from: '/latest/modelserving/storage/pvc/pvc/',
            to: '/docs/model-serving/storage/providers/pvc',
          },
          {
            from: '/latest/modelserving/storage/s3/s3/',
            to: '/docs/model-serving/storage/providers/s3',
          },
          {
            from: '/latest/modelserving/storage/oci/',
            to: '/docs/model-serving/storage/providers/oci',
          },
          {
            from: '/latest/modelserving/storage/uri/uri/',
            to: '/docs/model-serving/storage/providers/uri',
          },
          {
            from: '/latest/modelserving/storage/gcs/gcs/',
            to: '/docs/model-serving/storage/providers/gcs',
          },
          {
            from: '/latest/modelserving/storage/huggingface/hf/',
            to: '/docs/model-serving/storage/providers/hf'
          },

          //  Node Scheduling Section
          {
            from: '/latest/modelserving/nodescheduling/overview/',
            to: '/docs/model-serving/node-scheduling/overview',
          },
          {
            from: '/latest/modelserving/nodescheduling/inferenceservicenodescheduling/',
            to: '/docs/model-serving/node-scheduling/isvc-node-scheduling',
          },

          // Administrator Guide Section
          {
            from: '/latest/admin/serverless/serverless/',
            to: '/docs/admin-guide/serverless',
          },
          {
            from: '/latest/admin/kubernetes_deployment/',
            to: '/docs/admin-guide/kubernetes-deployment',
          },
          {
            from: '/latest/admin/modelmesh/',
            to: '/docs/admin-guide/modelmesh',
          },
          {
            from: '/latest/admin/serverless/kourier_networking/',
            to: '/docs/admin-guide/serverless/kourier-networking',
          },
          {
            from: '/latest/admin/serverless/servicemesh/',
            to: '/docs/admin-guide/serverless/servicemesh',
          },
          {
            from: '/latest/admin/gatewayapi_migration/',
            to: '/docs/admin-guide/gatewayapi-migration',
          },

          // API Reference Section
          {
            from: '/latest/reference/api/',
            to: '/docs/reference/crd-api',
          },
          {
            from: '/latest/reference/swagger-ui/',
            to: '/docs/reference/oip/data-plane',
          },
          {
            from: '/latest/sdk_docs/sdk_doc/',
            to: '/docs/reference/controlplane-client/controlplane-client-sdk',
          },
          {
            from: '/latest/python_runtime_api/docs/',
            to: '/docs/reference/python-runtime-sdk',
          },
          {
            from: '/latest/inference_client/doc/',
            to: '/docs/reference/inference-client/inference-rest-client',
          },

          // Developer Guide Section
          {
            from: '/latest/developer/developer/',
            to: '/docs/developer-guide',
          },
          {
            from: '/latest/developer/debug/',
            to: '/docs/developer-guide/debugging',
          },

          // Community Section
          {
            from: '/latest/community/get_involved/',
            to: '/docs/community/get-involved',
          },
          {
            from: '/latest/community/adopters/',
            to: '/docs/community/adopters',
          },
          {
            from: '/latest/community/presentations/',
            to: '/docs/community/presentations',
          },

          // Blog
          {
            from: '/latest/blog/articles/2025-05-27-KServe-0.15-release/',
            to: '/blog/kserve-0.15-release',
          },
          {
            from: '/latest/blog/articles/2024-12-13-KServe-0.14-release/',
            to: '/blog/kserve-0.14-release',
          },
          {
            from: '/latest/blog/articles/2024-05-15-KServe-0.13-release/',
            to: '/blog/kserve-0.13-release',
          },
          {
            from: '/latest/blog/articles/2023-10-08-KServe-0.11-release/',
            to: '/blog/kserve-0.11-release',
          },
          {
            from: '/latest/blog/articles/2023-02-05-KServe-0.10-release/',
            to: '/blog/kserve-0.10-release',
          },
          {
            from: '/latest/blog/articles/2022-07-21-KServe-0.9-release/',
            to: '/blog/kserve-0.9-release',
          },
          {
            from: '/latest/blog/articles/2022-02-18-KServe-0.8-release/',
            to: '/blog/kserve-0.8-release',
          },
          {
            from: '/latest/blog/articles/2021-10-11-KServe-0.7-release/',
            to: '/blog/kserve-0.7-release',
          }
        ],
      },
    ],
  ],
};

export default config;
