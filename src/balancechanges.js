var _ = require('lodash');
var BigNumber = require('bignumber.js');
var normalizeNodes = require('./utils').normalizeNodes;
var dropsToXRP = require('./utils').dropsToXRP;


function parseXRPBalanceChange(node) {
  if (!node.finalFields.Balance) {
    return null;
  }
  var finalBalance = new BigNumber(node.finalFields.Balance);
  var previousBalance = new BigNumber(node.previousFields.Balance || 0);
  var balanceChange = finalBalance.minus(previousBalance);

  return {
    address: node.finalFields.Account,
    balance_change: {
      counterparty: '',
      currency: 'XRP',
      value: dropsToXRP(balanceChange).toString()
    }
  };
}

function flipBalanceChange(change) {
  var negatedBalance = (new BigNumber(change.balance_change.value)).negated();
  return {
    address: change.balance_change.counterparty,
    balance_change: {
      counterparty: change.address,
      currency: change.balance_change.currency,
      value: negatedBalance.toString()
    }
  };
}

function parseTrustlineBalanceChanges(node) {
  if (!_.isEmpty(node.finalFields) && !node.previousFields.Balance) {
    return null;    // setting a trustline limit, no balance change
  }
  var highAccount = node.finalFields.HighLimit.issuer;
  var lowAccount = node.finalFields.LowLimit.issuer;
  var finalBalance = new BigNumber(node.finalFields.Balance.value);
  var previousBalance = node.previousFields.Balance ?
    new BigNumber(node.previousFields.Balance.value) : new BigNumber(0);
  var balanceChange = finalBalance.minus(previousBalance);

  if(balanceChange.isZero()) {
    return null;
  }
  // the balance is always from low node's perspective
  var change = {
    address: lowAccount,
    balance_change: {
      counterparty: highAccount,
      currency: node.finalFields.Balance.currency,
      value: balanceChange.toString()
    }
  };
  return [change, flipBalanceChange(change)];
}

/**
 * Computes the complete list of every balance that changed in the ledger
 * as a result of the given transaction.
 */
function parseBalanceChanges(metadata) {
  var balanceChanges = normalizeNodes(metadata).map(function(node) {
    if (node.entryType === 'AccountRoot') {
      return [parseXRPBalanceChange(node)];
    } else if (node.entryType === 'RippleState') {
      return parseTrustlineBalanceChanges(node);
    } else {
      return [ ];
    }
  });
  return _.compact(_.flatten(balanceChanges));
}

module.exports.parseBalanceChanges = parseBalanceChanges;
