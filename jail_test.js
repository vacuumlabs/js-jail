const {assert} = require('chai')
const {safe_eval} = require('./jail')

describe('basics', () => {

  it('basic stuff works', () => {
    assert.equal(safe_eval('2+2'), 4)
  })

  it('reading global variable innaccessible', () => {
    try {
      safe_eval('haha')
      assert.isTrue(false)
    } catch (err) {
      assert.equal(err.type, 'get_global')
      assert.equal(err.key, 'haha')
    }
  })

  it('setting global variable forbidden', () => {
    try {
      safe_eval('haha=10')
      assert.isTrue(false)
    } catch (err) {
      assert.equal(err.type, 'set_global')
      assert.equal(err.key, 'haha')
    }
  })

})
