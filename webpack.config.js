const path = require('path')

module.exports = {
  entry: './jail_test.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js'
  }
}
