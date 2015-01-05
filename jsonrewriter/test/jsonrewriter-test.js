var assert = require('assert-diff');
var fs = require('fs');
var processTxn = require('../src/jsonrewriter').processTxn;

var xrpPayment = {
  'tx_type': 'Payment',
  'tx_result': 'tesSUCCESS',
  'fee': '12000',
  'date': 1418175200000,
  'dateRaw': 471490400,
  'hash': '43CAAC76C95358CA2F84EA8BF5BFC327B90B21039A3C69EC4EAC7FEDC54CDB9F',
  'transaction': {
    'balance': '339903994'
  },
  'affected_currencies': [
    'XRP'
  ],
  'accountRoot': {
    'Balance': '339903994',
    'Sequence': 9,
    'Account': 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
    'Flags': 0,
    'OwnerCount': 0
  },
  'balance_changer': true,
  'effects': [
    {
      'type': 'balance_change',
      'amount': '-100000000',
      'balance': '339915994',
      'balance_changer': true
    },
    {
      'type': 'fee',
      'amount': '-12000',
      'balance': '339903994'
    }
  ]
};

var usdPayment = {
  'tx_type': 'Payment',
  'tx_result': 'tesSUCCESS',
  'fee': '12000',
  'date': 1418328950000,
  'dateRaw': 471644150,
  'hash': '34671C179737CC89E0F8BBAA83C313885ED1733488FC0F3088BAE16A3D9A5B1B',
  'transaction': {
    'balance': '239555992'
  },
  'affected_currencies': [
    'USD',
    'XRP'
  ],
  'balance_changer': true,
  'effects': [
    {
      'type': 'trust_change_balance',
      'amount': {
        'value': '-0.01',
        'currency': 'USD',
        'issuer': 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
      },
      'balance_changer': true,
      'counterparty': 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
      'currency': 'USD',
      'balance': '1.525330905250352',
      'noRipple': true
    },
    {
      'type': 'balance_change',
      'amount': '0',
      'balance': '239567992',
      'balance_changer': true
    },
    {
      'type': 'fee',
      'amount': '-12000',
      'balance': '239555992'
    }
  ],
  'accountRoot': {
    'Balance': '239555992',
    'Sequence': 38,
    'Account': 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
    'Flags': 0,
    'OwnerCount': 1
  }
};

function loadFixture(filename) {
  var path = __dirname + '/fixtures/' + filename;
  return JSON.parse(fs.readFileSync(path));
}

function process(paymentResponse, account) {
  var tx = paymentResponse.transaction || paymentResponse.tx_json;
  var meta = paymentResponse.metadata;
  var result = processTxn(tx, meta, account);
  return result;
}

describe('processTxn', function() {
  it('XRP create account', function() {
    var paymentResponse = loadFixture('payment-xrp-create-account.json');
    var account = 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc';
    var result = process(paymentResponse, account);
    assert.deepEqual(result, xrpPayment);
  });
  it('USD payment', function() {
    var paymentResponse = loadFixture('payment-iou.json');
    var account = 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc';
    var result = process(paymentResponse, account);
    assert.deepEqual(result, usdPayment);
  });
});
