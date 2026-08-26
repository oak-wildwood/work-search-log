import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import eslintConfigPrettier from '@vue/eslint-config-prettier'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  eslintConfigPrettier,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      // The plugin's default requires a label to BOTH wrap its control AND
      // carry a matching for/id — but either technique alone is a valid,
      // W3C-recognized way to associate a label, and this codebase uses one
      // or the other (never both) depending on the form.
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },
]
