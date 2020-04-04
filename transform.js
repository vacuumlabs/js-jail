const babel = require('@babel/core')
const transform_plugin = require('./babel-transform-plugin')

//const code = `
//var {[key]: val} = rval
//`
//console.log(transform(code))

function transform(code) {
  return babel.transformSync(code, {plugins: [transform_plugin]}).code
}


module.exports = {transform}
