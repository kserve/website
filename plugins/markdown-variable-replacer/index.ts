// import type { LoadContext, Plugin } from '@docusaurus/types';
// import type { RuleSetRule } from 'webpack';

// export interface MarkdownVariableReplacerPluginOptions {
//   variableMap: Record<string, string>;
// }

// export default function markdownVariableReplacerPlugin(
//   context: LoadContext,
//   options: MarkdownVariableReplacerPluginOptions
// ): Plugin {
//   const { variableMap } = options;

//   return {
//     name: 'docusaurus-plugin-markdown-variable-replacer',

//     configureWebpack() {
//       const version: string =
//                     (context.siteConfig.customFields?.docsVersion as string) || 'current';
//       const replacements = Object.entries(variableMap).map(([key, value]) => ({
//         search: `{{${key}}}`,
//         replace: version,
//         flags: 'g',
//       }));

//       const rule: RuleSetRule = {
//         test: /\.md$/,
//         loader: require.resolve('string-replace-loader'),
//         options: {
//           multiple: replacements,
//         },
//       };

//       return {
//         module: {
//           rules: [rule],
//         },
//       };
//     },
//   };
// }

import type { LoadContext, Plugin } from '@docusaurus/types';
import { visit } from 'unist-util-visit';
import path from 'path';

export default function markdownVariableReplacerPlugin(
  context: LoadContext,
  options: { versionVariables: Record<string, Record<string, string>> }
): Plugin {
  return {
    name: 'markdown-variable-replacer',

    configureMdx(mdOptions) {
      const replacer = () => (tree) => {
        visit(tree, ['text', 'inlineCode', 'code', 'link'], (node: any) => {
          if (typeof node.value === 'string' && node.value.includes('{{')) {
            node.value = node.value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
              // 🔑 Detect current version from file path
              // versioned_docs/version-X.Y/... -> "X.Y"
              // docs/... -> "current"
              let version = 'current';
              if (node.position?.start?.source) {
                const sourcePath = node.position.start.source as string;
                if (sourcePath.includes('versioned_docs')) {
                  const match = sourcePath.match(/versioned_docs\/version-([^/]+)/);
                  if (match) version = match[1];
                }
              }

              return (
                options.versionVariables[version]?.[varName] ??
                `{{${varName}}}`
              );
            });
          }
        });
      };

      mdOptions.remarkPlugins = [replacer, ...(mdOptions.remarkPlugins || [])];
    },
  };
}
