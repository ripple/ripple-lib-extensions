const normalizeNodes = require('./utils').normalizeNodes;
const dropsToXRP = require('./utils').dropsToXRP;
const BigNumber = require('bignumber.js');

function summarizePaymentChannel(node) {

      const final = (node.diffType === 'CreatedNode') ? node.newFields : node.finalFields;
      const prev = node.previousFields || {};

      return {
        channelId: node.ledgerIndex,
        source: final.Account,
        destination: final.Destination,
        channel_amount_change: prev.Amount ? 
          dropsToXRP(new BigNumber(final.Amount)).minus(dropsToXRP(new BigNumber(prev.Amount || 0))) : 
          undefined,
        channel_balance_change: final.Balance ? 
          dropsToXRP(new BigNumber(final.Balance)).minus(dropsToXRP(new BigNumber(prev.Balance || 0))) : 
          undefined,
        channel_amount: 
          dropsToXRP(new BigNumber(final.Amount || 0)),
        channel_balance: 
          dropsToXRP(new BigNumber(final.Balance || 0)),
        prev_tx: node.PreviousTxnID
      };
}

function parseChannelDetails(metadata) {
  const paymentChannels = normalizeNodes(metadata)
  .filter(n => {return n.entryType === 'PayChannel'})

  return (paymentChannels.length === 1) ? 
    summarizePaymentChannel(paymentChannels[0]) : 
    undefined
}


module.exports.parseChannelDetails = parseChannelDetails;
