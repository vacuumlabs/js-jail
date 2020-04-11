const {create_jail_error, create_jail_error_template} = require('./error_utils')
const {
  forbidden_instance_properties,
  check_if_prop_is_forbidden_instance_property,
} = require('./listings')

module.exports = (config) => ({types: t, template}) => {
  function generateSafeGetCall(object, _property, computed) {
    const property = computed ? _property : t.stringLiteral(_property.name)
    // eslint-disable-next-line no-use-before-define
    return t.callExpression(safe_get_name, [object, property])
  }

  /*
   * All obj.x and obj[x] are translated into safe_get(obj, x) so we can get more controll over x.
   */
  const safe_get_template = `
    function SAFE_GET_NAME(obj, prop) {
      if (!(typeof prop === 'string' || typeof prop === 'number' || typeof prop === 'symbol') ||
          ${check_if_prop_is_forbidden_instance_property('prop')}) {
        throw ${create_jail_error_template}('accessing-forbidden-property', prop)
      }
      let res = obj[prop]
      if (typeof res === 'function') {
        res = res.bind(obj)
      }
      return res
    }
  `

  /*
   * Check for timeouts. Not to be too computational heavy, it really checkes for time only once in
   * N calls.
   */
  const check_time_function_template = `function CHECK_TIME_FUNCTION_NAME() {
    TIMEOUT_COUNTER_VARIABLE_NAME += 1;
    if (TIMEOUT_COUNTER_VARIABLE_NAME % 256 === 0) {
      if ((new Date()).getTime() - START_TIME_VARIABLE_NAME > TIMEOUT) {
        throw ${create_jail_error_template}('timeout')
      }
    }
  }`

  function put_to_block(what) {
    return t.blockStatement([what])
  }

  function put_to_block_return(what) {
    return t.blockStatement([t.returnStatement(what)])
  }

  let check_time_function_name,
    start_time_variable_name,
    timeout_counter_variable_name,
    safe_get_name

  return {
    visitor: {
      Program: {
        enter(path) {
          safe_get_name = path.scope.generateUidIdentifier('safe_get')
          check_time_function_name = path.scope.generateUidIdentifier('check_time')
          start_time_variable_name = path.scope.generateUidIdentifier('check_time')
          timeout_counter_variable_name = path.scope.generateUidIdentifier('timeout_counter')
          path.node.body.unshift(
            template('let TIMEOUT_COUNTER_VARIABLE_NAME = 0')({
              TIMEOUT_COUNTER_VARIABLE_NAME: timeout_counter_variable_name,
            })
          )
          path.node.body.unshift(
            template('const START_TIME_VARIABLE_NAME = (new Date()).getTime()')({
              START_TIME_VARIABLE_NAME: start_time_variable_name,
            })
          )
          // before we start modifying the code, let's wrap expressions into BlockStatements, so for
          // example () => 3 becomes () => {return 3;}. This allows us to add timeout checks easier
          // later. Note that this happens in a .traverse call and therefore happens before all the
          // other transformations take place.
          path.traverse({
            WhileStatement(path) {
              const child_node = path.node.body
              if (child_node.type === 'ExpressionStatement') {
                path.get('body').replaceWith(put_to_block(child_node))
              }
            },
            ForStatement(path) {
              const child_node = path.node.body
              if (child_node.type === 'ExpressionStatement') {
                path.get('body').replaceWith(put_to_block(child_node))
              }
            },
            ArrowFunctionExpression(path) {
              if (path.node.body.type !== 'BlockStatement') {
                path.get('body').replaceWith(put_to_block_return(path.node.body))
              }
            },
          })
        },
        exit(path, {opts}) {
          path.node.body.push(template(safe_get_template)({SAFE_GET_NAME: safe_get_name}))
          path.node.body.push(
            template(check_time_function_template)({
              CHECK_TIME_FUNCTION_NAME: check_time_function_name,
              START_TIME_VARIABLE_NAME: start_time_variable_name,
              TIMEOUT: String((config || {}).timeout == null ? 2000 : config.timeout),
              TIMEOUT_COUNTER_VARIABLE_NAME: timeout_counter_variable_name,
            })
          )
        },
      },
      AssignmentExpression(path) {
        const {right, left} = path.node
        if (t.isMemberExpression(left)) {
          throw create_jail_error('forbidden-object-modification')
        }
      },
      MemberExpression(path) {
        path.replaceWith(
          generateSafeGetCall(path.node.object, path.node.property, path.node.computed)
        )
      },
      Property(path) {
        const {
          computed,
          key: {name},
        } = path.node
        if (computed) {
          throw create_jail_error('computed-property-disallowed')
        } else if (forbidden_instance_properties.includes(name)) {
          throw create_jail_error('accessing-forbidden-property', name)
        }
      },

      FunctionDeclaration(path) {
        if (path.node.async) {
          throw create_jail_error('disallowed-async-code')
        }
      },

      ArrowFunctionExpression(path) {
        if (path.node.async) {
          throw create_jail_error('disallowed-async-code')
        }
      },

      ThisExpression(path) {
        throw create_jail_error('forbidden-this')
      },

      BlockStatement(path) {
        path.node.body.unshift(
          template('CHECK_TIME_FUNCTION_NAME()')({
            CHECK_TIME_FUNCTION_NAME: check_time_function_name,
          })
        )
      },
    },
  }
}
