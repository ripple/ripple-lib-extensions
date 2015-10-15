'use strict';
var utils = require('./utils');
var Float = require('./ieee754').Float;

function parseHumanCurrency(humanCurrency) {
  var humanRegexp = /^\s*([a-zA-Z0-9\<\>\(\)\{\}\[\]\|\?\!\@\#\$\%\^\&]{3})(\s*-\s*[- \w]+)?(\s*\(-?\d+\.?\d*%pa\))?\s*$/;
  var matches = humanCurrency.match(humanRegexp);

  if (matches) {
    var currencyCode = matches[1];

    // for the currency 'XRP' case
    // we drop everything else that could have been provided
    // e.g. 'XRP - Ripple'
    if (!currencyCode || /^(0|XRP)$/.test(currencyCode)) {
      return 'XRP';
    }

    // the full currency is matched as it is part of the valid currency
    // format, but not stored
    // var full_currency = matches[2] || '';
    var interest = matches[3] || '';

    // interest is defined as interest per year, per annum (pa)
    var percentage = interest.match(/(-?\d+\.?\d+)/);

    currencyCode = currencyCode.toUpperCase();

    var currencyData = utils.arraySet(20, 0);

    if (percentage) {
      /*
       * 20 byte layout of a interest bearing currency
       *
       * 01 __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __
       *    CURCODE- DATE------- RATE------------------- RESERVED---
       */

      // byte 1 for type, use '1' to denote demurrage currency
      currencyData[0] = 1;

      // byte 2-4 for currency code
      currencyData[1] = currencyCode.charCodeAt(0) & 0xff;
      currencyData[2] = currencyCode.charCodeAt(1) & 0xff;
      currencyData[3] = currencyCode.charCodeAt(2) & 0xff;

      // byte 5-8 are for reference date, but should always be 0 so we
      // won't fill it

      // byte 9-16 are for the interest
      percentage = parseFloat(percentage[0]);

        // the interest or demurrage is expressed as a yearly (per annum)
      // value
      var secondsPerYear = 31536000; // 60 * 60 * 24 * 365

      // Calculating the interest e-fold
      // 0.5% demurrage is expressed 0.995, 0.005 less than 1
      // 0.5% interest is expressed as 1.005, 0.005 more than 1
      var interestEfold = secondsPerYear / Math.log(1 + percentage / 100);
      var bytes = Float.toIEEE754Double(interestEfold);

      for (var i = 0; i <= bytes.length; i++) {
        currencyData[8 + i] = bytes[i] & 0xff;
      }

      // the last 4 bytes are reserved for future use, so we won't fill
      // those
      return (new Buffer(currencyData)).toString('hex').toUpperCase();
    }
    return currencyCode;
  }
  throw new Error('Not a human-readable currency format');
}

module.exports = {
  parseHumanCurrency: parseHumanCurrency
};
