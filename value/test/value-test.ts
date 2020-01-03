import assert from 'assert'
import {Value} from '../src/value'

describe('Value', () => {
  it('throws when instantiated directly', () => {
    assert.throws(() => {
      new Value('123')
    }, {
      name: 'Error',
      message: 'Cannot instantiate Value directly, it is an abstract base class'
    })
  })
})
