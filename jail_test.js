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
  it(description, print_errors(fn)).timeout(5000)
}

iit.only = (description, fn) => {
  it.only(description, print_errors(fn)).timeout(5000)
}

iit.skip = (description, fn) => it.skip(description, fn)

function ensure_forbidden(expression, type, key, config) {
  try {
    safe_eval(expression, config)
    assert.isTrue(false)
  } catch (err) {
    if (err.type == null) {
      throw err
    }
    assert.equal(err.type, type)
    if (key !== undefined) {
      assert.equal(err.key, key)
    }
  }
}

describe('basics', () => {

  // this is copy-pasted in readme
  it('showcase', () => {
    assert.equal(safe_eval('2 + 2'), 4)

    assert.equal(safe_eval(
      `
        const add_bang = (s) => s + "!";
        add_bang("Hello, world");
      `),
      'Hello, world!')

    // handling timeout
    assert.throws(() => safe_eval('while (true) {}', {timeout: 500}))

    // let's try to be nasty
    const nasty_fragment = `
      const maybe_harmful_expression = '2 + 2'
      const wow_obfuscated = 'cons' + 'tru' + 'ctor'
      Object.keys[wow_obfuscated]('return ' + maybe_harmful_expression)()
    `

    // normally this'd work
    assert.equal(eval(nasty_fragment), 4)

    // but not with safe_eval!
    assert.throws(() => safe_eval(nasty_fragment))
  })

  iit('various basic stuff works', () => {
    assert.equal(safe_eval('({a: 1}).a'), 1)
    assert.deepEqual(safe_eval('[1, 2].map((x) => x+1)'), [2, 3])
    assert.deepEqual(
      safe_eval(
        `
        const res = new Set();
        [0,1,2,3].forEach((x) => {res.add(2*x)});
        (new Array(...res.values()));
        `
      ),
      [0, 2, 4, 6]
    )
  })

  iit('Object behavior', () => {
    assert.deepEqual(safe_eval('Object.keys({a: 1, b: 2})'), ['a', 'b'])
    assert.deepEqual(safe_eval('Object.values({a: 1, b: 2})'), [1, 2])

    const unsafe_object_properties = [
      'assign',
      'getOwnPropertyDescriptor',
      'getOwnPropertyDescriptors',
      'getOwnPropertyNames',
      'getOwnPropertySymbols',
      'preventExtensions',
      'seal',
      'create',
      'defineProperties',
      'defineProperty',
      'freeze',
      'getPrototypeOf',
      'setPrototypeOf',
      'isExtensible',
      'isFrozen',
      'isSealed',
    ]
    for (const prop of unsafe_object_properties) {
      ensure_forbidden(`Object.${prop}()`, 'accessing-forbidden-object-method', prop)
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
    ;['lol', 'global', 'window', 'Reflect'].forEach((prop) =>
      ensure_forbidden(prop, 'forbidden-read-global-variable', prop)
    )
  })

  iit('setting global variable forbidden', () => {
    ;['lol', 'global', 'window', 'Reflect'].forEach((prop) =>
      ensure_forbidden(`${prop} = 42`, 'forbidden-write-global-variable', prop)
    )
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
        }
      } else {
        // object.prop=something should fail
        try {
          safe_eval(`${obj}.${prop} = 42`)
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.type, 'forbidden-object-modification')
        }
        // object["prop"]=something should fail
        try {
          safe_eval(`${obj}["${prop}"] = 42`)
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.type, 'forbidden-object-modification')
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
    ;['constructor', '__proto__', 'prototype'].forEach((prop) => {
      ensure_forbidden(`let a = {}; a.${prop}`, 'accessing-forbidden-property', prop)
    })
  })

  iit('Array behavior', () => {
    // test that even with some methods hidden, arrays works as expected
    assert.deepEqual(safe_eval('[0, 1, 2, 3]'), [0, 1, 2, 3])
    assert.equal(safe_eval('[0, 1, 2, 3][2]'), 2)
    assert.deepEqual(safe_eval('[...[0, 1, 2, 3], 4]'), [0, 1, 2, 3, 4])
    assert.equal(safe_eval('[...[0, 1, 2, 3], 4][2]'), 2)
    assert.deepEqual(safe_eval('[0, 1].concat([2, 3])'), [0, 1, 2, 3])
    assert.deepEqual(safe_eval('const [, a, b, ...rest] = [0, 1, 2, 3, 4]; [...rest, b, a]'), [
      3,
      4,
      2,
      1,
    ])

    // test that methods really are hidden
    ;['pop', 'push', 'splice', 'shift', 'unshift', 'splice', 'fill', 'copyWithin'].forEach(
      (prop) => {
        ensure_forbidden(`[].${prop}()`, 'accessing-forbidden-array-method', prop)
      }
    )
  })

  iit('Destructuring behavior', () => {
    assert.deepEqual(safe_eval('const {a} = {a: 1}; a'), 1)
    ensure_forbidden('const {constructor} = {}', 'accessing-forbidden-property', 'constructor')
    ensure_forbidden('const {__proto__: a} = {}', 'accessing-forbidden-property', '__proto__')
    ensure_forbidden('const {prototype: a} = {}', 'accessing-forbidden-property', 'prototype')
    ensure_forbidden('const x = "sth"; const {[x]: a} = {}', 'computed-property-disallowed')
  })

  iit('Timeout', () => {
    ensure_forbidden('let i = 0; while (true) {i += 1}', 'timeout', null, {timeout: 500})
    const fib_str = 'function fib(n) {return n<2 ? n : fib(n-1) + fib(n-2)};'
    assert.equal(safe_eval(`${fib_str} fib(10);`), 55)
    ensure_forbidden(`${fib_str} fib(100);`, 'timeout', null, {timeout: 500})
    ensure_forbidden(
      `
      const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      a.map(x => a.map(x => a.map(x => a.map(x => a.map(x => a.map(x => a.map(x => a.map(x => a.map(x => a)))))))));
    `,
      'timeout',
      null,
      {timeout: 500}
    )
    ensure_forbidden(
      'for (let i = 0; i < 10000; i++) {for (let j = 0; j < 10000; j++) {new Date()}}',
      'timeout',
      null,
      {timeout: 500}
    )
  })

  iit('Async', () => {
    ensure_forbidden('async function test() {}', 'disallowed-async-code')
    ensure_forbidden('async () => {}', 'disallowed-async-code')
  })

  iit('This', () => {
    ensure_forbidden('this.x', 'forbidden-this')
  })

})
