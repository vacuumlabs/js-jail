const {transform} = require('./transform')

const target = {
  [Symbol.unscopables]: {},
  Array,
  Object,
  Error,
  Map,
  Set
}

function create_jail_error(type, key) {
  const err = new Error('jail problem')
  err.sentinel = 'jail-problem'
  err.type = type
  err.key = key
  return err
}

const p = new Proxy(target, { // eslint-disable-line no-unused-vars
  get: (target, key) => {
    if (key in target) {
      return target[key]
    }
    throw create_jail_error('forbidden-read-global-variable', key)
  },
  set: (target, key, value) => {
    throw create_jail_error('forbidden-write-global-variable', key)
  },
  has: (target, key) => true
})

function safe_eval(what) {
  const safe_what = transform(what)
  const backup_object = {}
  const backup_array_prototype = {}
  const safe_object_properties = ['prototype', 'length', 'name', 'is', 'keys', 'entries', 'fromEntries', 'values']
  const safe_array_methods = ['length', 'constructor', 'concat', 'find', 'findIndex', 'lastIndexOf', 'slice', 'reverse', 'sort', 'includes', 'indexOf', 'join', 'keys', 'entries', 'values', 'forEach', 'filter', 'flat', 'flatMap', 'map', 'every', 'some', 'reduce', 'reduceRight', 'toLocaleString', 'toString']
  try {
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

    return eval(`
      with(p) {
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
