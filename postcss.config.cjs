module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss').purgeCSSPlugin({
      content: [
        './_site/**/*.html',
        './assets/js/dist/bundle.js',
        './admin/**/*.html',
        './admin/js/**/*.js'
      ],
      // Safelist patterns to preserve dynamically added classes
      safelist: {
        standard: [
          /^alert/,
          /^badge/,
          /^btn/,
          /^card/,
          /^collapse/,
          /^dropdown/,
          /^fade/,
          /^modal/,
          /^nav/,
          /^show/,
          /^active/,
          /^disabled/,
          /^fa-/,
          /^fas/,
          /^fab/,
          /^far/,
          /^glightbox/,
          /^hljs/,
          /^leaflet/
        ],
        deep: [],
        greedy: [
          /^tooltip/,
          /^popover/,
          /^bs-/
        ]
      },
      // Reject specific patterns (never include these)
      rejected: false,
      // Variables to preserve (CSS custom properties)
      variables: true,
      // Keyframes to preserve
      keyframes: true
    }),
    require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        colormin: true,
        minifyFontValues: true,
        minifySelectors: true
      }]
    }),
    require('autoprefixer')
  ]
};
