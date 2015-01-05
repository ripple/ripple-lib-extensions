var _ = require('lodash');
var BigNumber = require('bignumber.js');
var toTimestamp = require('./utils').toTimestamp;
var fromTimestamp = require('./utils').fromTimestamp;
var ledgerEntryFlags = require('./flags').ledgerEntryFlags;
var transactionFlags = require('./flags').transactionFlags;
var getAmountSent = require('./paymentamount').getAmountSent;

function equals(value1, value2) {
  return (new BigNumber(value1)).equals(value2);
}

function negate(value) {
  return (new BigNumber(value)).negated().toString();
}

function subtract(value1, value2) {
  return (new BigNumber(value1)).minus(value2).toString();
}

/**
 * Determine if the transaction is a 'rippling' transaction based on effects
 *
 * @param effects
 */
var isRippling = function(effects){
  if (
    effects
    && effects.length
    && 2 === effects.length
    && 'trust_change_balance' === effects[0].type
    && 'trust_change_balance' === effects[1].type
    && effects[0].currency === effects[1].currency
    && equals(effects[0].amount.value, negate(effects[1].amount.value))
  ) {
    return true;
  }
};

/**
 * Takes a metadata affected node and returns a simpler JSON object.
 *
 * The resulting object looks like this:
 *
 *   {
 *     // Type of diff, e.g. CreatedNode, ModifiedNode
 *     diffType: 'CreatedNode'
 *
 *     // Type of node affected, e.g. RippleState, AccountRoot
 *     entryType: 'RippleState',
 *
 *     // Index of the ledger this change occurred in
 *     ledgerIndex: '01AB01AB...',
 *
 *     // Contains all fields with later versions taking precedence
 *     //
 *     // This is a shorthand for doing things like checking which account
 *     // this affected without having to check the diffType.
 *     fields: {...},
 *
 *     // Old fields (before the change)
 *     fieldsPrev: {...},
 *
 *     // New fields (that have been added)
 *     fieldsNew: {...},
 *
 *     // Changed fields
 *     fieldsFinal: {...}
 *   }
 */
function simplifyNode(an) {
  var result = {};

  ['CreatedNode', 'ModifiedNode', 'DeletedNode'].forEach(function (x) {
    if (an[x]) {
      result.diffType = x;
    }
  });

  if (!result.diffType) {
    return null;
  }

  an = an[result.diffType];

  result.entryType = an.LedgerEntryType;
  result.ledgerIndex = an.LedgerIndex;

  result.fields = _.extend({}, an.PreviousFields, an.NewFields, an.FinalFields);
  result.fieldsPrev = an.PreviousFields || {};
  result.fieldsNew = an.NewFields || {};
  result.fieldsFinal = an.FinalFields || {};

  return result;
}


function processMainTransaction(tx, meta, account) {
  var transaction = {};

  if (tx.Account === account
      || (tx.Destination && tx.Destination === account)
      || (tx.LimitAmount && tx.LimitAmount.issuer === account)) {
    return {};
  }

  if ('tesSUCCESS' !== meta.TransactionResult) {
    return {type: 'failed'};
  }

  switch (tx.TransactionType) {
    case 'Payment':
      var amount = tx.Amount;

      if (tx.Account === account) {
        if (tx.Destination === account) {
          transaction.type = 'exchange';
          transaction.spent = tx.SendMax;
        }
        else {
          transaction.type = 'sent';
          transaction.counterparty = tx.Destination;
        }
      }
      else {
        transaction.type = 'received';
        transaction.counterparty = tx.Account;
      }

      if (typeof tx.SendMax === 'object') {
        transaction.sendMax = tx.SendMax;
      }

      var amtSent = getAmountSent(tx, meta);
      if (amtSent) {
        transaction.amountSent = amtSent;
      }

      transaction.amount = amount;
      transaction.currency = amount.currency; // TODO: to_human
      break;

    case 'TrustSet':
      transaction.type = tx.Account === account ? 'trusting' : 'trusted';
      transaction.counterparty = tx.Account === account ? tx.LimitAmount.issuer : tx.Account;
      transaction.amount = tx.LimitAmount;
      transaction.currency = tx.LimitAmount.currency;
      break;

    case 'OfferCreate':
      transaction.type = 'offernew';
      transaction.pays = tx.TakerPays;
      transaction.gets = tx.TakerGets;
      transaction.sell = tx.Flags & transactionFlags.OfferCreate.Sell;
      break;

    case 'OfferCancel':
      transaction.type = 'offercancel';
      break;

    case 'AccountSet':
      // Ignore empty accountset transactions. (Used to sync sequence numbers)
      if (meta.AffectedNodes.length === 1 && _.size(meta.AffectedNodes[0].ModifiedNode.PreviousFields) === 2) {
        break;
      }

      transaction.type = 'accountset';
      break;

    default:
      console.log('Unknown transaction type: "'+tx.TransactionType+'"', tx);
  }

  if (tx.Flags) {
    transaction.flags = tx.Flags;
  }

  return transaction;
}

