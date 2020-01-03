/* @flow */


// Routines for working with an orderbook.
//
// One OrderBook object represents one half of an order book. (i.e. bids OR
// asks) Which one depends on the ordering of the parameters.
//
// Events:
//  - model
//  - trade
//  - transaction

'use strict' // eslint-disable-line strict

const _ = require('lodash')
const assert = require('assert')
const {EventEmitter} = require('events')
const {normalizeCurrency, isValidCurrency} = require('./currencyutils')
const {AutobridgeCalculator} = require('./autobridgecalculator')
const OrderBookUtils = require('./orderbookutils')
const {isValidClassicAddress} = require('ripple-address-codec')
const {XRPValue, IOUValue} = require('ripple-lib-value')
const log = require('./log').internal.sub('orderbook')

import type {RippledAmount} from './orderbookutils'

type Value = XRPValue | IOUValue;

type CurrencySpec = {
  currency: string,
  issuer?: string
}

type CreateOrderbookOptions = {
  currency_gets: string,
  currency_pays: string,
  issuer_gets?: string,
  issuer_pays?: string,
  account?: string,
  ledger_index?: string,
  trace?: boolean
}

const DEFAULT_TRANSFER_RATE = new IOUValue('1.000000000')

const ZERO_NATIVE_AMOUNT = new XRPValue('0')

const ZERO_NORMALIZED_AMOUNT = new IOUValue('0')

/**
 * Events emitted from OrderBook
 */
const EVENTS = [
  'transaction', 'model', 'trade',
  'offer_added', 'offer_removed',
  'offer_changed', 'offer_funds_changed'
]


function prepareTrade(currency: string, issuer_?: string): string {
  const issuer = issuer_ === undefined ? '' : issuer_
  const suffix = normalizeCurrency(currency) === 'XRP' ? '' : ('/' + issuer)
  return currency + suffix
}

function parseRippledAmount(amount: RippledAmount): Value {
  return typeof amount === 'string' ?
    new XRPValue(amount) :
    new IOUValue(amount.value)
}

function _sortOffersQuick(a, b) {
  return a.qualityHex.localeCompare(b.qualityHex)
}

/**
 * account is to specify a "perspective", which affects which unfunded offers
 * are returned
 *
 * @constructor OrderBook
 * @param {RippleAPI} api
 * @param {String} account
 * @param {String} ask currency
 * @param {String} ask issuer
 * @param {String} bid currency
 * @param {String} bid issuer
 */

class OrderBook extends EventEmitter {

  _offerCounts: { [key: string]: number };
  _ownerFundsUnadjusted: { [key: string]: string };
  _ownerFunds: { [key: string]: string };
  _ownerOffersTotal: { [key: string]: Value };
  _validAccounts: { [key: string]: boolean };
  _validAccountsCount: number;
  _offers: Array<Object>;
  _mergedOffers: Array<Object>;
  _offersAutobridged: Array<Object>;
  _legOneBook: ?OrderBook;
  _legTwoBook: ?OrderBook;
  _key: string;
  _ledgerIndex: ?string;
  _api: Object;
  _currencyGets: string;
  _issuerGets: string;
  _currencyPays: string;
  _issuerPays: string;
  _account: string;

  _listeners: number;
  _transactionsLeft: number;
  _waitingForOffers: boolean;
  _subscribed: boolean;
  _synced: boolean;

  _isAutobridgeable: boolean;

  _issuerTransferRate: IOUValue;
  _transferRateIsDefault: boolean;

  _closedLedgerVersion: number;
  _lastUpdateLedgerSequence: number;
  _calculatorRunning: boolean;
  _gotOffersFromLegOne: boolean;
  _gotOffersFromLegTwo: boolean;

  _trace: boolean;

  _onReconnectBound: () => void;
  _onTransactionBound: (transaction: Object) => void;

  constructor(api: Object, currencyGets: string, issuerGets?: string,
    currencyPays: string, issuerPays?: string,
    account?: string, ledgerIndex: ?string, trace?: boolean = false
  ) {
    super()

    this._trace = trace
    if (this._trace) {
      log.info('OrderBook:constructor', currencyGets, issuerGets, currencyPays,
        issuerPays, ledgerIndex)
    }

    this._api = api
    this._account = account !== undefined ? account : ''
    this._currencyGets = normalizeCurrency(currencyGets)
    this._issuerGets = issuerGets !== undefined ? issuerGets : ''
    this._currencyPays = normalizeCurrency(currencyPays)
    this._issuerPays = issuerPays !== undefined ? issuerPays : ''
    this._key = prepareTrade(currencyGets, issuerGets) + ':' +
                prepareTrade(currencyPays, issuerPays)
    this._ledgerIndex = ledgerIndex

    // When orderbook is IOU/IOU, there will be IOU/XRP and XRP/IOU
    // books that we must keep track of to compute autobridged offers
    this._legOneBook = null
    this._legTwoBook = null

    this._listeners = 0
    this._transactionsLeft = -1
    this._waitingForOffers = false
    this._subscribed = false
    this._synced = false

    this._isAutobridgeable = this._currencyGets !== 'XRP'
      && this._currencyPays !== 'XRP'

    this._issuerTransferRate = null
    this._transferRateIsDefault = false

    this._offerCounts = {}
    this._ownerFundsUnadjusted = {}
    this._ownerFunds = {}
    this._ownerOffersTotal = {}
    this._validAccounts = {}
    this._validAccountsCount = 0
    this._offers = []

    this._closedLedgerVersion = 0
    this._lastUpdateLedgerSequence = 0
    this._calculatorRunning = false
    this._gotOffersFromLegOne = false
    this._gotOffersFromLegTwo = false

    this._onReconnectBound = this._onReconnect.bind(this)
    this._onTransactionBound = this._onTransaction.bind(this)

    if (this._isAutobridgeable) {
      this._legOneBook = new OrderBook(api, 'XRP', undefined,
        currencyPays, issuerPays, account, this._ledgerIndex, this._trace)

      this._legTwoBook = new OrderBook(api, currencyGets, issuerGets,
        'XRP', undefined, account, this._ledgerIndex, this._trace)
    }

    this._initializeSubscriptionMonitoring()
  }


