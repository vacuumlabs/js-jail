const babel = require('@babel/core')
const transform_plugin = require('./babel-transform-plugin')

const code = `
aaa[var_key] = b
aaa['string_key'] = b
aaa.string_key = b
a.string_key = b.string_key
`

function transform(code) {
  return babel.transformSync(code, {plugins: [transform_plugin]}).code
}

console.log(transform(code))

module.exports = {transform}
