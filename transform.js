const babel = require('@babel/standalone')
const transform_plugin = require('./babel-transform-plugin')

//const code = `
//var {[key]: val} = rval
//`
//console.log(transform(code))

function transform(code) {
  return babel.transform(code, {plugins: [transform_plugin]}).code
}


module.exports = {transform}
