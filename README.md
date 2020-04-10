# Jail for JS code

## How does the sandboxing work

We use three different techniques to provide sandboxing.

### Forbid read and write global properties using `with` and `Proxy`

The approach is described here:
https://www.figma.com/blog/how-we-built-the-figma-plugin-system/

### Temporarily disallow some dangerous methods

For example, we use something like this to forbid jailed code to access `Object.assign` property:

```
let backup
try {
  backup = Object.assign
  Object.assign = null // actually, it's function that'll throw when executed
  eval(unsafe_code)
} finally {
  Object.assign = backup
}

### Inspecting unsafe code and putting guards into it

We use babel to modify `obj[prop]` into `safe_get(obj, prop)`. Within `safe_get` we check whether
`prop` equals something dangerous (e.g. `__proto__`) and throw if so.

We also use guards to periodically check for the current time and to throw if the timeout is reached.

## What JS code can(not) be interpretted

- Any modifications to objects are disallowed for example `({}).a = 'hello'` will throw. Allowed are
  Map, Set, and splicing objects (for example `{...a, b: c}`)
- Reading from objects is fine (i.e. ({a: 1}).a === 1), but reading 'dangerous' properties (such as
  __proto__ will throw.
- Writing to global variables is disallowed.
- Reading/using of global variables is limited. For example, you cannot use Proxy. You can use
  Object, but Object.assign will throw. You can use Array, but Array.push will throw.
- You cannot write non-synchronous code

# Usage
```
  // it's not packaged as npm module yet

  const {safe_eval} = require('./jail')

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
```

# Development
```
yarn
yarn run test
```
to run tests in node.js environment.

```
yarn
yarn build-client
chromium index.html
```
to run tests in the browser environment.
