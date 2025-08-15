import type { LoadContext, Plugin } from '@docusaurus/types';
import type { RuleSetRule } from 'webpack';

export interface MarkdownVariableReplacerPluginOptions {
  variableMap: Record<string, string>;
}

export default function markdownVariableReplacerPlugin(
  context: LoadContext,
  options: MarkdownVariableReplacerPluginOptions
): Plugin {
  const { variableMap } = options;

  return {
    name: 'docusaurus-plugin-markdown-variable-replacer',

    configureWebpack() {
      const replacements = Object.entries(variableMap).map(([key, value]) => ({
        search: `{{${key}}}`,
        replace: value,
        flags: 'g',
      }));

      const rule: RuleSetRule = {
        test: /\.md$/,
        loader: require.resolve('string-replace-loader'),
        options: {
          multiple: replacements,
        },
      };

      return {
        module: {
          rules: [rule],
        },
      };
    },
  };
}
