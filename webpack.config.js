// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules/, // 👈 prevents loading bad maps from dependencies
      },
    ],
  },
};
