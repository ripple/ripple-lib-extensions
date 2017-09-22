/* @flow */

'use strict' // eslint-disable-line strict

const _ = require('lodash')
const binary = require('ripple-binary-codec')
const OrderBookUtils = {}


/**
 * Formats an offer quality amount to a hex that can be parsed by
 * Amount.parse_quality
 *
 * @param {String} quality
 *
 * @return {String}
 */

OrderBookUtils.convertOfferQualityToHexFromText = function(
  quality: string
): string {
  return binary.encodeQuality(quality)
}

type RippledAmountIOU = {
  currency: string,
  value: string,
  issuer?: string
}

export type RippledAmount = string | RippledAmountIOU


type MetaData = {
  AffectedNodes: Array<Object>
}

const NODE_TYPES = [
  'CreatedNode',
  'ModifiedNode',
  'DeletedNode'
]


/**
 * @param {Object} node
 * @api private
 */

function getNodeType(node) {
  let result = null

  for (let i = 0; i < NODE_TYPES.length; i++) {
    const type = NODE_TYPES[i]
    if (node.hasOwnProperty(type)) {
      result = type
      break
    }
  }

  return result
}


function rippledAmountToCurrencyString(amount: RippledAmount): string {
  return typeof amount === 'string' ?
    'XRP' :
    (amount.currency + '/' +
    (amount.issuer ? amount.issuer : ''))
}

OrderBookUtils.getValueFromRippledAmount = function(
  amount: RippledAmount
): string {
  return typeof amount === 'string' ? amount : amount.value
}

OrderBookUtils.getAffectedNodes = function(
  meta: MetaData, filter: Object
): Array<Object> {
  if (!Array.isArray(meta.AffectedNodes)) {
    // throw new Error('Metadata missing AffectedNodes');
    return []
  }

  const nodes: Array<Object> = []

  meta.AffectedNodes.forEach(rawNode => {
    const result = {}
    result.nodeType = getNodeType(rawNode)
    if (result.nodeType) {
      const _node = rawNode[result.nodeType]
      result.diffType = result.nodeType
      result.entryType = _node.LedgerEntryType
      result.ledgerIndex = _node.LedgerIndex
      result.fields = _.extend({ }, _node.PreviousFields,
        _node.NewFields, _node.FinalFields)
      result.fieldsPrev = _node.PreviousFields || { }
      result.fieldsNew = _node.NewFields || { }
      result.fieldsFinal = _node.FinalFields || { }

      if (result.entryType === 'Offer') {
        const gets = rippledAmountToCurrencyString(result.fields.TakerGets)
        const pays = rippledAmountToCurrencyString(result.fields.TakerPays)

        const key = gets + ':' + pays

        result.bookKey = key
      }

      nodes.push(result)
    }

  })

  if (typeof filter === 'object') {
    return nodes.filter(function(node) {
      if (filter.nodeType && filter.nodeType !== node.nodeType) {
        return false
      }
      if (filter.entryType && filter.entryType !== node.entryType) {
        return false
      }
      if (filter.bookKey && filter.bookKey !== node.bookKey) {
        return false
      }
      return true
    })
  }

  return nodes
}


module.exports = OrderBookUtils
