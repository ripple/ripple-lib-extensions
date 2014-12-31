var assert = require('assert-diff');
var fs = require('fs');
var parseBalanceChanges = require('../src/balancechanges').parseBalanceChanges;

// Pay 100 XRP from rKmB to rLDY to create rLDY account
var createAccountBalanceChanges = [
  { address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
    balance_change: {
      value: '100',
      currency: 'XRP',
      counterparty: ''
    }
  },
  { address: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
    balance_change: {
      value: '-100.012',
      currency: 'XRP',
      counterparty: ''
    },
  }
];

// Pay 0.01 USD from rKmB to rLDY where rLDY starts with no USD
var usdFirstPaymentBalanceChanges = [
  { address: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
    balance_change: {
      value: '-0.01',
      currency: 'USD',
      counterparty: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
    }
  },
  {
    address: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
    balance_change: {
      counterparty: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
      currency: 'USD',
      value: '0.01'
    }
  },
  {
    address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
    balance_change: {
      counterparty: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
      currency: 'USD',
      value: '0.01'
    }
  },
  {
    address: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
    balance_change: {
      counterparty: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
      currency: 'USD',
      value: '-0.01'
    }
  },
  { address: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
    balance_change: {
      value: '-0.012',
      currency: 'XRP',
      counterparty: ''
    }
  }
];

// Pay 0.2 USD from rLDY to rKmB where rLDY starts with 0.2 USD
var usdFullPaymentBalanceChanges = [
  { address: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
    balance_change: {
      value: '0.2',
      currency: 'USD',
      counterparty: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
    }
  },
  { address: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
    balance_change: {
      value: '-0.2',
      currency: 'USD',
      counterparty: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc'
    }
  },
  { address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
    balance_change: {
      value: '-0.2',
      currency: 'USD',
      counterparty: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
    }
  },
  { address: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
    balance_change: {
      value: '0.2',
      currency: 'USD',
      counterparty: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K'
    }
  },
  { address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
    balance_change: {
      value: '-0.012',
      currency: 'XRP',
      counterparty: ''
    }
  }
];

// Pay 0.01 USD from rKmB to rLDY where rLDY starts with 0.01 USD
var usdPaymentBalanceChanges = usdFirstPaymentBalanceChanges;

// Set trust limit to 200 USD on rLDY when it has a trust limit of 100 USD
// and has a balance of 0.02 USD
var setTrustlineBalanceChanges = [
  {
    address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
    balance_change: {
      value: '-0.012',
      currency: 'XRP',
      counterparty: ''
    }
  }
];

// Set trust limit to 100 USD on rLDY when it has no trustline
var createTrustlineBalanceChanges = setTrustlineBalanceChanges;

// Pay 0.02 USD from rLDY to rKmB when rLDY has a trust limit of 0
// for USD, but still has a balance of 0.02 USD; which closes the trustline
var deleteTrustlineBalanceChanges = [
    {
      address: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc',
      balance_change: {
        value: '0.02',
        currency: 'USD',
        counterparty: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
      }
    },
    {
      address: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
      balance_change: {
        value: '-0.02',
        currency: 'USD',
        counterparty: 'rKmBGxocj9Abgy25J51Mk1iqFzW9aVF9Tc'
      }
    },
    {
      address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
      balance_change: {
        value: '-0.02',
        currency: 'USD',
        counterparty: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
      }
    },
    {
      address: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
      balance_change: {
        value: '0.02',
        currency: 'USD',
        counterparty: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K'
      }
    },
    {
      address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K',
      balance_change: {
        value: '-0.012',
        currency: 'XRP',
        counterparty: ''
      }
    }
];

var redeemBalanceChanges = [
  {
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    balance_change: {
      currency: 'USD',
      counterparty: 'rPMh7Pi9ct699iZUTWaytJUoHcJ7cgyziK',
      value: '100'
    }
  },
  {
    address: 'rPMh7Pi9ct699iZUTWaytJUoHcJ7cgyziK',
    balance_change: {
      currency: 'USD',
      counterparty: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      value: '-100'
    }
  },
  {
    address: 'rPMh7Pi9ct699iZUTWaytJUoHcJ7cgyziK',
    balance_change: {
      currency: 'XRP',
      counterparty: '',
      value: '-0.00001'
    }
  }
];

var redeemThenIssueBalanceChanges = [
  {
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    balance_change: {
      currency: 'USD',
      counterparty: 'rPMh7Pi9ct699iZUTWaytJUoHcJ7cgyziK',
      value: '200'
    }
  },
  {
    address: 'rPMh7Pi9ct699iZUTWaytJUoHcJ7cgyziK',
    balance_change: {
      currency: 'USD',
      counterparty: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      value: '-200'
    }
  },
  {
    address: 'rPMh7Pi9ct699iZUTWaytJUoHcJ7cgyziK',
    balance_change: {
      currency: 'XRP',
      counterparty: '',
      value: '-0.00001'
    }
  }
];

