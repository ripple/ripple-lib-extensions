
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

module.exports.dropsToXRP = dropsToXRP;
module.exports.normalizeNodes = normalizeNodes;
