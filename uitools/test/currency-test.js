'use strict';
var assert = require('assert');
var parseHumanCurrency = require('../src').parseHumanCurrency;

describe('from_human', function() {
  it('From human "USD - Gold (-25%pa)"', function() {
    var currency = parseHumanCurrency('USD - Gold (-25%pa)');
    assert.strictEqual(currency, '0155534400000000C19A22BC51297F0B00000000');
  });
  it('From human "INR - 30 Indian Rupees"', function() {
    var currency = parseHumanCurrency('INR - 30 Indian Rupees');
    assert.strictEqual(currency, 'INR');
  });
  it('From human "XRP"', function() {
    var currency = parseHumanCurrency('XRP');
    assert.strictEqual(currency, 'XRP');
  });
  it('From human "XRP - Ripples"', function() {
    var currency = parseHumanCurrency('XRP - Ripples');
    assert.strictEqual(currency, 'XRP');
  });
});
