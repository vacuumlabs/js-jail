const {transform} = require('./transform')

const p = new Proxy({}, { // eslint-disable-line no-unused-vars
  get: (target, key) => {
    if (key === Symbol.unscopables) {
      return {}
    }
    //console.log('getting', key)
    const err = new Error()
    err.type = 'get_global'
    err.key = key
    throw err
  },
  set: (target, key, value) => {
    const err = new Error()
    err.type = 'set_global'
    err.key = key
    throw err
  },
  has: (target, key) => true
})

function safe_eval(what) {
  const safe_what = transform(what)
  return eval(`
    with(p) {
      ${safe_what}
    }
  `)
}

module.exports = {safe_eval}
