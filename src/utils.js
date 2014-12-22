var _ = require('lodash');
var BigNumber = require('bignumber.js');

function sum(bignums) {
  return _.reduce(bignums, function(a, b) {
    return a.plus(b);
  }, new BigNumber(0));
}

function bignumify(stringNums) {
  return stringNums.map(function(stringNum) {
    return new BigNumber(stringNum);
  });
}

function max(bignum1, bignum2) {
  return bignum1.greaterThanOrEqualTo(bignum2) ? bignum1 : bignum2;
}

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
    finalFields: node.FinalFields || node.NewFields || {},
    previousFields: node.PreviousFields || {}
  };
}

function normalizeNodes(metadata) {
  if (!metadata.AffectedNodes) {
    return [];
  }
  return metadata.AffectedNodes.map(normalizeNode);
}

/**
 * Convert a ripple epoch to a JavaScript timestamp.
 *
 * JavaScript timestamps are unix epoch in milliseconds.
 */
function toTimestamp(rpepoch) {
  return (rpepoch + 0x386D4380) * 1000;
}

/**
 * Convert a JavaScript timestamp or Date to a Ripple epoch.
 *
 * JavaScript timestamps are unix epoch in milliseconds.
 */
function fromTimestamp(rpepoch) {
  if (rpepoch instanceof Date) {
    rpepoch = rpepoch.getTime();
  }

  return Math.round(rpepoch / 1000) - 0x386D4380;
}

module.exports.sum = sum;
module.exports.bignumify = bignumify;
module.exports.normalizeNodes = normalizeNodes;
module.exports.dropsToXRP = dropsToXRP;
module.exports.max = max;
module.exports.toTimestamp = toTimestamp;
module.exports.fromTimestamp = fromTimestamp;
