var BigNumber = require('bignumber.js');

BigNumber.prototype.isPositive = function() {
  return !this.isNegative() && !this.isZero();
};

/*
* Determines which is the `issuer` on a trustline by inspecting the Balance
* and limits.
*
* @param {BigNumber} finalBalance
* @param {BigNumber} previousBalance
* @param {BigNumber} highLimit
* @param {BigNumber} lowLimit
*
* TODO: We only have test cases exercising returns 1,2,3 and 6
*/
function isHighNodeIssuer(finalBalance, previousBalance, highLimit, lowLimit) {
  // The sign of a trustline's balance depends on which of the high/low nodes
  // owes the other. Balances are from low node's persepective.
  if (finalBalance.isPositive()) {
    return true;
  } else if (finalBalance.isNegative()) {
    return false;
  } else if (previousBalance.isPositive()) {
    return true;
  } else if (previousBalance.isNegative()) {
    return false;
  } else if (lowLimit.isZero() && highLimit.isPositive()) {
    return false;    // high node cannot issue
  } else if (highLimit.isZero() && lowLimit.isPositive()) {
    return true;     // low node cannot issue
  } else {
    return false;    // totally arbitrary
  }
}

module.exports.isHighNodeIssuer = isHighNodeIssuer;
