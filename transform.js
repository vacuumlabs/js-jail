const babel = require('@babel/standalone')
const transform_plugin = require('./babel-transform-plugin')

const code = `
  while (true) {
    f()
  }
`
console.log(transform(code))

function transform(code, config) {
  return babel.transform(code, {plugins: [transform_plugin(config)]}).code
}


module.exports = {transform}