  /**
   * Creates OrderBook instance using options object same as for
   * old Remote.createOrderBook method.
   *
   * @param {Object} api
   * @param {Object} api
   *
   */

  static createOrderBook(api, options: CreateOrderbookOptions): OrderBook {
    const orderbook = new OrderBook(api, options.currency_gets,
      options.issuer_gets, options.currency_pays, options.issuer_pays,
      options.account, options.ledger_index, options.trace)
    return orderbook
  }


  /**
   * Whether the OrderBook is valid
   *
   * Note: This only checks whether the parameters (currencies and issuer) are
   *       syntactically valid. It does not check anything against the ledger.
   *
   * @return {Boolean} is valid
   */

  isValid(): boolean {
    // XXX Should check for same currency (non-native) && same issuer
    return (
      Boolean(this._currencyPays) && isValidCurrency(this._currencyPays) &&
      (this._currencyPays === 'XRP' || isValidClassicAddress(this._issuerPays)) &&
      Boolean(this._currencyGets) && isValidCurrency(this._currencyGets) &&
      (this._currencyGets === 'XRP' || isValidClassicAddress(this._issuerGets)) &&
      !(this._currencyPays === 'XRP' && this._currencyGets === 'XRP')
    )
  }

  /**
   * Return latest known offers
   *
   * Usually, this will just be an empty array if the order book hasn't been
   * loaded yet. But this accessor may be convenient in some circumstances.
   *
   * @return {Array} offers
   */

  getOffersSync(): Array<Object> {
    return this._offers
  }

  requestOffers(): Promise<Array<Object>> {
    if (this._waitingForOffers) {
      return new Promise(resolve => {
        this.once('model', resolve)
      })
    }
    if (!this._api.isConnected()) {
      // do not make request if not online.
      // that requests will be queued and
      // eventually all of them will fire back
      return Promise.reject(
        new this._api.errors.RippleError('Server is offline'))
    }

    if (this._isAutobridgeable) {
      this._gotOffersFromLegOne = false
      this._gotOffersFromLegTwo = false

      if (this._legOneBook !== null && this._legOneBook !== undefined) {
        this._legOneBook.requestOffers()
      }
      if (this._legTwoBook !== null && this._legTwoBook !== undefined) {
        this._legTwoBook.requestOffers()
      }
    }

    this._waitingForOffers = true
    this._resetCache()
    return this._requestTransferRate().then(this._requestOffers.bind(this))
  }

  toJSON(): Object {
    const json: {
      taker_gets: CurrencySpec,
      taker_pays: CurrencySpec
    } = {
      taker_gets: {
        currency: this._currencyGets
      },
      taker_pays: {
        currency: this._currencyPays
      }
    }

    if (this._currencyGets !== 'XRP') {
      json.taker_gets.issuer = this._issuerGets
    }

    if (this._currencyPays !== 'XRP') {
      json.taker_pays.issuer = this._issuerPays
    }

    return json
  }


  static _getValFromRippledAmount(value_: RippledAmount): string {
    return typeof value_ === 'string' ? value_ : value_.value
  }

  /**
   * Normalize offers from book_offers and transaction stream
   *
   * @param {Object} offer
   * @return {Object} normalized
   */

  static _offerRewrite(offer: Object): Object {
    const result = {}
    const keys = Object.keys(offer)

    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      switch (key) {
        case 'PreviousTxnID':
        case 'PreviousTxnLgrSeq':
          break
        default:
          result[key] = offer[key]
      }
    }

    result.Flags = result.Flags || 0
    result.OwnerNode = result.OwnerNode || new Array(16 + 1).join('0')
    result.BookNode = result.BookNode || new Array(16 + 1).join('0')
    result.qualityHex = result.BookDirectory.slice(-16)

