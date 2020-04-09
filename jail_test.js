const {assert} = require('chai')
const {safe_eval} = require('./jail')

const print_errors = (fn) => async () => {
  try {
    return await fn()
  } catch (err) {
    if (err.sentinel === 'jail-problem') {
      console.error(err)
    }
    throw err
  }
}

const iit = (description, fn) => {
  it(description, print_errors(fn))
}

iit.only = (description, fn) => {
  it.only(description, print_errors(fn))
}

iit.skip = (description, fn) => it.skip(description, fn)

describe('basics', () => {

  iit('various basic stuff works', () => {
    assert.equal(safe_eval('2+2'), 4)
    assert.equal(safe_eval('({a: 1}).a'), 1)
    assert.deepEqual(safe_eval('[1, 2].map((x) => x+1)'), [2, 3])
    assert.deepEqual(
      safe_eval(
        `
        const res = new Set();
        [0,1,2,3].forEach((x) => {res.add(2*x)});
        (new Array(...res.values()));
        `),
      [0, 2, 4, 6]
    )
  })

  iit('Object behavior', () => {

    function ensure_hidden_property(prop_name) {
      try {
        safe_eval(`Object.${prop_name}()`)
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.type, 'accessing-forbidden-object-method')
        assert.equal(err.key, prop_name)
      }
    }
    assert.deepEqual(safe_eval('Object.keys({a: 1, b: 2})'), ['a', 'b'])
    assert.deepEqual(safe_eval('Object.values({a: 1, b: 2})'), [1, 2])

    const unsafe_object_properties = [
      'assign', 'getOwnPropertyDescriptor',
      'getOwnPropertyDescriptors', 'getOwnPropertyNames', 'getOwnPropertySymbols',
      'preventExtensions', 'seal', 'create', 'defineProperties', 'defineProperty',
      'freeze', 'getPrototypeOf', 'setPrototypeOf', 'isExtensible', 'isFrozen', 'isSealed']
    for (const prop of unsafe_object_properties) {
      ensure_hidden_property(prop)
    }
  })

  iit('reading global variable forbidden', () => {
    // this stuff is globaly visible (with possibly some methods hidden)
    safe_eval('Object')
    safe_eval('Array')
    safe_eval('Error')
    safe_eval('Map')
    safe_eval('Set')
    // this stuff is hidden
    try_access_variable('lol')
    try_access_variable('global')
    try_access_variable('window')
    try_access_variable('Reflect')

    function try_access_variable(var_name) {
      try {
        safe_eval(var_name)
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.type, 'forbidden-read-global-variable')
        assert.equal(err.key, var_name)
      }
    }
  })

  iit('setting global variable forbidden', () => {
    try_set_variable('lol')
    try_set_variable('global')
    try_set_variable('window')
    try_set_variable('Reflect')

    function try_set_variable(var_name) {
      try {
        safe_eval(`${var_name} = 42`)
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.type, 'forbidden-write-global-variable')
        assert.equal(err.key, var_name)
      }
    }
  })

  iit('modifying any object forbidden', () => {
    function try_set_property(obj, prop) {
      if (Number.isInteger(prop)) {
        // array[number]=something should fail
        // object[number]=something should fail as well, although it's not that relevant here
        try {
          safe_eval(`${obj}[${prop}] = 42`)
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.type, 'forbidden-object-modification')
          assert.equal(err.key, prop)
        }
      } else {
        // object.prop=something should fail
        try {
          safe_eval(`${obj}.${prop} = 42`)
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.type, 'forbidden-object-modification')
          assert.equal(err.key, prop)
        }
        // object["prop"]=something should fail
        try {
          safe_eval(`${obj}["${prop}"] = 42`)
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.type, 'forbidden-object-modification')
          assert.equal(err.key, prop)
        }
      }
    }
    try_set_property('Object', 'aaa')
    try_set_property('({})', 'aaa')
    try_set_property('[]', 'aaa')
    try_set_property('[]', 1)
  })

  iit('Reading constructor, prototype, etc.. is forbidden', () => {
    // test if some 'standard' properties are OK
    assert.equal(safe_eval('({a: 1}).a'), 1)
    assert.equal(safe_eval('({a: 1})["a"]'), 1)
    assert.equal(safe_eval('(()=>null).a'), undefined)

    // test forbidden properties
    ensure_forbidden('constructor')
    ensure_forbidden('__proto__')
    ensure_forbidden('prototype')

    function ensure_forbidden(property) {
      try {
        safe_eval(`let a = {}; a.${property}`)
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.type, 'accessing-forbidden-prop')
        assert.equal(err.key, property)
      }
    }
  })

  iit('Array behavior', () => {
    // test that even with some methods hidden, arrays works as expected
    assert.deepEqual(safe_eval('[0, 1, 2, 3]'), [0, 1, 2, 3])
    assert.equal(safe_eval('[0, 1, 2, 3][2]'), 2)
    assert.deepEqual(safe_eval('[...[0, 1, 2, 3], 4]'), [0, 1, 2, 3, 4])
    assert.equal(safe_eval('[...[0, 1, 2, 3], 4][2]'), 2)
    assert.deepEqual(safe_eval('[0, 1].concat([2, 3])'), [0, 1, 2, 3])
    assert.deepEqual(safe_eval('const [, a, b, ...rest] = [0, 1, 2, 3, 4]; [...rest, b, a]'), [3, 4, 2, 1])

    // test that methods really are hidden
    function ensure_forbidden(property) {
      try {
        safe_eval(`[].${property}()`)
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.type, 'accessing-forbidden-array-method')
        assert.equal(err.key, property)
      }
    }
    ['pop', 'push', 'splice', 'shift', 'unshift', 'splice', 'fill', 'copyWithin'].forEach(ensure_forbidden)
  })

  iit('Destructuring behavior', () => {
    assert.deepEqual(safe_eval('const {a} = {a: 1}; a'), 1)
    ensure_forbidden('const {constructor} = {}', 'accessing-forbidden-property', 'constructor')
    ensure_forbidden('const {__proto__: a} = {}', 'accessing-forbidden-property', '__proto__')
    ensure_forbidden('const {prototype: a} = {}', 'accessing-forbidden-property', 'prototype')
    ensure_forbidden('const x = "sth"; const {[x]: a} = {}', 'computed-property-disallowed')

    function ensure_forbidden(expression, type, key) {
      try {
        safe_eval(expression)
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.type, type)
        if (key !== undefined) {
          assert.equal(err.key, key)
        }
      }
    }

  })

})
