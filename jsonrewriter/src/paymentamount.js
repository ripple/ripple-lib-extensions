var _ = require('lodash');
var BigNumber = require('bignumber.js');
var parseBalanceChanges = require('ripple-lib-balancechanges').parseBalanceChanges;
var sum = require('./utils').sum;
var bignumify = require('./utils').bignumify;

/**
 * Takes a transaction and its metadata and returns the amount sent as:
 *
 * If XRP, value sent as String
 *
 * If not XRP,
    {
     value: value sent as String,
     currency: currency code of value sent
    }
  *
  * If unable to determine, returns undefined
  *
  * If the caller needs the issuer of sent currency as well, try tx.sendMax.issuer
 */
function getAmountSent(transaction, metadata) {
  if (transaction.TransactionType !== 'Payment') {
    return null;
  }
  if (metadata.DeliveredAmount) {
    return metadata.DeliveredAmount;
  }
  var sender = transaction.Account;
  var currency = (transaction.SendMax && transaction.SendMax.currency) ?
                 transaction.SendMax.currency : 'XRP';
  var balanceChanges = parseBalanceChanges(metadata);
  var senderChanges = balanceChanges.filter(function(change) {
    return (change.account === sender &&
            change.balance_change.currency === currency);
  });
  var values = _.pluck(_.pluck(senderChanges, 'balance_change'), 'value');
  var paid = sum(bignumify(values)).negated();
  var fee = new BigNumber(transaction.Fee);
  return (currency === 'XRP') ?
          paid.minus(fee).toString() :
          { currency: currency, value: paid.toString() };
}

module.exports.getAmountSent = getAmountSent;
