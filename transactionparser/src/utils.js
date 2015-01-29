var BigNumber = require('bignumber.js');

// drops is a bignumber.js BigNumber
function dropsToXRP(drops) {
  return drops.dividedBy(1000000);
}

function normalizeNode(affectedNode) {
  var diffType = Object.keys(affectedNode)[0];
  var node = affectedNode[diffType];
  return {
    diffType: diffType,
    entryType: node.LedgerEntryType,
    ledgerIndex: node.LedgerIndex,
    newFields: node.NewFields || {},
    finalFields: node.FinalFields || {},
    previousFields: node.PreviousFields || {}
  };
}

function normalizeNodes(metadata) {
  if (!metadata.AffectedNodes) {
    return [];
  }
  return metadata.AffectedNodes.map(normalizeNode);
}

function parseCurrencyAmount(currencyAmount) {
  if (typeof currencyAmount === 'string') {
    return {
      currency: 'XRP',
      counterparty: '',
      value: dropsToXRP(new BigNumber(currencyAmount)).toString()
    };
  }

  return {
    currency: currencyAmount.currency,
    counterparty: currencyAmount.issuer,
    value: currencyAmount.value
  };
}

module.exports.dropsToXRP = dropsToXRP;
module.exports.normalizeNodes = normalizeNodes;
module.exports.parseCurrencyAmount = parseCurrencyAmount;
