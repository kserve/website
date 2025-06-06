import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'KServe',
  tagline: 'A Kubernetes Custom Resource for serving predictive and generative ML models with standardized inference protocols',
  favicon: 'img/favicon-32x32.png',

  // Set the production url of your site here
  url: 'https://sivanantha321.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/KServe-New-Website/',

  // GitHub pages deployment config.
  organizationName: 'kserve', // Usually your GitHub org/user name.
  projectName: 'KServe-New-Website', // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: 'warn',   // TODO: Change to 'throw' in production
  onBrokenMarkdownLinks: 'warn', // TODO: Change to 'throw' in production

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

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
    navbar: {
      title: 'KServe',
      logo: {
        alt: 'KServe Logo',
        src: 'img/kserve-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
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
              to: '/docs/get_started/first_isvc',
            },
            {
              label: 'API Reference',
              to: '/docs/reference/api',
            },
            {
              label: 'Model Serving Guide',
              to: '/docs/modelserving/control_plane',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Slack',
              href: 'https://kubeflow.slack.com/',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/kubeflow',
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
              label: 'GitHub',
              href: 'https://github.com/kserve/kserve',
            },
            {
              label: 'Community Meetings',
              href: 'https://github.com/kserve/website/tree/main/docs/community',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The KServe Authors. All rights reserved. The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our Trademark Usage page.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