function processAffectedNode(tx, meta, account, obj, node) {
  var feeEff;
  var effect = {};

  // AccountRoot - Current account node
  if (node.entryType === 'AccountRoot' && node.fields.Account === account) {
    obj.accountRoot = node.fields;

    if (node.fieldsPrev.Balance) {
      var balance = node.fields.Balance;

      // Fee
      if(tx.Account === account && tx.Fee) {
        feeEff = {
          type: 'fee',
          amount: negate(tx.Fee),
          balance: balance
        };
      }

      // Updated XRP Balance
      if (tx.Fee !== node.fieldsPrev.Balance - node.fields.Balance) {
        if (feeEff) {
          balance = subtract(balance, feeEff.amount);
        }

        effect.type = 'balance_change';
        effect.amount = subtract(balance, node.fieldsPrev.Balance);
        effect.balance = balance;

        // balance_changer is set to true if the transaction / effect has changed one of the account balances
        obj.balance_changer = effect.balance_changer = true;
        obj.affected_currencies.push('XRP');
      }
    }
  }

  // RippleState - Ripple Lines
  if (node.entryType === 'RippleState'
      && (node.fields.HighLimit.issuer === account || node.fields.LowLimit.issuer === account)) {

    var high = node.fields.HighLimit;
    var low = node.fields.LowLimit;

    var which = high.issuer === account ? 'HighNoRipple' : 'LowNoRipple';

    // New trust line
    if (node.diffType === 'CreatedNode') {
      effect.limit = high.value > 0 ? high : low;
      effect.limit_peer = high.value > 0 ? low : high;

      if ((high.value > 0 && high.issuer === account)
          || (low.value > 0 && low.issuer === account)) {
        effect.type = 'trust_create_local';
      } else {
        effect.type = 'trust_create_remote';
      }
    }

    // Modified trust line
    else if (node.diffType === 'ModifiedNode' || node.diffType === 'DeletedNode') {
      var highPrev = node.fieldsPrev.HighLimit;
      var lowPrev = node.fieldsPrev.LowLimit;

      // Trust Balance change
      if (node.fieldsPrev.Balance) {
        effect.type = 'trust_change_balance';

        var issuer =  node.fields.Balance.value > 0 || node.fieldsPrev.Balance.value > 0
            ? high.issuer : low.issuer;

        var previousBalance = new BigNumber(node.fieldsPrev.Balance.value);
        var finalBalance = new BigNumber(node.fields.Balance.value);
        var balanceChange = finalBalance.minus(previousBalance);
        var value = (high.issuer === account) ?
                    balanceChange.negated() : balanceChange;

        effect.amount = {
          value: value.toString(),
          currency: node.fieldsPrev.Balance.currency,
          issuer: issuer
        };

        obj.balance_changer = effect.balance_changer = true;
        obj.affected_currencies.push(high.currency.toUpperCase());
      }

      // Trust Limit change
      else if (highPrev || lowPrev) {
        if (high.issuer === account) {
          effect.limit = high;
          effect.limit_peer = low;
        } else {
          effect.limit = low;
          effect.limit_peer = high;
        }

        if (highPrev) {
          effect.prevLimit = highPrev;
          effect.type = high.issuer === account ? 'trust_change_local' : 'trust_change_remote';
        }
        else if (lowPrev) {
          effect.prevLimit = lowPrev;
          effect.type = high.issuer === account ? 'trust_change_remote' : 'trust_change_local';
        }
      }

      // Trust flag change (effect gets this type only if nothing else but flags has been changed)
      else if (node.fieldsPrev.Flags) {
        // Account set a noRipple flag
        if (node.fields.Flags & ledgerEntryFlags.state[which] &&
            !(node.fieldsPrev.Flags & ledgerEntryFlags.state[which])) {
          effect.type = 'trust_change_no_ripple';
        }

        // Account removed the noRipple flag
        else if (node.fieldsPrev.Flags & ledgerEntryFlags.state[which] &&
            !(node.fields.Flags & ledgerEntryFlags.state[which])) {
          effect.type = 'trust_change_no_ripple';
        }

        if (effect.type) {
          effect.flags = node.fields.Flags;
        }
      }
    }

    if (!_.isEmpty(effect)) {
      var finalBalance = new BigNumber(node.fields.Balance.value);
      effect.counterparty = high.issuer === account ? low.issuer : high.issuer;
      effect.currency = high.currency;
      effect.balance = high.issuer === account
          ? finalBalance.negated().toString()
          : finalBalance.toString();

      if (obj.transaction && obj.transaction.type === 'trust_change_balance') {
        obj.transaction.balance = effect.balance;
      }

      // noRipple flag
      if (node.fields.Flags & ledgerEntryFlags.state[which]) {
        effect.noRipple = true;
      }
    }
  }

  // Offer
  else if (node.entryType === 'Offer') {

    // For new and cancelled offers we use 'fields'
    var fieldSet = node.fields;

    // Current account offer
    if (node.fields.Account === account) {

      // Partially funded offer [and deleted.. no more funds]
      /* Offer has been partially funded and deleted (because of the lack of funds)
       if the node is deleted and the TakerGets/TakerPays field has been changed */
      if (node.diffType === 'ModifiedNode' ||
          (node.diffType === 'DeletedNode'
              && node.fieldsPrev.TakerGets
              && !(new BigNumber(node.fieldsFinal.TakerGets.value).isZero()))) {
        effect.type = 'offer_partially_funded';

        if (node.diffType !== 'DeletedNode') {
          effect.remaining = node.fields.TakerGets;
        }
        else {
          effect.cancelled = true;
        }
      }
      else {
        // New / Funded / Cancelled offer
        effect.type = node.diffType === 'CreatedNode'
            ? 'offer_created'
            : node.fieldsPrev.TakerPays
            ? 'offer_funded'
            : 'offer_cancelled';

        // For funded offers we use 'fieldsPrev'.
        if (effect.type === 'offer_funded') {
          fieldSet = node.fieldsPrev;
        }

        // We don't count cancelling an offer as a side effect if it's
        // already the primary effect of the transaction.
        if (effect.type === 'offer_cancelled' &&
            obj.transaction &&
            obj.transaction.type === 'offercancel') {

          // Fill in remaining information about offer
          obj.transaction.gets = fieldSet.TakerGets;
          obj.transaction.pays = fieldSet.TakerPays;
        }
      }

      effect.seq = +node.fields.Sequence;
    }

    // Another account offer. We care about it only if our transaction changed the offer amount (we bought currency)
    else if(tx.Account === account && !_.isEmpty(node.fieldsPrev) /* Offer is unfunded if node.fieldsPrev is empty */) {
      effect.type = 'offer_bought';
    }

    if (effect.type) {
      effect.gets = fieldSet.TakerGets;
      effect.pays = fieldSet.TakerPays;

      if ('offer_partially_funded' === effect.type || 'offer_bought' === effect.type) {
        effect.got = subtract(node.fieldsPrev.TakerGets.value,
                              node.fields.TakerGets.value);
        effect.paid = subtract(node.fieldsPrev.TakerPays.value,
                               node.fields.TakerPays.value);
      }
    }

    /*if (effect.gets && effect.pays) {
      effect.price = getPrice(effect, tx.date);
    }*/

    // Flags
    if (node.fields.Flags) {
      effect.flags = node.fields.Flags;
      effect.sell = node.fields.Flags & ledgerEntryFlags.offer.Sell;
    }
  }

  if (!_.isEmpty(effect)) {
    if (node.diffType === 'DeletedNode') {
      effect.deleted = true;
    }

    if (!obj.effects) {
      obj.effects = [];
    }
    obj.effects.push(effect);
  }

  // Fee effect
  if (feeEff) {
    if (!obj.effects) {
      obj.effects = [];
    }
    obj.effects.push(feeEff);
  }
}

