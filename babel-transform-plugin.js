//function get_safe_get(safe_get_name) {
//  return t.AssignmentExpression(safe_get_name, )
//}

module.exports = function({types: t, template}) {

  function generateSafeGetCall(object, _property, computed) {
    property = computed ? _property : t.stringLiteral(_property.name)

    return t.callExpression(
      t.identifier('safe_set'),
      [
        object,
        property
      ]
    )
  }

  function generateSafeSetCall(object, _property, computed, rval) {
    property = computed ? _property : t.stringLiteral(_property.name)

    return t.callExpression(
      t.identifier('safe_set'),
      [
        object,
        property,
        rval
      ]
    )
  }

  const safe_get_template = (function SAFE_GET_NAME(obj, prop) {
    if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') {
      throw new Error(`Accessing forbidden prop ${props}`)
    }
    return obj[prop]
  }).toString()

  const safe_set_template = (function SAFE_SET_NAME(obj, prop, value) {
    if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') {
      throw new Error(`Accessing forbidden prop ${props}`)
    }
    return obj[prop]
  }).toString()

  return {
    visitor: {
      Program: {
        exit(path, {opts}) {
          const safe_get_name = path.scope.generateUidIdentifier('safe_get')
          const safe_set_name = path.scope.generateUidIdentifier('safe_set')
          path.node.body.push(template(safe_get_template)({SAFE_GET_NAME: safe_get_name}))
          path.node.body.push(template(safe_set_template)({SAFE_SET_NAME: safe_set_name}))
        }
      },
      AssignmentExpression(path) {
        const {right, left} = path.node
        if (t.isMemberExpression(left)) {
          path.replaceWith(generateSafeSetCall(left.object, left.property, left.computed, right))
        }
      },
      MemberExpression(path) {
        path.replaceWith(generateSafeGetCall(
          path.node.object,
          path.node.property,
          path.node.computed
        ))
      },
    }
  }
}
