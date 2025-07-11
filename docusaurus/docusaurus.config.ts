import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import rehypeExternalLinks from 'rehype-external-links'
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// TODO: Automatically update this version when releasing a new version
const announcedVersion = '0.15';

const config: Config = {
  title: 'KServe',
  tagline: 'Standardized Distributed Generative and Predictive AI Inference Platform for Scalable, Multi-Framework Deployment on Kubernetes',
  favicon: 'img/favicon-32x32.png',

  // Set the production url of your site here
  url: 'https://sivanantha321.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/KServe-New-Website/',

  // GitHub pages deployment config.
  organizationName: 'kserve', // Usually your GitHub org/user name.
  projectName: 'KServe-New-Website', // Usually your repo name.
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
    'docusaurus-theme-openapi-docs'
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/kserve/website/tree/main/docusaurus/',
          lastVersion: 'current',
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
            'https://github.com/kserve/website/tree/main/docusaurus/',
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
    // Replace with your project's social card
    image: 'img/kserve-logo.png',
    metadata: [
      { name: 'keywords', content: 'machine learning, kubernetes, model serving, inference, AI, ML, serverless, MLOps, model inference, generative AI, LLM, AI model deployment' },
      { name: 'description', content: 'KServe: A Kubernetes Custom Resource for serving ML models on Kubernetes with autoscaling and standardized inference protocols for both predictive and generative AI models' }
    ],
    announcementBar: {
      id: `announcementBar-v${announcedVersion}`,
      content: `🎉️ <b><a target="_blank" href="https://sivanantha321.github.io/KServe-New-Website/blog/kserve-${announcedVersion}-release">KServe v${announcedVersion}</a> is out!</b> 🥳️`,
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
              label: 'latest',
            },
          },
          dropdownItemsAfter: [
            {
              href: 'https://kserve.github.io/archive-website/0.15/',
              label: '0.15',
            },
            {
              href: 'https://kserve.github.io/archive-website/1.1/',
              label: '0.14 ',
            },
            {
              href: 'https://kserve.github.io/archive-website/1.0/',
              label: '0.13',
            },
            {
              href: 'https://kserve.github.io/archive-website/0.12/',
              label: '0.12',
            },
            {
              href: 'https://kserve.github.io/archive-website/0.11/',
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
          label: 'GitHub',
          position: 'right',
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
              to: '/docs/reference/api',
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
    // Custom Plugin to replace variables in markdown files
    [
      require.resolve('./plugins/markdown-variable-replacer/index.ts'),
      {
        variableMap: {
          kserveDocsVersion: announcedVersion, // or load from file or env
        },
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
    ]
  ],
};

export default config;