function partialTransactionClone(tx, meta) {
  return {
    tx_type: tx.TransactionType,
    tx_result: meta.TransactionResult,
    fee: tx.Fee,
    date: toTimestamp(tx.date),
    dateRaw: tx.date,
    hash: tx.hash,
    //ledger_index: tx.ledger_index // outside of tx object
  };
}

function _processTxn(tx, meta, account) {
  var obj = partialTransactionClone(tx, meta);

  obj.transaction = processMainTransaction(tx, meta, account);
  if ('tesSUCCESS' === meta.TransactionResult) {
    // Currency balances that have been affected by the transaction
    obj.affected_currencies = [];
    meta.AffectedNodes.forEach(function (n) {
      processAffectedNode(tx, meta, account, obj, simplifyNode(n));
    });
  }

  // Balance after the transaction
  if (obj.accountRoot && obj.transaction
      && 'undefined' === typeof obj.transaction.balance) {
    obj.transaction.balance = obj.accountRoot.Balance;
  }

  if (_.isEmpty(obj)) {
    return;
  }

  // If the transaction didn't wind up cancelling an offer
  if (tx.TransactionType === 'OfferCancel' && obj.transaction &&
    (!obj.transaction.gets || !obj.transaction.pays)) {
    return;
  }

  // Rippling transaction
  if (isRippling(obj.effects)) {
    if (!obj.transaction) {
      obj.transaction = {};
    }
    obj.transaction.type = 'rippling';
  }

  return obj;
}

