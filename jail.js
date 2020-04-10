const {create_jail_error} = require('./error_utils')
const {safe_object_properties, safe_array_methods} = require('./listings')
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
  const backup_object = {}
  const backup_array_prototype = {}
  try {
    // in try-finally block, let's disallow some unsage properties/methods of Object and Array
    for (const key of Reflect.ownKeys(Object)) {
      backup_object[key] = Object[key]
      if (!safe_object_properties.includes(key)) {
        Object[key] = () => {
          throw create_jail_error('accessing-forbidden-object-method', key)
        }
      }
    }
    for (const key of Reflect.ownKeys(Array.prototype)) {
      backup_array_prototype[key] = Array.prototype[key]
      if (typeof key !== 'symbol' && !safe_array_methods.includes(key)) {
        // eslint-disable-next-line no-extend-native
        Array.prototype[key] = () => {
          throw create_jail_error('accessing-forbidden-array-method', key)
        }
      }
    }

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
    for (const key in backup_object) {
      Object[key] = backup_object[key]
    }
    for (const key in backup_array_prototype) {
      // eslint-disable-next-line no-extend-native
      Array.prototype[key] = backup_array_prototype[key]
    }
  }
}

module.exports = {safe_eval}
