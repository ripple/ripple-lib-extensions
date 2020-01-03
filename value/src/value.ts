import BigNumber from 'bignumber.js'
import assert from 'assert'

const IOUNumber = BigNumber.clone({
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
  DECIMAL_PLACES: 40
});

class Value {

  _value: BigNumber

  constructor(value: string | BigNumber) {
    if (new.target === Value) {
      throw new Error(
        'Cannot instantiate Value directly, it is an abstract base class');
    }
    this._value = new IOUNumber(value);
  }

  static getBNRoundDown() {
    return BigNumber.ROUND_DOWN;
  }

  abs() {
    const result = this._value.abs();
    return this._canonicalize(result);
  }

  add(addend: Value) {
    assert(this.constructor === addend.constructor);
    const result = this._value.plus(addend._value);
    return this._canonicalize(result);
  }

  subtract(subtrahend: Value) {
    assert(this.constructor === subtrahend.constructor);
    const result = this._value.minus(subtrahend._value);
    return this._canonicalize(result);
  }

  multiply(multiplicand: Value) {
    const result = this._value.times(multiplicand._value);
    return this._canonicalize(result);
  }

  divide(divisor: Value) {
    if (divisor.isZero()) {
      throw new Error('divide by zero');
    }
    const result = this._value.dividedBy(divisor._value);
    return this._canonicalize(result);
  }

  invert() {
    const result = (new IOUNumber(this._value)).exponentiatedBy(-1);
    return this._canonicalize(result);
  }

  round(decimalPlaces: number, roundingMode: BigNumber.RoundingMode) {
    const result = this._value.decimalPlaces(decimalPlaces, roundingMode);
    return this._canonicalize(result);
  }

  toFixed(decimalPlaces: number, roundingMode: BigNumber.RoundingMode) {
    return this._value.toFixed(decimalPlaces, roundingMode);
  }

  getExponent() {
    return this._value.e;
  }

  isNaN() {
    return this._value.isNaN();
  }

  isZero() {
    return this._value.isZero();
  }

  isNegative() {
    return this._value.isNegative();
  }

  toString() {
    return this._value.toString();
  }

  greaterThan(comparator: Value) {
    assert(this.constructor === comparator.constructor);
    return this._value.isGreaterThan(comparator._value);
  }

  lessThan(comparator: Value) {
    assert(this.constructor === comparator.constructor);
    return this._value.isLessThan(comparator._value);
  }

  comparedTo(comparator: Value) {
    assert(this.constructor === comparator.constructor);
    return this._value.comparedTo(comparator._value);
  }

  _canonicalize(value) {
    throw new Error('Subclasses must implement _canonicalize')
  }
}

export {Value}
