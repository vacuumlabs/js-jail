const {create_jail_error, create_jail_error_template} = require('./error_utils')

module.exports = function({types: t, template}) {

  let safe_get_name

  function generateSafeGetCall(object, _property, computed) {
    const property = computed ? _property : t.stringLiteral(_property.name)

    return t.callExpression(
      safe_get_name,
      [
        object,
        property
      ]
    )
  }

  const safe_get_template = `
    function SAFE_GET_NAME(obj, prop) {
      if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') {
        throw ${create_jail_error_template}('accessing-forbidden-property', prop)
      }
      let res = obj[prop]
      if (typeof res === 'function') {
        res = res.bind(obj)
      }
      return res
    }
  `

  return {
    visitor: {
      Program: {
        enter(path) {
          safe_get_name = path.scope.generateUidIdentifier('safe_get')
        },
        exit(path, {opts}) {
          path.node.body.push(template(safe_get_template)({SAFE_GET_NAME: safe_get_name}))
        }
      },
      AssignmentExpression(path) {
        const {right, left} = path.node
        if (t.isMemberExpression(left)) {
          throw create_jail_error('forbidden-object-modification')
        }
      },
      MemberExpression(path) {
        path.replaceWith(generateSafeGetCall(
          path.node.object,
          path.node.property,
          path.node.computed
        ))
      },
      Property(path) {
        const {computed, key: {name}} = path.node
        if (computed) {
          throw create_jail_error('computed-property-disallowed')
        } else if (['__proto__', 'constructor', 'prototype'].includes(name)) {
          throw create_jail_error('accessing-forbidden-property', name)
        }
      },
    }
  }
}
