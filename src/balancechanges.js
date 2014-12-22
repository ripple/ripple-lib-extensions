var _ = require('lodash');
var BigNumber = require('bignumber.js');
var max = require('./utils').max;
var normalizeNodes = require('./utils').normalizeNodes;
var dropsToXRP = require('./utils').dropsToXRP;


function parseAccountRootBalanceChange(node) {
  if (!node.finalFields.Balance) {
    return null;
  }
  var finalBalance = new BigNumber(node.finalFields.Balance);
  var previousBalance = new BigNumber(node.previousFields.Balance || 0);

  return {
    address: node.finalFields.Account,
    balance_change: {
      issuer: '',
      currency: 'XRP',
      value: dropsToXRP(finalBalance.minus(previousBalance)).toString()
    }
  };
}

function parseTrustlineBalanceChange(node, address) {
  if (!_.isEmpty(node.finalFields) && !node.previousFields.Balance) {
    return null;    // setting a trustline limit, no balance change
  }
  var highAccount = node.finalFields.HighLimit.issuer;
  var lowAccount = node.finalFields.LowLimit.issuer;
  if (address !== lowAccount && address !== highAccount) {
    return null;
  }
  var zero = new BigNumber(0);
  var trustFinalBalance = new BigNumber(node.finalFields.Balance.value);
  var trustPreviousBalance = node.previousFields.Balance ?
    new BigNumber(node.previousFields.Balance.value) : zero;

  // orient the balance change because balance is always from low node's
  // perspective, and anything below zero is not our balance; it is
  // the counterparty's balance
  var invertedBalance = (address === highAccount);
  var finalBalance = max(zero, invertedBalance ?
    trustFinalBalance.negated() : trustFinalBalance);
  var previousBalance = max(zero, invertedBalance ?
    trustPreviousBalance.negated() : trustPreviousBalance);
  var balanceChange = finalBalance.minus(previousBalance);
  var issuer = (address === highAccount) ? lowAccount : highAccount;

  if(balanceChange.isZero()) {
    return null;
  }
  return {
    address: address,
    balance_change: {
      issuer: issuer,
      currency: node.finalFields.Balance.currency,
      value: balanceChange.toString()
    }
  };
}

function parseTrustlineBalanceChanges(node) {
  var fields = node.finalFields;
  return [parseTrustlineBalanceChange(node, fields.HighLimit.issuer),
          parseTrustlineBalanceChange(node, fields.LowLimit.issuer)];
}

/**
 * Computes the complete list of every balance that changed in the ledger
 * as a result of the given transaction.
 */
function parseBalanceChanges(metadata) {
  var balanceChanges = normalizeNodes(metadata).map(function(node) {
    if (node.entryType === 'AccountRoot') {
      // Look for XRP balance change in AccountRoot node
      return [parseAccountRootBalanceChange(node)];
    } else if (node.entryType === 'RippleState') {
      // Look for trustline balance change in RippleState node
      return parseTrustlineBalanceChanges(node);
    } else {
      return [ ];
    }
  });
  return _.compact(_.flatten(balanceChanges));
}

module.exports.parseBalanceChanges = parseBalanceChanges;