var multipathBalanceChanges = [
  {
    'address': 'rrnsYgWn13Z28GtRgznrSUsLfMkvsXCZSu',
    'balance_change': {
      'counterparty': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
      'currency': 'USD',
      'value': '100'
    }
  },
  {
    'address': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
    'balance_change': {
      'counterparty': 'rrnsYgWn13Z28GtRgznrSUsLfMkvsXCZSu',
      'currency': 'USD',
      'value': '-100'
    }
  },
  {
    'address': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
    'balance_change': {
      'counterparty': '',
      'currency': 'XRP',
      'value': '-0.00001'
    }
  },
  {
    'address': 'rJsaPnGdeo7BhMnHjuc3n44Mf7Ra1qkSVJ',
    'balance_change': {
      'counterparty': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
      'currency': 'USD',
      'value': '100'
    }
  },
  {
    'address': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
    'balance_change': {
      'counterparty': 'rJsaPnGdeo7BhMnHjuc3n44Mf7Ra1qkSVJ',
      'currency': 'USD',
      'value': '-100'
    }
  },
  {
    'address': 'rGpeQzUWFu4fMhJHZ1Via5aqFC3A5twZUD',
    'balance_change': {
      'counterparty': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
      'currency': 'USD',
      'value': '100'
    }
  },
  {
    'address': 'r4nmQNH4Fhjfh6cHDbvVSsBv7KySbj4cBf',
    'balance_change': {
      'counterparty': 'rGpeQzUWFu4fMhJHZ1Via5aqFC3A5twZUD',
      'currency': 'USD',
      'value': '-100'
    }
  },
  {
    'address': 'rnYDWQaRdMb5neCGgvFfhw3MBoxmv5LtfH',
    'balance_change': {
      'counterparty': 'rJsaPnGdeo7BhMnHjuc3n44Mf7Ra1qkSVJ',
      'currency': 'USD',
      'value': '100'
    }
  },
  {
    'address': 'rJsaPnGdeo7BhMnHjuc3n44Mf7Ra1qkSVJ',
    'balance_change': {
      'counterparty': 'rnYDWQaRdMb5neCGgvFfhw3MBoxmv5LtfH',
      'currency': 'USD',
      'value': '-100'
    }
  },
  {
    'address': 'rrnsYgWn13Z28GtRgznrSUsLfMkvsXCZSu',
    'balance_change': {
      'counterparty': 'rnYDWQaRdMb5neCGgvFfhw3MBoxmv5LtfH',
      'currency': 'USD',
      'value': '-100'
    }
  },
  {
    'address': 'rnYDWQaRdMb5neCGgvFfhw3MBoxmv5LtfH',
    'balance_change': {
      'counterparty': 'rrnsYgWn13Z28GtRgznrSUsLfMkvsXCZSu',
      'currency': 'USD',
      'value': '100'
    }
  },
  {
    'address': 'rnYDWQaRdMb5neCGgvFfhw3MBoxmv5LtfH',
    'balance_change': {
      'counterparty': 'rGpeQzUWFu4fMhJHZ1Via5aqFC3A5twZUD',
      'currency': 'USD',
      'value': '100'
    }
  },
  {
    'address': 'rGpeQzUWFu4fMhJHZ1Via5aqFC3A5twZUD',
    'balance_change': {
      'counterparty': 'rnYDWQaRdMb5neCGgvFfhw3MBoxmv5LtfH',
      'currency': 'USD',
      'value': '-100'
    }
  }
];

// Set trust limit to zero on rLDY when it has a balance of 0.02 USD
var removeTrustBalanceChanges = setTrustlineBalanceChanges;


function loadFixture(filename) {
  var path = __dirname + '/fixtures/' + filename;
  return JSON.parse(fs.readFileSync(path));
}

describe('parseBalanceChanges', function() {
  it('XRP create account', function() {
    var paymentResponse = loadFixture('payment-xrp-create-account.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, createAccountBalanceChanges);
  });
  it('USD payment to account with no USD', function() {
    var filename = 'payment-iou-destination-no-balance.json';
    var paymentResponse = loadFixture(filename);
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, usdFirstPaymentBalanceChanges);
  });
  it('USD payment of all USD in source account', function() {
    var paymentResponse = loadFixture('payment-iou-spend-full-balance.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, usdFullPaymentBalanceChanges);
  });
  it('USD payment to account with USD', function() {
    var paymentResponse = loadFixture('payment-iou.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, usdPaymentBalanceChanges);
  });
  it('Set trust limit to 0 with balance remaining', function() {
    var paymentResponse = loadFixture('trustline-set-limit-to-zero.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, removeTrustBalanceChanges);
  });
  it('Create trustline', function() {
    var paymentResponse = loadFixture('trustline-create.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, createTrustlineBalanceChanges);
  });
  it('Set trustline', function() {
    var paymentResponse = loadFixture('trustline-set-limit.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, setTrustlineBalanceChanges);
  });
  it('Delete trustline', function() {
    var paymentResponse = loadFixture('trustline-delete.json');
    var result = parseBalanceChanges(paymentResponse.metadata);
    assert.deepEqual(result, deleteTrustlineBalanceChanges);
  });
  it('Redeem USD', function() {
    var paymentResponse = loadFixture('payment-iou-redeem.json');
    var result = parseBalanceChanges(paymentResponse.result.meta);
    assert.deepEqual(result, redeemBalanceChanges);
  });
  it('Redeem then issue USD', function() {
    var paymentResponse = loadFixture('payment-iou-redeem-then-issue.json');
    var result = parseBalanceChanges(paymentResponse.result.meta);
    assert.deepEqual(result, redeemThenIssueBalanceChanges);
  });
  it('Multipath USD payment', function() {
    var paymentResponse = loadFixture('payment-iou-multipath.json');
    var result = parseBalanceChanges(paymentResponse.result.meta);
    assert.deepEqual(result, multipathBalanceChanges);
  });
});