/**
 * Convert transactions into a more useful (for our purposes) format.
 *
 * The main operation this function performs is to change the view on the
 * transaction from a neutral view to a subjective view specific to our
 * account.
 *
 * For example, rather than having a sender and receiver, the transaction has
 * a counterparty and a flag whether it is incoming or outgoing.
 *
 * processTxn returns main purpose of transaction and side effects.
 *
 * Main purpose
 *  Real transaction names
 *  - Payment (sent/received/exchange)
 *  - TrustSet (trusting/trusted)
 *  - OfferCreate (offernew)
 *  - OfferCancel (offercancel)
 *
 *  Virtual transaction names
 *  - Failed
 *  - Rippling
 *
 * Side effects
 *  - balance_change
 *  - Trust (trust_create_local, trust_create_remote, trust_change_local,
 *          trust_change_remote, trust_change_balance, trust_change_no_ripple)
 *  - Offer (offer_created, offer_funded, offer_partially_funded,
 *          offer_cancelled, offer_bought)
 */
function processTxn(tx, meta, account) {
  try {
    return _processTxn(tx, meta, account);
  } catch (err) {
    var transaction = {};
    transaction.type = 'error';
    if (tx && 'object' === typeof tx) {
      transaction.hash = tx.hash;
      transaction.date = toTimestamp(tx.date);
      transaction.dateRaw = tx.date;
    } else {
      transaction.hash = 'unknown';
      transaction.date = new Date().getTime();
      transaction.dateRaw = fromTimestamp(tx.date);
    }
    return {transaction: transaction, error: err, stack: err.stack};
  }
}

module.exports.processTxn = processTxn;
