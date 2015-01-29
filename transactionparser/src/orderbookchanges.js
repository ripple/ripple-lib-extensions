var _ = require('lodash');
var utils = require('./utils');
var BigNumber = require('bignumber.js');

function parseOrderbookChange(node) {

  function parseOrderStatus(node) {
    // Create an Offer
    if (node.diffType === 'CreatedNode') {
      return 'created';
    }

    // Partially consume an Offer
    if (node.diffType === 'ModifiedNode') {
      return 'open';
    }

    if (node.diffType === 'DeletedNode') {
      // A consumed order has previous fields
      if (node.previousFields.hasOwnProperty('TakerPays')) {
        return 'closed';
      }

      // A canceled order has no previous fields
      return 'canceled';
    }
  }

  function parseChangeAmount(node, type) {
    var changeAmount;
    var status = parseOrderStatus(node);

    if (status === 'canceled') {
    // Canceled orders do not have PreviousFields and FinalFields have positive values
      changeAmount = utils.parseCurrencyAmount(node.finalFields[type]);
      changeAmount.value = '0';
    } else if (status === 'created') {
      changeAmount = utils.parseCurrencyAmount(node.newFields[type]);
    } else {
      var finalAmount;
      changeAmount = finalAmount = utils.parseCurrencyAmount(node.finalFields[type]);

      var previousAmount = utils.parseCurrencyAmount(node.previousFields[type]);
      var finalValue = new BigNumber(finalAmount.value);
      var prevValue = new BigNumber(previousAmount.value);

      changeAmount.value = finalValue.minus(prevValue).toString();
    }

    return changeAmount;
  }

  return {
    account: node.finalFields.Account || node.newFields.Account,
    taker_pays: parseChangeAmount(node, 'TakerPays'),
    taker_gets: parseChangeAmount(node, 'TakerGets'),
    sequence: node.finalFields.Sequence || node.newFields.Sequence,
    status: parseOrderStatus(node)
  };
}

/**
 * Computes the complete list of every Offer that changed in the ledger
 * as a result of the given transaction.
 *
 *  @param {Object} metadata - Transaction metadata as return by ripple-lib
 *  @returns {Array.<Object>} - Orderbook changes as an array
 *
 */
function parseOrderbookChanges(metadata) {
  var nodes = utils.normalizeNodes(metadata);

  return _.map(_.filter(nodes, function(node) {
    return node.entryType === 'Offer';
  }), parseOrderbookChange);

}


module.exports.parseOrderbookChanges = parseOrderbookChanges;
