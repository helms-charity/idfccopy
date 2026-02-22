module.exports = {
  root: true,
  plugins: ['secure-coding', 'sonarjs'],
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
    'plugin:sonarjs/recommended-legacy',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    // secure-coding: preset is flat-config only; rules enabled manually for legacy config
    'secure-coding/no-hardcoded-credentials': 'error',
    'secure-coding/no-redos-vulnerable-regex': 'error',
    'secure-coding/no-unsafe-deserialization': 'error',
    'secure-coding/no-improper-sanitization': 'error',
    'secure-coding/no-format-string-injection': 'error',
    'secure-coding/no-unchecked-loop-condition': 'error',
    'secure-coding/no-unlimited-resource-allocation': 'error',
    'secure-coding/no-xpath-injection': 'error',
    'secure-coding/no-graphql-injection': 'error',
    'secure-coding/no-xxe-injection': 'error',
    'secure-coding/detect-non-literal-regexp': 'warn',
    'secure-coding/detect-object-injection': 'warn',
    'secure-coding/no-improper-type-validation': 'warn',
    'secure-coding/no-missing-authentication': 'warn',
    'secure-coding/no-sensitive-data-exposure': 'warn',
    'secure-coding/no-pii-in-logs': 'warn',
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'xwalk/max-cells': ['error', {
      section: 30, // section is a key-value block and over 4 is OK
      'multi-section': 30,
      accordion: 5, // the rest of these need adjustments per https://www.aem.live/developer/component-model-definitions#type-inference
      cards: 8,
      card: 7,
      'category-nav-item': 10,
      'section-title': 5,
      steps: 5,
      table: 6,
    }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
  },
};
