const {create_jail_error} = require('./error_utils')
const {
  safe_Object_properties,
  safe_Array_prototype_properties,
  safe_Object_prototype_properties,
} = require('./listings')
const babel = require('@babel/standalone')
const transform_plugin = require('./babel-transform-plugin')

// eslint-disable-next-line no-unused-vars
const code = `
  while (true) {
    f()
  }
`

//console.log(transform(code))

function transform(code, config) {
  return babel.transform(code, {plugins: [transform_plugin(config)]}).code
}

function safe_eval(what, config) {
  const safe_what = transform(what, config)
  const backup_Object = {}
  const backup_Object_prototype = {}
  const backup_Array_prototype = {}

  function backup(target, backup, safe_properties) {
    for (const key of Reflect.ownKeys(target)) {
      backup[key] = target[key]
      // - Array and Array.prototype have some methods under Symbol keys. They seem harmless.
      // - We don't want to mess with __proto__ and prototype properties. Accessing those is
      // forbidden on another layer
      if (
        typeof key !== 'symbol' &&
        key !== '__proto__' &&
        key !== 'prototype' &&
        !safe_properties.includes(key)
      ) {
        target[key] = () => {
          throw create_jail_error('accessing-forbidden-property', key)
        }
      }
    }
  }

  function restore(target, backup) {
    for (const key in backup) {
      target[key] = backup[key]
    }
  }

  try {
    // in try-finally block, let's disallow some unsage properties/methods of Object and Array
    backup(Object, backup_Object, safe_Object_properties)
    backup(Object.prototype, backup_Object_prototype, safe_Object_prototype_properties)
    backup(Array.prototype, backup_Array_prototype, safe_Array_prototype_properties)

    // with(scope_proxy) ensures that we intercept all attempts to read/write to global variables.
    // Everything that is not allowed explicitly throws.
    // https://www.figma.com/blog/how-we-built-the-figma-plugin-system/
    const scope_proxy = new Proxy(
      {
        // `with` construct asks for this object, I'm not entirely sure why.
        [Symbol.unscopables]: {},
        Array,
        Object,
        Error,
        Map,
        Set,
        Date,
      },
      {
        get: (target, key) => {
          if (key in target) {
            return target[key]
          }
          throw create_jail_error('forbidden-read-global-variable', key)
        },
        set: (target, key, value) => {
          throw create_jail_error('forbidden-write-global-variable', key)
        },
        has: (target, key) => true,
      }
    )

    return eval(`
      with(scope_proxy) {
        ${safe_what}
      }
    `)
  } finally {
    restore(Object, backup_Object)
    restore(Object.prototype, backup_Object_prototype)
    restore(Array.prototype, backup_Array_prototype)
  }
}

module.exports = {safe_eval}
