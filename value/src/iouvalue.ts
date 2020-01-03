import {Value} from './value'
import {XRPValue} from './xrpvalue'
import BigNumber from 'bignumber.js'

const IOUNumber = BigNumber.clone({
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
  DECIMAL_PLACES: 40
})

const xrpUnits = new IOUNumber(1e6);

class IOUValue extends Value {

  constructor(value: string | BigNumber, roundingMode: BigNumber.RoundingMode = null,
  base: number = null) {

    super(new IOUNumber(value, base).precision(16, roundingMode));
  }

  multiply(multiplicand: Value) {
    if (multiplicand instanceof XRPValue) {
      return super.multiply(
        new IOUValue(
          multiplicand._value.times(xrpUnits)));
    }
    return super.multiply(multiplicand);
  }

  divide(divisor: Value) {
    if (divisor instanceof XRPValue) {
      return super.divide(
        new IOUValue(divisor._value.times(xrpUnits)));
    }
    return super.divide(divisor);
  }

  negate() {
    return new IOUValue(this._value.negated());
  }

  _canonicalize(value) {
    if (value.isNaN()) {
      throw new Error('Invalid result');
    }
    return new IOUValue(value.toPrecision(16));
  }

  equals(comparator) {
    return (comparator instanceof IOUValue)
      && this._value.isEqualTo(comparator._value);
  }
}

export {IOUValue}
