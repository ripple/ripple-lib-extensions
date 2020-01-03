import BigNumber from 'bignumber.js'
import {Value} from './value'

const IOUNumber = BigNumber.clone({
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
  DECIMAL_PLACES: 40
});

const xrpUnits = new IOUNumber(1e6);

class XRPValue extends Value {

  constructor(value: string | BigNumber) {
    super(value);
    if (this._value.dp() > 6) {
      throw new Error(
        'Value has more than 6 digits of precision past the decimal point, '
          + 'an IOUValue may be being cast to an XRPValue'
        );
    }
  }

  multiply(multiplicand: Value) {
    if (multiplicand instanceof XRPValue) {
      return super.multiply(
        new XRPValue(multiplicand._value.times(xrpUnits)));
    }
    return super.multiply(multiplicand);
  }

  divide(divisor: Value) {
    if (divisor instanceof XRPValue) {
      return super.divide(
        new XRPValue(divisor._value.times(xrpUnits)));
    }
    return super.divide(divisor);
  }

  negate() {
    return new XRPValue(this._value.negated());
  }

  _canonicalize(value) {
    if (value.isNaN()) {
      throw new Error('Invalid result');
    }
    return new XRPValue(value.decimalPlaces(6, BigNumber.ROUND_DOWN));
  }

  equals(comparator) {
    return (comparator instanceof XRPValue)
      && this._value.isEqualTo(comparator._value);
  }
}

export {XRPValue}