    return result
  }

  _initializeSubscriptionMonitoring() {
    const self = this

    function computeAutobridgedOffersWrapperOne() {
      if (!self._gotOffersFromLegOne) {
        self._gotOffersFromLegOne = true
        self._computeAutobridgedOffersWrapper()
      }
    }

    function computeAutobridgedOffersWrapperTwo() {
      if (!self._gotOffersFromLegTwo) {
        self._gotOffersFromLegTwo = true
        self._computeAutobridgedOffersWrapper()
      }
    }

    function onLedgerClosedWrapper(message: Object) {
      self._onLedgerClosed(message)
      self._pruneExpiredOffers(message)
    }

    function listenersModified(action: string, event: string) {
      // Automatically subscribe and unsubscribe to orderbook
      // on the basis of existing event listeners
      if (_.includes(EVENTS, event)) {

        switch (action) {
          case 'add':
            if (++self._listeners === 1) {

              if (self._isAutobridgeable) {
                if (self._legOneBook !== null && self._legOneBook !== undefined
                ) {
                  self._legOneBook.on('model',
                    computeAutobridgedOffersWrapperOne)
                }
                if (self._legTwoBook !== null && self._legTwoBook !== undefined
                ) {
                  self._legTwoBook.on('model',
                    computeAutobridgedOffersWrapperTwo)
                }
              }


              if (self._ledgerIndex) {
                self._getHistoricalOrderbook()
              } else {
                self._api.on('ledger', onLedgerClosedWrapper)
                self._subscribe(true)
              }
            }
            break
          case 'remove':
            if (--self._listeners === 0) {
              self._api.removeListener('ledger', onLedgerClosedWrapper)

              self._gotOffersFromLegOne = false
              self._gotOffersFromLegTwo = false

              if (self._isAutobridgeable) {
                if (self._legOneBook !== null && self._legOneBook !== undefined
                ) {
                  self._legOneBook.removeListener('model',
                    computeAutobridgedOffersWrapperOne)
                }
                if (self._legTwoBook !== null && self._legTwoBook !== undefined
                ) {
                  self._legTwoBook.removeListener('model',
                    computeAutobridgedOffersWrapperTwo)
                }
              }
              self._subscribe(false)

              self._resetCache()
            }
            break
        }
      }
    }

    this.on('newListener', event => {
      listenersModified('add', event)
    })

    this.on('removeListener', event => {
      listenersModified('remove', event)
    })
  }

  _onReconnect() {
    setTimeout(this._subscribe.bind(this, false), 1)
    setTimeout(this._subscribe.bind(this, true), 2)
  }

  _getHistoricalOrderbook() {
    this._requestTransferRate().then(this._requestOffers.bind(this))
  }

  _subscribe(subscribe: boolean) {
    const request = {
      command: subscribe ? 'subscribe' : 'unsubscribe',
      streams: ['transactions']
    }
    this._api.connection.request(request).then(() => {
      this._subscribed = subscribe
    })

    if (subscribe) {
      this._api.connection.on('connected', this._onReconnectBound)
      this._api.connection.on('transaction', this._onTransactionBound)
      this._waitingForOffers = true
      this._requestTransferRate().then(this._requestOffers.bind(this))
    } else {
      this._api.connection.removeListener('transaction',
        this._onTransactionBound)
      this._api.connection.removeListener('connected', this._onReconnectBound)
      this._resetCache()
    }
  }

  _onLedgerClosed(message: Object): void {
    this._transactionsLeft = -1
    this._closedLedgerVersion = message.ledgerVersion
    if (!message || (message && !_.isNumber(message.transactionCount)) ||
      this._waitingForOffers
    ) {
      return
    }
    this._transactionsLeft = message.transactionCount

    return
  }

  _onTransaction(transaction: Object): void {
    if (this._subscribed && !this._waitingForOffers &&
      this._transactionsLeft > 0
    ) {
      this._processTransaction(transaction)

      if (--this._transactionsLeft === 0) {
        const lastClosedLedger = this._closedLedgerVersion
        if (this._isAutobridgeable && this._legOneBook !== null &&
          this._legTwoBook !== null
        ) {
          if (!this._calculatorRunning) {
            if (
              this._legOneBook._lastUpdateLedgerSequence === lastClosedLedger ||
              this._legTwoBook._lastUpdateLedgerSequence === lastClosedLedger
            ) {
              this._computeAutobridgedOffersWrapper()
            } else if (this._lastUpdateLedgerSequence === lastClosedLedger) {
              this._mergeDirectAndAutobridgedBooks()
            }
          }
        } else if (this._lastUpdateLedgerSequence === lastClosedLedger) {
          this._emitAsync(['model', this._offers])
        }
      }
    }
  }

  _processTransaction(transaction: Object): void {
    if (this._trace) {
      log.info('_processTransaction', this._key, transaction.transaction.hash)
    }

    const metadata = transaction.meta || transaction.metadata
    if (!metadata) {
      return
    }

    const affectedNodes = OrderBookUtils.getAffectedNodes(metadata, {
      entryType: 'Offer',
      bookKey: this._key
    })

    if (this._trace) {
      log.info('_processTransaction:affectedNodes.length: ' +
        String(affectedNodes.length))
    }
    if (affectedNodes.length > 0) {

      const state = {
        takerGetsTotal: this._currencyGets === 'XRP' ?
          new XRPValue('0') : new IOUValue('0'),
        takerPaysTotal: this._currencyPays === 'XRP' ?
          new XRPValue('0') : new IOUValue('0'),
        transactionOwnerFunds: transaction.transaction.owner_funds
      }

      const isOfferCancel =
        transaction.transaction.TransactionType === 'OfferCancel'

      affectedNodes.forEach(
        this._processTransactionNode.bind(this, isOfferCancel, state))

      this.emit('transaction', transaction.transaction)
      this._lastUpdateLedgerSequence = this._closedLedgerVersion

      if (!state.takerGetsTotal.isZero()) {
        this.emit('trade', state.takerPaysTotal, state.takerGetsTotal)
      }
    }

    this._updateFundedAmounts(transaction)
  }

  _processTransactionNode(isOfferCancel: boolean, state: Object, node: Object) {
    if (this._trace) {
      log.info('_processTransactionNode', isOfferCancel, node)
    }
    switch (node.nodeType) {
      case 'DeletedNode': {
        this._validateAccount(node.fields.Account)
        this._deleteOffer(node, isOfferCancel)

        // We don't want to count an OfferCancel as a trade
        if (!isOfferCancel) {
          state.takerGetsTotal = state.takerGetsTotal
            .add(parseRippledAmount(node.fieldsFinal.TakerGets))
          state.takerPaysTotal = state.takerPaysTotal
            .add(parseRippledAmount(node.fieldsFinal.TakerPays))
        }
        break
      }
      case 'ModifiedNode': {
        this._validateAccount(node.fields.Account)
        this._modifyOffer(node)

        state.takerGetsTotal = state.takerGetsTotal
          .add(parseRippledAmount(node.fieldsPrev.TakerGets))
          .subtract(parseRippledAmount(node.fieldsFinal.TakerGets))

        state.takerPaysTotal = state.takerPaysTotal
          .add(parseRippledAmount(node.fieldsPrev.TakerPays))
          .subtract(parseRippledAmount(node.fieldsFinal.TakerPays))
        break
      }
      case 'CreatedNode': {
        this._validateAccount(node.fields.Account)
        // rippled does not set owner_funds if the order maker is the issuer
        // because the value would be infinite
        const fundedAmount = state.transactionOwnerFunds !== undefined ?
          state.transactionOwnerFunds : 'Infinity'
        this._setOwnerFunds(node.fields.Account, fundedAmount)
        this._insertOffer(node)
        break
      }
    }
  }

  /**
   * Updates funded amounts/balances using modified balance nodes
   *
   * Update owner funds using modified AccountRoot and RippleState nodes
   * Update funded amounts for offers in the orderbook using owner funds
   *
   * @param {Object} transaction - transaction that holds meta nodes
   */

  _updateFundedAmounts(transaction: Object) {

    const metadata = transaction.meta || transaction.metadata
    if (!metadata) {
      return
    }

    if (this._currencyGets !== 'XRP' && !this._issuerTransferRate) {
      if (this._trace) {
        log.info('waiting for transfer rate')
      }

      this._requestTransferRate().then(() => {
        // Defer until transfer rate is requested
        this._updateFundedAmounts(transaction)
      }, err => {
        log.error(
          'Failed to request transfer rate, will not update funded amounts: '
          + err.toString())
      })
      return
    }

    const affectedNodes = OrderBookUtils.getAffectedNodes(metadata, {
      nodeType: 'ModifiedNode',
      entryType: this._currencyGets === 'XRP' ? 'AccountRoot' : 'RippleState'
    })

    if (this._trace) {
      log.info('_updateFundedAmounts:affectedNodes.length: ' +
        String(affectedNodes.length))
    }

    affectedNodes.forEach(node => {
      if (this._isBalanceChangeNode(node)) {
        const result = this._parseAccountBalanceFromNode(node)

        if (this._hasOwnerFunds(result.account)) {
          // We are only updating owner funds that are already cached
          this._setOwnerFunds(result.account, result.balance)

          this._updateOwnerOffersFundedAmount(result.account)
        }
      }
    })
  }

  /**
   * Get account and final balance of a meta node
   *
   * @param {Object} node - RippleState or AccountRoot meta node
   * @return {Object}
   */

  _parseAccountBalanceFromNode(node: Object): {
    account: string,
    balance: string
  } {
    const result = {
      account: '',
      balance: ''
    }

    switch (node.entryType) {
      case 'AccountRoot':
        result.account = node.fields.Account
        result.balance = node.fieldsFinal.Balance
        break

      case 'RippleState':
        if (node.fields.HighLimit.issuer === this._issuerGets) {
          result.account = node.fields.LowLimit.issuer
          result.balance = node.fieldsFinal.Balance.value
        } else if (node.fields.LowLimit.issuer === this._issuerGets) {
          result.account = node.fields.HighLimit.issuer

          // Negate balance on the trust line
          result.balance = parseRippledAmount(node.fieldsFinal.Balance)
            .negate().toFixed()
        }
        break
    }

    assert(!isNaN(String(result.balance)), 'node has an invalid balance')
    this._validateAccount(result.account)

    return result
  }


  /**
   * Check that affected meta node represents a balance change
   *
   * @param {Object} node - RippleState or AccountRoot meta node
   * @return {Boolean}
   */

  _isBalanceChangeNode(node: Object): boolean {
    // Check meta node has balance, previous balance, and final balance
    if (!(node.fields && node.fields.Balance
    && node.fieldsPrev && node.fieldsFinal
    && node.fieldsPrev.Balance && node.fieldsFinal.Balance)) {
      return false
    }

    // Check if taker gets currency is native and balance is not a number
    if (this._currencyGets === 'XRP') {
      return !isNaN(node.fields.Balance)
    }

    // Check if balance change is not for taker gets currency
    if (node.fields.Balance.currency !== this._currencyGets) {
      return false
    }

    // Check if trustline does not refer to the taker gets currency issuer
    if (!(node.fields.HighLimit.issuer === this._issuerGets
       || node.fields.LowLimit.issuer === this._issuerGets)) {
      return false
    }

    return true
  }


  /**
   * Modify an existing offer in the orderbook
   *
   * @param {Object} node - Offer node
   */

  _modifyOffer(node: Object): void {
    if (this._trace) {
      log.info('modifying offer', this._key, node.fields)
    }

    for (let i = 0; i < this._offers.length; i++) {
      const offer = this._offers[i]

      if (offer.index === node.ledgerIndex) {
        // TODO: This assumes no fields are deleted, which is
        // probably a safe assumption, but should be checked.
        _.extend(offer, node.fieldsFinal)

        break
      }
    }

    this._updateOwnerOffersFundedAmount(node.fields.Account)
  }


  /**
   * Delete an existing offer in the orderbook
   *
   * NOTE: We only update funded amounts when the node comes from an OfferCancel
   *       transaction because when offers are deleted, it frees up funds to
   *       fund other existing offers in the book
   *
   * @param {Object} node - Offer node
   * @param {Boolean} isOfferCancel - whether node came from an OfferCancel
   */

  _deleteOffer(node: Object, isOfferCancel: boolean): void {
    if (this._trace) {
      log.info('deleting offer', this._key, node.fields)
    }

    for (let i = 0; i < this._offers.length; i++) {
      const offer = this._offers[i]

      if (offer.index === node.ledgerIndex) {
        // Remove offer amount from sum for account
        this._subtractOwnerOfferTotal(offer.Account, offer.TakerGets)

        this._offers.splice(i, 1)
        this._decrementOwnerOfferCount(offer.Account)

        this.emit('offer_removed', offer)

        break
      }
    }

    if (isOfferCancel) {
      this._updateOwnerOffersFundedAmount(node.fields.Account)
    }
  }

  /**
   * Subtract amount sum being offered for owner
   *
   * @param {String} account - owner's account address
   * @param {Object|String} amount - offer amount as native string or IOU
   *                                 currency format
   * @return {Amount}
   */

  _subtractOwnerOfferTotal(account: string, amount: RippledAmount): Value {
    const previousAmount = this._getOwnerOfferTotal(account)
    const newAmount = previousAmount.subtract(parseRippledAmount(amount))

    this._ownerOffersTotal[account] = newAmount

    assert(!newAmount.isNegative(), 'Offer total cannot be negative')
    return newAmount
  }


  /**
   * Insert an offer into the orderbook
   *
   * NOTE: We *MUST* update offers' funded amounts when a new offer is placed
   *       because funds go to the highest quality offers first.
   *
   * @param {Object} node - Offer node
   */

  _insertOffer(node: Object): void {
    if (this._trace) {
      log.info('inserting offer', this._key, node.fields)
    }

    const originalLength = this._offers.length
    const offer = OrderBook._offerRewrite(node.fields)
    const takerGets = new IOUValue(offer.TakerGets.value || offer.TakerGets)
    const takerPays = new IOUValue(offer.TakerPays.value || offer.TakerPays)

     // We're safe to calculate quality for newly created offers
    offer.quality = takerPays.divide(takerGets).toFixed()
    offer.LedgerEntryType = node.entryType
    offer.index = node.ledgerIndex

    for (let i = 0; i < originalLength; i++) {
      if (offer.qualityHex <= this._offers[i].qualityHex) {
        this._offers.splice(i, 0, offer)
        break
      }
    }

    if (this._offers.length === originalLength) {
      this._offers.push(offer)
    }

    this._incrementOwnerOfferCount(offer.Account)

    this._updateOwnerOffersFundedAmount(offer.Account)

    this.emit('offer_added', offer)
  }

  _pruneExpiredOffers(ledger: Object): void {
    const offersLength = this._offers.length

    this._offers = this._offers.filter(offer => {
      if (offer.Expiration <= ledger.ledger_time) {
        this._subtractOwnerOfferTotal(offer.Account, offer.TakerGets)
        this._decrementOwnerOfferCount(offer.Account)
        this._updateOwnerOffersFundedAmount(offer.Account)
        this.emit('offer_removed', offer)

        return false
      }

      return true
    })

    if (this._offers.length < offersLength) {
      this.emit('model', this._offers)
    }
  }

  /**
   * Decrement offer count for owner
   * When an account has no more orders, we also stop tracking their account
   * funds
   *
   * @param {String} account - owner's account address
   * @return {Number}
   */

  _decrementOwnerOfferCount(account: string): number {
    const result = (this._offerCounts[account] || 1) - 1
    this._offerCounts[account] = result

    if (result < 1) {
      this._deleteOwnerFunds(account)
    }

    return result
  }

  /**
   * Remove cached owner's funds
   *
   * @param {String} account - owner's account address
   */

  _deleteOwnerFunds(account: string): void {
    delete this._ownerFunds[account]
  }


  /**
   * Update offers' funded amount with their owner's funds
   *
   * @param {String} account - owner's account address
   */

  _updateOwnerOffersFundedAmount(account: string): void {
    if (!this._hasOwnerFunds(account)) {
      // We are only updating owner funds that are already cached
      return
    }

    if (this._trace) {
      const ownerFunds = this._getOwnerFunds(account)
      log.info('updating offer funds', this._key, account,
               ownerFunds ? ownerFunds.toString() : 'undefined')
    }

    this._resetOwnerOfferTotal(account)

    this._offers.forEach(offer => {
      if (offer.Account !== account) {
        return
      }

      // Save a copy of the old offer so we can show how the offer has changed
      const previousOffer = _.extend({}, offer)
      let previousFundedGets = null

      if (_.isString(offer.taker_gets_funded)) {
        // Offer is not new, so we should consider it for offer_changed and
        // offer_funds_changed events
        // previousFundedGets = OrderBookUtils.getOfferTakerGetsFunded(offer);
        previousFundedGets = this._getOfferTakerGetsFunded(offer)
      }

      this._setOfferFundedAmount(offer)
      this._addOwnerOfferTotal(offer.Account, offer.TakerGets)

      const takerGetsFunded = this._getOfferTakerGetsFunded(offer)
      const areFundsChanged = previousFundedGets !== null
        && !takerGetsFunded.equals(previousFundedGets)

      if (areFundsChanged) {
        this.emit('offer_changed', previousOffer, offer)
        this.emit('offer_funds_changed',
          offer,
          previousOffer.taker_gets_funded,
          offer.taker_gets_funded
        )
      }
    })
  }

  _getOfferTakerGetsFunded(offer: Object): Value {
    return this._currencyGets === 'XRP' ?
      new XRPValue(offer.taker_gets_funded) :
      new IOUValue(offer.taker_gets_funded)
  }


  /**
   * Reset offers amount sum for owner to 0
   *
   * @param {String} account - owner's account address
   * @return {Amount}
   */

  _resetOwnerOfferTotal(account: string): void {
    if (this._currencyGets === 'XRP') {
      this._ownerOffersTotal[account] = ZERO_NATIVE_AMOUNT
    } else {
      this._ownerOffersTotal[account] = ZERO_NORMALIZED_AMOUNT
    }
  }

  _validateAccount(account: string): void {
    if (this._validAccounts[account] === undefined) {
      assert(isValidClassicAddress(account), 'node has an invalid account')
      this._validAccounts[account] = true
      this._validAccountsCount++
    }
  }

  /**
   * Request transfer rate for this orderbook's issuer
   *
   * @param {Function} callback
   */

  _requestTransferRate(): Promise<Value> {

    if (this._currencyGets === 'XRP') {
      // Transfer rate is default for the native currency
      this._issuerTransferRate = DEFAULT_TRANSFER_RATE
      this._transferRateIsDefault = true

      return Promise.resolve(this._issuerTransferRate)
    }

    if (this._issuerTransferRate) {
      // Transfer rate has already been cached
      return Promise.resolve(this._issuerTransferRate)
    }

    return this._api.getSettings(this._issuerGets, {}).then(settings => {
      // When transfer rate is not explicitly set on account, it implies the
      // default transfer rate
      this._transferRateIsDefault = !settings.transferRate
      this._issuerTransferRate =
        settings.transferRate ?
          new IOUValue(settings.transferRate) : DEFAULT_TRANSFER_RATE
      return this._issuerTransferRate
    })

  }


  /**
   * Request orderbook entries from server
   *
   * @param {Function} callback
   */

  _requestOffers(): Promise<Array<Object>> {
    if (!this._api.isConnected()) {
      // do not make request if not online.
      // that requests will be queued and
      // eventually all of them will fire back
      return Promise.reject(
        new this._api.errors.RippleError('Server is offline'))
    }

    if (this._trace) {
      log.info('requesting offers', this._key)
    }

    const requestMessage = _.extend({
      command: 'book_offers',
      taker: this._account ? this._account : 'rrrrrrrrrrrrrrrrrrrrBZbvji',
      ledger_index: this._ledgerIndex || 'validated'
    }, this.toJSON())

    return this._api.connection.request(requestMessage).then(response => {
      this._lastUpdateLedgerSequence = response.ledger_index
      if (!Array.isArray(response.offers)) {
        this._emitAsync(['model', []])
        throw new this._api.errors.RippleError('Invalid response')
      }

      if (this._ledgerIndex) {
        assert(response.ledger_index === this._ledgerIndex)
      }

      if (this._trace) {
        log.info('requested offers', this._key,
          'offers: ' + response.offers.length)
      }


      this._setOffers(response.offers)

      if (!this._isAutobridgeable) {
        this._waitingForOffers = false
        this._emitAsync(['model', this._offers])
        return this._offers
      }

      this._computeAutobridgedOffersWrapper()

      return new Promise(resolve => {
        this.once('model', offers => {
          this._waitingForOffers = false
          resolve(offers)
        })
      })

    })
  }


  /**
   * Reset internal offers cache from book_offers request
   *
   * @param {Array} offers
   * @api private
   */

  _setOffers(offers: Array<Object>): void {
    assert(Array.isArray(offers), 'Offers is not an array')

    this._resetCache()

    let i = -1
    let offer
    const length = offers.length

    while (++i < length) {
      offer = OrderBook._offerRewrite(offers[i])

      this._validateAccount(offer.Account)
      if (offer.owner_funds !== undefined) {
        // The first offer of each owner from book_offers contains owner balance
        // of offer's output
        this._setOwnerFunds(offer.Account, offer.owner_funds)
      }

      this._incrementOwnerOfferCount(offer.Account)

      this._setOfferFundedAmount(offer)
      this._addOwnerOfferTotal(offer.Account, offer.TakerGets)
      offers[i] = offer
    }

    this._offers = offers
    this._synced = true
  }

  /**
   * Check whether owner's funds have been cached
   *
   * @param {String} account - owner's account address
   */

  _hasOwnerFunds(account?: string): boolean {
    if (account === undefined) {
      return false
    }
    return this._ownerFunds[account] !== undefined
  }

  /**
   * Set owner's, transfer rate adjusted, funds in cache
   *
   * @param {String} account - owner's account address
   * @param {String} fundedAmount
   */

  _setOwnerFunds(account: string, fundedAmount: string): void {
    assert(!isNaN(Number(fundedAmount)), 'Funded amount is invalid')

    this._ownerFundsUnadjusted[account] = fundedAmount
    this._ownerFunds[account] = this._applyTransferRate(fundedAmount)
  }

  /**
   * Compute adjusted balance that would be left after issuer's transfer fee is
   * deducted
   *
   * @param {String} balance
   * @return {String}
   */

  _applyTransferRate(balance: string): string {
    assert(!isNaN(Number(balance)), 'Balance is invalid')

    if (this._transferRateIsDefault) {
      return balance
    }

    const adjustedBalance = new IOUValue(balance)
      .divide(this._issuerTransferRate)
      .toFixed()

    return adjustedBalance
  }

    /**
   * Increment offer count for owner
   *
   * @param {String} account - owner's account address
   * @return {Number}
   */

  _incrementOwnerOfferCount(account: string): number {
    const result = (this._offerCounts[account] || 0) + 1
    this._offerCounts[account] = result
    return result
  }

  /**
   * Set funded amount on offer with its owner's cached funds
   *
   * is_fully_funded indicates if these funds are sufficient for the offer
   * placed.
   * taker_gets_funded indicates the amount this account can afford to offer.
   * taker_pays_funded indicates adjusted TakerPays for partially funded offer.
   *
   * @param {Object} offer
   * @return offer
   */

  _setOfferFundedAmount(offer: Object): Object {
    assert.strictEqual(typeof offer, 'object', 'Offer is invalid')

    const takerGets = parseRippledAmount(offer.TakerGets)
    const fundedAmount = this._getOwnerFunds(offer.Account)
    const previousOfferSum = this._getOwnerOfferTotal(offer.Account)
    const currentOfferSum = previousOfferSum.add(takerGets)

    offer.owner_funds = this._getUnadjustedOwnerFunds(offer.Account)

    assert(fundedAmount.constructor === currentOfferSum.constructor)
    offer.is_fully_funded = fundedAmount.comparedTo(currentOfferSum) >= 0

    if (offer.is_fully_funded) {
      offer.taker_gets_funded = takerGets.toString()
      offer.taker_pays_funded =
        OrderBook._getValFromRippledAmount(offer.TakerPays)
    } else if (previousOfferSum.comparedTo(fundedAmount) < 0) {
      offer.taker_gets_funded =
        fundedAmount.subtract(previousOfferSum).toString()

      const quality = new IOUValue(offer.quality)
      const takerPaysFunded = quality.multiply(
        new IOUValue(offer.taker_gets_funded))

      offer.taker_pays_funded = (this._currencyPays === 'XRP')
        ? String(Math.floor(Number(takerPaysFunded.toString())))
        : takerPaysFunded.toString()
    } else {
      offer.taker_gets_funded = '0'
      offer.taker_pays_funded = '0'
    }

    return offer
  }

  /**
   * Add amount sum being offered for owner
   *
   * @param {String} account - owner's account address
   * @param {Object|String} amount - offer amount as native string or IOU
   *                                 currency format
   * @return {Amount}
   */

  _addOwnerOfferTotal(account: string, amount: RippledAmount): Value {
    const previousAmount = this._getOwnerOfferTotal(account)
    const currentAmount = previousAmount.add(this._makeGetsValue(amount))

    this._ownerOffersTotal[account] = currentAmount

    return currentAmount
  }

    /**
   * Get offers amount sum for owner
   *
   * @param {String} account - owner's account address
   * @return {Value}
   */

  _getOwnerOfferTotal(account: string): Value {
    const amount = this._ownerOffersTotal[account]
    if (amount) {
      return amount
    }
    return this._currencyGets === 'XRP' ?
      ZERO_NATIVE_AMOUNT :
      ZERO_NORMALIZED_AMOUNT
  }


  _makeGetsValue(value_: RippledAmount): Value {
    const value = OrderBook._getValFromRippledAmount(value_)
    return this._currencyGets === 'XRP' ?
      new XRPValue(value) :
      new IOUValue(value)
  }

  /**
   * Get owner's cached unadjusted funds
   *
   * @param {String} account - owner's account address
   * @return {String}
   */

  _getUnadjustedOwnerFunds(account: string): string {
    return this._ownerFundsUnadjusted[account]
  }


  /**
   * Get owner's cached, transfer rate adjusted, funds
   *
   * @param {String} account - owner's account address
   * @return {Value}
   */

  _getOwnerFunds(account: string): Value {
    if (this._hasOwnerFunds(account)) {
      return this._makeGetsValue(this._ownerFunds[account])
    }
    if (this._trace) {
      log.info('No owner funds for ' + account, this._key)
    }
    throw new this._api.errors.RippleError('No owner funds')
  }


  /**
   * Reset cached owner's funds, offer counts, and offer sums
   */

  _resetCache(): void {
    this._ownerFundsUnadjusted = {}
    this._ownerFunds = {}
    this._ownerOffersTotal = {}
    this._offerCounts = {}
    this._offers = []
    this._synced = false

    if (this._validAccountsCount > 3000) {
      this._validAccounts = {}
      this._validAccountsCount = 0
    }
  }

  _emitAsync(args: Array<any>): void {
    setTimeout(() => this.emit(...args), 0)
  }

  /**
   * Compute autobridged offers for an IOU:IOU orderbook by merging offers from
   * IOU:XRP and XRP:IOU books
   */

  _computeAutobridgedOffers(): Promise<void> {
    assert(this._currencyGets !== 'XRP' && this._currencyPays !== 'XRP',
      'Autobridging is only for IOU:IOU orderbooks')

    if (this._trace) {
      log.info('_computeAutobridgedOffers autobridgeCalculator.calculate',
        this._key)
    }

    // this check is only for flow
    const legOneOffers =
      (this._legOneBook !== null && this._legOneBook !== undefined) ?
        this._legOneBook.getOffersSync() : []
    const legTwoOffers =
      (this._legTwoBook !== null && this._legTwoBook !== undefined) ?
        this._legTwoBook.getOffersSync() : []

    const autobridgeCalculator = new AutobridgeCalculator(
      this._currencyGets,
      this._currencyPays,
      legOneOffers,
      legTwoOffers,
      this._issuerGets,
      this._issuerPays
    )

    return autobridgeCalculator.calculate().then(autobridgedOffers => {
      this._offersAutobridged = autobridgedOffers
    })
  }

  _computeAutobridgedOffersWrapper(): void {
    if (this._trace) {
      log.info('_computeAutobridgedOffersWrapper', this._key, this._synced,
        this._calculatorRunning)
    }
    if (!this._gotOffersFromLegOne || !this._gotOffersFromLegTwo ||
        !this._synced || this._calculatorRunning
    ) {
      return
    }

    this._calculatorRunning = true
    this._computeAutobridgedOffers().then(() => {
      this._mergeDirectAndAutobridgedBooks()
      this._calculatorRunning = false
    })
  }

  /**
   * Merge direct and autobridged offers into a combined orderbook
   *
   * @return
   */

  _mergeDirectAndAutobridgedBooks(): void {
    if (_.isEmpty(this._offers) && _.isEmpty(this._offersAutobridged)) {
      if (this._synced && this._gotOffersFromLegOne &&
        this._gotOffersFromLegTwo) {
        // emit empty model to indicate to listeners that we've got offers,
        // just there was no one
        this._emitAsync(['model', []])
      }
      return
    }

    this._mergedOffers = this._offers
      .concat(this._offersAutobridged)
      .sort(_sortOffersQuick)

    this._emitAsync(['model', this._mergedOffers])
  }

}

exports.OrderBook = OrderBook
