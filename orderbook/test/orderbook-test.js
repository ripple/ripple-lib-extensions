/* eslint-disable max-len, indent, no-unused-vars */

'use strict' // eslint-disable-line strict

const assert = require('assert-diff')
const addresses = require('./fixtures/addresses')
const fixtures = require('./fixtures/orderbook')
const {XRPValue, IOUValue} = require('ripple-lib-value')
const RippleAPI = require('ripple-lib').RippleAPI
const OrderBook = require('../src/orderbook').OrderBook
const OrderBookUtils = require('../src/orderbookutils')
const EventEmitter = require('events').EventEmitter

describe('OrderBook', function() {

  function createOrderBook(options) {
    const api = new RippleAPI()
    const orderbook = OrderBook.createOrderBook(api, options)
    return orderbook
  }


  it('toJSON', function() {
    let book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    assert.deepEqual(book.toJSON(), {
      taker_gets: {
        currency: 'XRP'
      },
      taker_pays: {
        currency: 'BTC',
        issuer: addresses.ISSUER
      }
    })

    book = createOrderBook({
      issuer_gets: addresses.ISSUER,
      currency_gets: 'BTC',
      currency_pays: 'XRP'
    })

    assert.deepEqual(book.toJSON(), {
      taker_gets: {
        currency: 'BTC',
        issuer: addresses.ISSUER
      },
      taker_pays: {
        currency: 'XRP'
      }
    })
  })

  it('Check orderbook validity', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    assert(book.isValid())
  })


  it('Automatic subscription (based on listeners)', function(done) {
    this.timeout(100)

    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      const response = {}

      if (message.command === 'account_info') {
        response.account_data = {
          TransferRate: 1002000000
        }

      } else if (message.command === 'book_offers') {
        response.offers = []
      }
      return Promise.resolve(response)
    }

    book.on('model', function(offers) {
      assert.strictEqual(offers.length, 0)
      done()
    })
  })

  it('Automatic subscription (based on listeners) - autobridged', function(done) {
    this.timeout(200)

    const book = createOrderBook({
      currency_pays: 'USD',
      issuer_pays: addresses.ISSUER,
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER
    })

    let subscribed = false

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      const response = {}

      if (message.command === 'account_info') {
        response.account_data = {
          TransferRate: 1002000000
        }
      } else if (message.command === 'subscribe') {
        if (message.streams && message.streams[0] === 'transactions') {
          subscribed = true
        }
      } else if (message.command === 'book_offers') {
        response.offers = []
        response.ledger_index = 32571
      }

      return Promise.resolve(response)
    }

    book.on('model', function(offers) {
      assert(subscribed)
      assert.strictEqual(offers.length, 0)
      done()
    })

  })

  it('Automatic unsubscription - remove all listeners', function(done) {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._subscribe = function(subscribe) {
      if (!subscribe) {
        done()
      }
    }

    book.on('model', function() {})
    book.removeAllListeners('model')
  })

  it('Automatic unsubscription - once listener', function(done) {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._subscribe = function(subscribe) {
      if (!subscribe) {
        done()
      }
    }

    book.once('model', function() {})
    book.emit('model', {})
  })

  it('Automatic unsubscription - check unsubscribed', function(done) {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    book._api.isConnected = function() {
      return true
    }

    console.log('---- ', EventEmitter.listenerCount(book._api.connection, 'transaction'))
    console.log('---- ', EventEmitter.listenerCount(book._api.connection, 'connected'))
    assert.strictEqual(EventEmitter.listenerCount(book._api.connection, 'transaction'), 0)
    assert.strictEqual(EventEmitter.listenerCount(book._api.connection, 'connected'), 0)

    function noop() {}
    book.on('model', noop)
    setTimeout(() => {
      console.log('2 ---- ', EventEmitter.listenerCount(book._api.connection, 'transaction'))
      console.log('2 ---- ', EventEmitter.listenerCount(book._api.connection, 'connected'))
      assert.strictEqual(EventEmitter.listenerCount(book._api.connection, 'transaction'), 1)
      assert.strictEqual(EventEmitter.listenerCount(book._api.connection, 'connected'), 1)
      book.removeListener('model', noop)
      setTimeout(() => {
        console.log('3 ---- ', EventEmitter.listenerCount(book._api.connection, 'transaction'))
        console.log('3 ---- ', EventEmitter.listenerCount(book._api.connection, 'connected'))
        assert.strictEqual(EventEmitter.listenerCount(book._api.connection, 'transaction'), 0)
        assert.strictEqual(EventEmitter.listenerCount(book._api.connection, 'connected'), 0)
        done()
      }, 2)
    }, 1)
  })

  it('Subscribe to transactions on reconnect', function(done) {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    let subscribeRequests = 0
    let unSubscribeRequests = 0

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      const response = {}

      if (message.command === 'account_info') {
        response.account_data = {
          TransferRate: 1002000000
        }
      } else if (message.command === 'unsubscribe') {
        unSubscribeRequests++
      } else if (message.command === 'subscribe') {
        subscribeRequests++
      } else if (message.command === 'book_offers') {
        response.offers = []
      }
      return Promise.resolve(response)
    }

    let models = 0
    book.on('model', function(offers) {
      assert.strictEqual(offers.length, 0)
      if (models++ === 1) {
        assert.strictEqual(subscribeRequests, 2)
        assert.strictEqual(unSubscribeRequests, 1)
        done()
      }
    })
    book._api.connection.emit('connected')
  })

  it('Set owner funds', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')
    book._setOwnerFunds(addresses.ACCOUNT, '1')

    assert.strictEqual(book._getOwnerFunds(addresses.ACCOUNT).toString(), '1')
  })

  it('Set owner funds - unadjusted funds', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')
    book._setOwnerFunds(addresses.ACCOUNT, '1')

    assert.strictEqual(book._ownerFundsUnadjusted[addresses.ACCOUNT], '1')
  })

  it('Set owner funds - invalid account', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    assert.throws(function() {
      book._setOwnerFunds('0rrrrrrrrrrrrrrrrrrrrBZbvji', '1')
    })
  })

  it('Set owner funds - invalid amount', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    assert.throws(function() {
      book._setOwnerFunds(addresses.ACCOUNT, null)
    })
  })

  it('Has owner funds', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._ownerFunds[addresses.ACCOUNT] = '1'
    assert(book._hasOwnerFunds(addresses.ACCOUNT))
  })

  it('Delete owner funds', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._ownerFunds[addresses.ACCOUNT] = '1'
    assert(book._hasOwnerFunds(addresses.ACCOUNT))

    book._deleteOwnerFunds(addresses.ACCOUNT)
    assert(!book._hasOwnerFunds(addresses.ACCOUNT))
  })

  it('Increment owner offer count', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    assert.strictEqual(book._incrementOwnerOfferCount(addresses.ACCOUNT), 1)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 1)
  })

  it('Decrement owner offer count', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._incrementOwnerOfferCount(addresses.ACCOUNT)

    assert.strictEqual(book._decrementOwnerOfferCount(addresses.ACCOUNT), 0)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 0)
  })

  it('Decrement owner offer count - no more offers', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._incrementOwnerOfferCount(addresses.ACCOUNT)

    assert.strictEqual(book._decrementOwnerOfferCount(addresses.ACCOUNT), 0)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 0)
    assert.throws(function() {
      book._getOwnerFunds(addresses.ACCOUNT)
    })
  })

  it('Subtract owner offer total', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._ownerOffersTotal[addresses.ACCOUNT] = new IOUValue('3')

    const newAmount = book._subtractOwnerOfferTotal(addresses.ACCOUNT, {
      value: 2,
      currency: 'BTC',
      issuer: addresses.ISSUER
    })

    const offerTotal = new IOUValue('1')

    assert(newAmount.equals(offerTotal))
  })

  it('Subtract owner offer total - negative total', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    assert.throws(function() {
      book._subtractOwnerOfferTotal(addresses.ACCOUNT, new IOUValue('2'))
    })
  })

  it('Get owner offer total', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })
    book._ownerOffersTotal[addresses.ACCOUNT] = new IOUValue('3')

    assert.strictEqual(
      book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '3')
  })

  it('Get owner offer total - native', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._ownerOffersTotal[addresses.ACCOUNT] = new IOUValue('3')

    assert.strictEqual(
      book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '3')
  })

  it('Get owner offer total - no total', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    assert.strictEqual(
      book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '0')
  })

  it('Get owner offer total - native - no total', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    assert(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '0')
  })

  it('Apply transfer rate - cached transfer rate', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    assert.strictEqual(book._applyTransferRate('1'), '0.9980039920159681')
  })

  it('Apply transfer rate - native currency', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    assert.strictEqual(book._applyTransferRate('0.9980039920159681'),
                       '0.9980039920159681')
  })

  it('Apply transfer rate - invalid balance', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    assert.throws(function() {
      book._applyTransferRate('asdf')
    })
  })

  it('Apply transfer rate - invalid transfer rate', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    assert.throws(function() {
      book._applyTransferRate('1')
    })
  })

  it('Request transfer rate', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._api.connection.request = function(request) {
      assert.deepEqual(request, {
        command: 'account_info',
        ledger_index: 'validated',
        account: addresses.ISSUER
      })
      return Promise.resolve({
        account_data: {
          TransferRate: 1002000000
        }
      })
    }

    return book._requestTransferRate().then(rate => {
      assert(rate.equals(new IOUValue('1.002000000')))
    })
  })

  it('Request transfer rate - not set', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._api.connection.request = function(request) {
      assert.deepEqual(request, {
        command: 'account_info',
        ledger_index: 'validated',
        account: addresses.ISSUER
      })

      return Promise.resolve({
        account_data: {
        }
      })
    }

    return book._requestTransferRate().then(rate => {
      assert(rate.equals(new IOUValue('1.000000000')))
    })
  })

  it('Request transfer rate - cached transfer rate', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    book._api.connection.request = function() {
      assert(false, 'Must not be called')
    }

    return book._requestTransferRate().then(rate => {
      assert(rate.equals(new IOUValue('1.002000000')))
    })
  })

  it('Request transfer rate - native currency', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._api.connection.request = function() {
      assert(false, 'Must not be called')
    }

    return book._requestTransferRate().then(rate => {
      assert(rate.equals(new IOUValue('1.000000000')))
      assert(book._issuerTransferRate.equals(new IOUValue('1.000000000')))
    })
  })

  it('Set offer funded amount - iou/xrp - fully funded', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      currency_pays: 'XRP',
      issuer_gets: addresses.ISSUER
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    const offer = {
      Account: addresses.ACCOUNT,
      TakerGets: {
        value: '100',
        currency: 'BTC',
        issuer: addresses.ISSUER
      },
      TakerPays: '123456'
    }

    book._setOwnerFunds(addresses.ACCOUNT, '100.1234')
    book._setOfferFundedAmount(offer)

    const expected = {
      Account: addresses.ACCOUNT,
      TakerGets: offer.TakerGets,
      TakerPays: offer.TakerPays,
      is_fully_funded: true,
      taker_gets_funded: '100',
      taker_pays_funded: '123456',
      owner_funds: '100.1234'
    }

    assert.deepEqual(offer, expected)
  })

  it('Set offer funded amount - iou/xrp - unfunded', function() {
    const book = createOrderBook({
      currency_gets: 'BTC',
      currency_pays: 'XRP',
      issuer_gets: addresses.ISSUER
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    const offer = {
      Account: addresses.ACCOUNT,
      TakerGets: {
        value: '100',
        currency: 'BTC',
        issuer: addresses.ISSUER
      },
      TakerPays: '123456',
      quality: '1234.56'
    }

    book._setOwnerFunds(addresses.ACCOUNT, '99')
    book._setOfferFundedAmount(offer)

    const expected = {
      Account: addresses.ACCOUNT,
      TakerGets: offer.TakerGets,
      TakerPays: offer.TakerPays,
      is_fully_funded: false,
      taker_gets_funded: '99',
      taker_pays_funded: '122221',
      owner_funds: '99',
      quality: '1234.56'
    }

    assert.deepEqual(offer, expected)
  })

  it('Set offer funded amount - xrp/iou - funded', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    const offer = {
      Account: addresses.ACCOUNT,
      TakerGets: '100',
      TakerPays: {
        value: '123.456',
        currency: 'BTC',
        issuer: addresses.ISSUER
      }
    }

    book._setOwnerFunds(addresses.ACCOUNT, '100100000')
    book._setOfferFundedAmount(offer)

    const expected = {
      Account: addresses.ACCOUNT,
      TakerGets: offer.TakerGets,
      TakerPays: offer.TakerPays,
      is_fully_funded: true,
      taker_gets_funded: '100',
      taker_pays_funded: '123.456',
      owner_funds: '100100000'
    }

    assert.deepEqual(offer, expected)
  })

  it('Set offer funded amount - xrp/iou - unfunded', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    const offer = {
      Account: addresses.ACCOUNT,
      TakerGets: '100',
      TakerPays: {
        value: '123.456',
        currency: 'BTC',
        issuer: addresses.ISSUER
      },
      quality: '1.23456'
    }

    book._setOwnerFunds(addresses.ACCOUNT, '99')
    book._setOfferFundedAmount(offer)

    const expected = {
      Account: addresses.ACCOUNT,
      TakerGets: offer.TakerGets,
      TakerPays: offer.TakerPays,
      is_fully_funded: false,
      taker_gets_funded: '99',
      taker_pays_funded: '122.22144',
      owner_funds: '99',
      quality: '1.23456'
    }

    assert.deepEqual(offer, expected)
  })

  it('Set offer funded amount - zero funds', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'BTC'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    const offer = {
      Account: addresses.ACCOUNT,
      TakerPays: {
        value: '100',
        currency: 'BTC',
        issuer: addresses.ISSUER
      },
      TakerGets: '123456'
    }

    book._setOwnerFunds(addresses.ACCOUNT, '0')
    book._setOfferFundedAmount(offer)

    assert.deepEqual(offer, {
      Account: addresses.ACCOUNT,
      TakerGets: offer.TakerGets,
      TakerPays: offer.TakerPays,
      is_fully_funded: false,
      taker_gets_funded: '0',
      taker_pays_funded: '0',
      owner_funds: '0'
    })
  })

  describe('Metadata', function() {
    it('Check is balance change node', function() {
      const book = createOrderBook({
        currency_gets: 'USD',
        issuer_gets: addresses.ISSUER,
        currency_pays: 'XRP'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '-1'
              },
              Flags: 131072,
              HighLimit: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '100'
              },
              HighNode: '0000000000000000',
              LowLimit: {
                currency: 'USD',
                issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
                value: '0'
              },
              LowNode: '0000000000000000'
            },
            LedgerEntryType: 'RippleState',
            LedgerIndex: 'EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959',
            PreviousFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '0'
              }
            },
            PreviousTxnID: '53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8',
            PreviousTxnLgrSeq: 343570
          }
        }]
      }

      assert(book._isBalanceChangeNode(
        OrderBookUtils.getAffectedNodes(meta)[0]))
    })

    it('Check is balance change node - not balance change', function() {
      const book = createOrderBook({
        currency_gets: 'XRP',
        issuer_pays: addresses.ISSUER,
        currency_pays: 'BTC'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '-1'
              },
              Flags: 131072,
              HighLimit: {
                currency: 'USD',
                issuer: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
                value: '100'
              },
              HighNode: '0000000000000000',
              LowLimit: {
                currency: 'USD',
                issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
                value: '0'
              },
              LowNode: '0000000000000000'
            },
            LedgerEntryType: 'RippleState',
            LedgerIndex: 'EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959',
            PreviousTxnID: '53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8',
            PreviousTxnLgrSeq: 343570
          }
        }]
      }

      assert(!book._isBalanceChangeNode(
        OrderBookUtils.getAffectedNodes(meta)[0]))
    })

    it('Check is balance change node - different currency', function() {
      const book = createOrderBook({
        currency_gets: 'BTC',
        issuer_gets: addresses.ISSUER,
        currency_pays: 'XRP'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '-1'
              },
              Flags: 131072,
              HighLimit: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '100'
              },
              HighNode: '0000000000000000',
              LowLimit: {
                currency: 'USD',
                issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
                value: '0'
              },
              LowNode: '0000000000000000'
            },
            LedgerEntryType: 'RippleState',
            LedgerIndex: 'EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959',
            PreviousFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '0'
              }
            },
            PreviousTxnID: '53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8',
            PreviousTxnLgrSeq: 343570
          }
        }]
      }

      assert(!book._isBalanceChangeNode(
        OrderBookUtils.getAffectedNodes(meta)[0]))
    })

    it('Check is balance change node - different issuer', function() {
      const book = createOrderBook({
        currency_gets: 'USD',
        issuer_gets: addresses.ISSUER,
        currency_pays: 'XRP'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '-1'
              },
              Flags: 131072,
              HighLimit: {
                currency: 'USD',
                issuer: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
                value: '100'
              },
              HighNode: '0000000000000000',
              LowLimit: {
                currency: 'USD',
                issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
                value: '0'
              },
              LowNode: '0000000000000000'
            },
            LedgerEntryType: 'RippleState',
            LedgerIndex: 'EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959',
            PreviousFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '0'
              }
            },
            PreviousTxnID: '53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8',
            PreviousTxnLgrSeq: 343570
          }
        }]
      }

      assert(!book._isBalanceChangeNode(
        OrderBookUtils.getAffectedNodes(meta)[0]))
    })

    it('Check is balance change node - native currency', function() {
      const book = createOrderBook({
        currency_gets: 'XRP',
        issuer_pays: addresses.ISSUER,
        currency_pays: 'BTC'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
              Balance: '9999999990',
              Flags: 0,
              OwnerCount: 1,
              Sequence: 2
            },
            LedgerEntryType: 'AccountRoot',
            LedgerIndex: '4F83A2CF7E70F77F79A307E6A472BFC2585B806A70833CCD1C26105BAE0D6E05',
            PreviousFields: {
              Balance: '10000000000',
              OwnerCount: 0,
              Sequence: 1
            },
            PreviousTxnID: 'B24159F8552C355D35E43623F0E5AD965ADBF034D482421529E2703904E1EC09',
            PreviousTxnLgrSeq: 16154
          }
        }]
      }

      assert(book._isBalanceChangeNode(
        OrderBookUtils.getAffectedNodes(meta)[0]))
    })

    it('Check is balance change node - native currency - not balance change', function() {
      const book = createOrderBook({
        currency_gets: 'XRP',
        issuer_pays: addresses.ISSUER,
        currency_pays: 'BTC'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Account: 'r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV',
              Balance: '78991384535796',
              Flags: 0,
              OwnerCount: 3,
              Sequence: 188
            },
            LedgerEntryType: 'AccountRoot',
            LedgerIndex: 'B33FDD5CF3445E1A7F2BE9B06336BEBD73A5E3EE885D3EF93F7E3E2992E46F1A',
            PreviousTxnID: 'E9E1988A0F061679E5D14DE77DB0163CE0BBDC00F29E396FFD1DA0366E7D8904',
            PreviousTxnLgrSeq: 195455
          }
        }]
      }

      assert(!book._isBalanceChangeNode(
        OrderBookUtils.getAffectedNodes(meta)[0]))
    })

    it('Parse account balance from node', function() {
      const book = createOrderBook({
        currency_gets: 'USD',
        issuer_gets: addresses.ISSUER,
        currency_pays: 'XRP'
      })

      const meta = {
        AffectedNodes: [
          {
          ModifiedNode: {
            FinalFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '10'
              },
              Flags: 131072,
              HighLimit: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '100'
              },
              HighNode: '0000000000000000',
              LowLimit: {
                currency: 'USD',
                issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
                value: '0'
              },
              LowNode: '0000000000000000'
            },
            LedgerEntryType: 'RippleState',
            LedgerIndex: 'EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959',
            PreviousFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '0'
              }
            },
            PreviousTxnID: '53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8',
            PreviousTxnLgrSeq: 343570
          }
        },
        {
          ModifiedNode: {
            FinalFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '-10'
              },
              Flags: 131072,
              HighLimit: {
                currency: 'USD',
                issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
                value: '100'
              },
              HighNode: '0000000000000000',
              LowLimit: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '0'
              },
              LowNode: '0000000000000000'
            },
            LedgerEntryType: 'RippleState',
            LedgerIndex: 'EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959',
            PreviousFields: {
              Balance: {
                currency: 'USD',
                issuer: addresses.ISSUER,
                value: '0'
              }
            },
            PreviousTxnID: '53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8',
            PreviousTxnLgrSeq: 343570
          }
        }
        ]
      }

      assert.deepEqual(book._parseAccountBalanceFromNode(
        OrderBookUtils.getAffectedNodes(meta)[0]), {
        account: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
        balance: '10'
      })

      assert.deepEqual(book._parseAccountBalanceFromNode(
        OrderBookUtils.getAffectedNodes(meta)[1]), {
        account: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH',
        balance: '10'
      })
    })

    it('Parse account balance from node - native currency', function() {
      const book = createOrderBook({
        currency_gets: 'USD',
        issuer_gets: addresses.ISSUER,
        currency_pays: 'XRP'
      })

      const meta = {
        AffectedNodes: [{
          ModifiedNode: {
            FinalFields: {
              Account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
              Balance: '9999999990',
              Flags: 0,
              OwnerCount: 1,
              Sequence: 2
            },
            LedgerEntryType: 'AccountRoot',
            LedgerIndex: '4F83A2CF7E70F77F79A307E6A472BFC2585B806A70833CCD1C26105BAE0D6E05',
            PreviousFields: {
              Balance: '10000000000',
              OwnerCount: 0,
              Sequence: 1
            },
            PreviousTxnID: 'B24159F8552C355D35E43623F0E5AD965ADBF034D482421529E2703904E1EC09',
            PreviousTxnLgrSeq: 16154
          }
        }]
      }

      assert.deepEqual(book._parseAccountBalanceFromNode(
        OrderBookUtils.getAffectedNodes(meta)[0]), {
        account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
        balance: '9999999990'
      })
    })
  })

  it('Update funded amounts', function(done) {
    let receivedChangedEvents = 0
    let receivedFundsChangedEvents = 0

    const message = fixtures.transactionWithRippleState()

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    book._offers = fixtures.fiatOffers()

    book.on('offer_changed', function() {
      receivedChangedEvents += 1
    })

    book.on('offer_funds_changed', function(offer, previousFunds, newFunds) {
      assert.strictEqual(previousFunds, '100')
      assert.strictEqual(newFunds, offer.taker_gets_funded)
      assert.notStrictEqual(previousFunds, newFunds)
      switch (++receivedFundsChangedEvents) {
        case 1:
          assert.strictEqual(offer.is_fully_funded, false)
        assert.strictEqual(offer.taker_gets_funded, '10')
        assert.strictEqual(offer.taker_pays_funded, '1954238072')
        break
        case 2:
          assert.strictEqual(offer.is_fully_funded, false)
        assert.strictEqual(offer.taker_gets_funded, '0')
        assert.strictEqual(offer.taker_pays_funded, '0')
        break
      }
    })

    book._ownerFunds[addresses.ACCOUNT] = '20'
    book._updateFundedAmounts(message)

    setImmediate(function() {
      assert.strictEqual(book._getOwnerFunds(addresses.ACCOUNT).toString(), fixtures.FIAT_BALANCE)
      assert.strictEqual(receivedChangedEvents, 2)
      assert.strictEqual(receivedFundsChangedEvents, 2)
      done()
    })
  })

  it('Update funded amounts - increase funds', function() {
    let receivedFundsChangedEvents = 0

    const message = fixtures.transactionWithRippleState({
      balance: '50'
    })

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers({
      account_funds: '19'
    }))

    book.on('offer_funds_changed', function(offer, previousFunds, newFunds) {
      assert.strictEqual(newFunds, offer.taker_gets_funded)
      assert.notStrictEqual(previousFunds, newFunds)
      switch (++receivedFundsChangedEvents) {
        case 1:
          assert.strictEqual(previousFunds, '19')
        assert.strictEqual(offer.is_fully_funded, true)
        assert.strictEqual(offer.taker_gets_funded, fixtures.TAKER_GETS)
        assert.strictEqual(offer.taker_pays_funded, fixtures.TAKER_PAYS)
        break
        case 2:
          assert.strictEqual(previousFunds, '0')
        assert.strictEqual(offer.is_fully_funded, true)
        assert.strictEqual(offer.taker_gets_funded, '4.9656112525')
        assert.strictEqual(offer.taker_pays_funded, '972251352')
        break
      }
    })

    book._updateFundedAmounts(message)
  })

  it('Update funded amounts - owner_funds', function(done) {

    const message = fixtures.transactionWithRippleState()

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    book._offers = fixtures.fiatOffers()

    book._ownerFunds[addresses.ACCOUNT] = '100'
    book._updateFundedAmounts(message)

    setImmediate(function() {
      assert.strictEqual(book._offers[0].owner_funds, fixtures.FIAT_BALANCE)
      assert.strictEqual(book._offers[1].owner_funds, fixtures.FIAT_BALANCE)

      done()
    })
  })

  it('Update funded amounts - issuer transfer rate set', function(done) {
    const message = fixtures.transactionWithRippleState()

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    book._ownerFunds[addresses.ACCOUNT] = '100'
    book._offers = fixtures.fiatOffers()

    book._updateFundedAmounts(message)

    setImmediate(function() {
      assert.strictEqual(book._getOwnerFunds(addresses.ACCOUNT).toString(), '9.980039920159681')

      done()
    })
  })

  it('Update funded amounts - native currency', function(done) {
    let receivedChangedEvents = 0
    let receivedFundsChangedEvents = 0

    const message = fixtures.transactionWithAccountRoot()

    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'USD'
    })

    book._offers = fixtures.NATIVE_OFFERS

    book.on('offer_changed', function() {
      receivedChangedEvents += 1
    })

    book.on('offer_funds_changed', function(offer, previousFunds, newFunds) {
      assert.strictEqual(previousFunds, fixtures.NATIVE_BALANCE_PREVIOUS)
      assert.strictEqual(newFunds, offer.taker_gets_funded)
      assert.notStrictEqual(previousFunds, newFunds)
      switch (++receivedFundsChangedEvents) {
        case 1:
          assert(offer.is_fully_funded)
        break
        case 2:
          assert(!offer.is_fully_funded)
        break
      }
    })

    book._ownerFunds[addresses.ACCOUNT] = fixtures.NATIVE_BALANCE_PREVIOUS
    book._updateFundedAmounts(message)

    setImmediate(function() {
      book._getOwnerFunds(addresses.ACCOUNT, fixtures.NATIVE_BALANCE)
      assert.strictEqual(receivedChangedEvents, 2)
      assert.strictEqual(receivedFundsChangedEvents, 2)
      done()
    })
  })

  it('Update funded amounts - no affected account', function(done) {
    const message = fixtures.transactionWithAccountRoot({
      account: addresses.ACCOUNT
    })

    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'USD'
    })

    book._offers = fixtures.NATIVE_OFFERS

    book._offers.__defineGetter__(0, function() {
      assert(false, 'Iteration of offers for unaffected account')
    })

    book.on('offer_changed', function() {
      assert(false, 'offer_changed event emitted')
    })

    book.on('offer_funds_changed', function() {
      assert(false, 'offer_funds_changed event emitted')
    })

    book._updateFundedAmounts(message)

    setImmediate(done)
  })

  it('Update funded amounts - no balance change', function(done) {
    const book = createOrderBook({
      currency_gets: 'XRP',
      issuer_pays: addresses.ISSUER,
      currency_pays: 'USD'
    })

    const message = fixtures.transactionWithInvalidAccountRoot()

    book._offers = fixtures.NATIVE_OFFERS

    book.on('offer_changed', function() {
      assert(false, 'offer_changed event emitted')
    })

    book.on('offer_funds_changed', function() {
      assert(false, 'offer_funds_changed event emitted')
    })

    assert.strictEqual(typeof book._parseAccountBalanceFromNode, 'function')

    book.parseAccountBalanceFromNode = function() {
      assert(false, 'getBalanceChange should not be called')
    }

    book._ownerFunds[addresses.ACCOUNT] = '100'
    book._updateFundedAmounts(message)

    setImmediate(done)
  })

  it('Update funded amounts - deferred TransferRate', function(done) {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    const message = fixtures.transactionWithRippleState()

    book._api.connection.request = function(request) {
      assert.deepEqual(request, {
        command: 'account_info',
        ledger_index: 'validated',
        account: addresses.ISSUER
      })

      setImmediate(() => {
        assert(book._issuerTransferRate.equals(new IOUValue(fixtures.TRANSFER_RATE)))
        done()
      })
      return Promise.resolve(fixtures.accountInfoResponse())
    }

    book._ownerFunds[addresses.ACCOUNT] = '100'
    book._updateFundedAmounts(message)
  })

  it('Set offers - issuer transfer rate set - iou/xrp', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    const offers = fixtures.bookOffersResponse().offers

    book._setOffers(offers)

    assert.strictEqual(book._offers.length, 5)

    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '275.85192574')
    assert.strictEqual(book._getOwnerOfferTotal(addresses.OTHER_ACCOUNT).toString(), '24.060765960393')
    assert.strictEqual(book._getOwnerOfferTotal(addresses.THIRD_ACCOUNT).toString(), '712.60995')
    assert.strictEqual(book._getOwnerOfferTotal(addresses.FOURTH_ACCOUNT).toString(), '288.08')

    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 2)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._offerCounts[addresses.THIRD_ACCOUNT], 1)
    assert.strictEqual(book._offerCounts[addresses.FOURTH_ACCOUNT], 1)

    assert.strictEqual(book._getOwnerFunds(addresses.ACCOUNT).toString(), '2006.015671538605')
    assert.strictEqual(book._getOwnerFunds(addresses.OTHER_ACCOUNT).toString(), '24.01284027983332')
    assert.strictEqual(book._getOwnerFunds(addresses.THIRD_ACCOUNT).toString(), '9053.294314019701')
    assert.strictEqual(book._getOwnerFunds(addresses.FOURTH_ACCOUNT).toString(), '7229.594289344439')
  })

  it('Set offers - issuer transfer rate set - iou/xrp - funded amounts', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    const offers = fixtures.bookOffersResponse({
      account_funds: '233.13532'
    }).offers

    book._setOffers(offers)

    const offerOneTakerGetsFundedExpected = '79.39192374'

    assert.strictEqual(book._offers[0].taker_gets_funded, offerOneTakerGetsFundedExpected)
    assert(book._offers[0].is_fully_funded)

    const offerTwoTakerGetsFundedExpected = '24.01284027983332'

    const offerTwoTakerPaysFundedExpected = '1661400177'

    assert.strictEqual(book._offers[1].taker_gets_funded, offerTwoTakerGetsFundedExpected)
    assert.strictEqual(book._offers[1].taker_pays_funded, offerTwoTakerPaysFundedExpected)
    assert.strictEqual(book._offers[1].is_fully_funded, false)


    const offerFiveTakerGetsFundedExpected = '153.2780562999202'

    const offerFiveTakerPaysFundedExpected = '10684615137'

    assert.strictEqual(book._offers[4].taker_gets_funded, offerFiveTakerGetsFundedExpected)
    assert.strictEqual(book._offers[4].taker_pays_funded, offerFiveTakerPaysFundedExpected)
    assert.strictEqual(book._offers[4].is_fully_funded, false)
  })

  it('Set offers - multiple calls', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    const offers = fixtures.bookOffersResponse().offers

    book._setOffers(offers)
    book._setOffers(offers)

    assert.strictEqual(book._offers.length, 5)

    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '275.85192574')
    assert.strictEqual(book._getOwnerOfferTotal(addresses.OTHER_ACCOUNT).toString(), '24.060765960393')
    assert.strictEqual(book._getOwnerOfferTotal(addresses.THIRD_ACCOUNT).toString(), '712.60995')
    assert.strictEqual(book._getOwnerOfferTotal(addresses.FOURTH_ACCOUNT).toString(), '288.08')

    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 2)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._offerCounts[addresses.THIRD_ACCOUNT], 1)
    assert.strictEqual(book._offerCounts[addresses.FOURTH_ACCOUNT], 1)

    assert.strictEqual(book._getOwnerFunds(addresses.ACCOUNT).toString(), '2006.015671538605')
    assert.strictEqual(book._getOwnerFunds(addresses.OTHER_ACCOUNT).toString(), '24.01284027983332')
    assert.strictEqual(book._getOwnerFunds(addresses.THIRD_ACCOUNT).toString(), '9053.294314019701')
    assert.strictEqual(book._getOwnerFunds(addresses.FOURTH_ACCOUNT).toString(), '7229.594289344439')
  })

  it('Set offers - incorrect taker pays funded', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')

    const offers = fixtures.DECIMAL_TAKER_PAYS_FUNDED_OFFERS

    book._setOffers(offers)

    assert.strictEqual(book._offers.length, 1)

    assert.strictEqual(book._offers[0].taker_gets_funded, '9261.514125778347')
    assert.strictEqual(book._offers[0].taker_pays_funded, '1704050437125')
  })

  it('Notify - created node', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')
    book._subscribed = book._synced = true

    const message = fixtures.transactionWithCreatedOffer()

    book._processTransaction(message)

    assert.strictEqual(book._offers.length, 1)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '1.9951')
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 1)
    assert.strictEqual(book._getOwnerFunds(addresses.ACCOUNT).toString(), '2006.015671538605')
  })

  it('Notify - created nodes - correct sorting', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._issuerTransferRate = new IOUValue('1.002000000')
    book._subscribed = book._synced = true

    const offer = fixtures.transactionWithCreatedOffer()

    const lowQualityOffer = fixtures.transactionWithCreatedOffer({
      account: addresses.OTHER_ACCOUNT,
      amount: '1.5'
    })

    const highQualityOffer = fixtures.transactionWithCreatedOffer({
      account: addresses.THIRD_ACCOUNT,
      amount: '3.83'
    })

    book._processTransaction(offer)
    book._processTransaction(lowQualityOffer)
    book._processTransaction(highQualityOffer)

    assert.strictEqual(book._offers.length, 3)
    assert.strictEqual(book._offers[0].Account, addresses.THIRD_ACCOUNT)
    assert.strictEqual(book._offers[1].Account, addresses.ACCOUNT)
    assert.strictEqual(book._offers[2].Account, addresses.OTHER_ACCOUNT)
  })

  it('Notify - created nodes - events', function(done) {
    let numTransactionEvents = 0
    let numModelEvents = 0
    let numOfferAddedEvents = 0

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._api.connection.request = function() {
      return Promise.resolve({})
    }


    book.on('transaction', function() {
      numTransactionEvents += 1
    })

    book.on('model', function() {
      numModelEvents += 1
    })

    book.on('offer_added', function() {
      numOfferAddedEvents += 1
    })

    book._issuerTransferRate = new IOUValue('1.002000000')
    book._subscribed = book._synced = true
    book._waitingForOffers = false

    const offer = fixtures.transactionWithCreatedOffer()
    const offer2 = fixtures.transactionWithCreatedOffer()
    const offer3 = fixtures.transactionWithCreatedOffer()

    book._api.emit('ledger', {transactionCount: 3})

    book._api.connection.emit('transaction', offer)
    book._api.connection.emit('transaction', offer2)
    book._api.connection.emit('transaction', offer3)


    setTimeout(function() {
      assert.strictEqual(numTransactionEvents, 3)
      assert.strictEqual(numOfferAddedEvents, 3)
      assert.strictEqual(numModelEvents, 1)
      done()
    }, 300)
  })

  it('Notify - deleted node', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._api.connection.request = function() {
      return Promise.resolve({})
    }

    book._subscribed = true
    book._issuerTransferRate = new IOUValue('1.000000000')
    book._waitingForOffers = false

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithDeletedOffer()

    book._processTransaction(message)

    assert.strictEqual(book._offers.length, 2)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '4.9656112525')
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 1)
  })

  it('Notify - deleted node - last offer', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers().slice(0, 1))

    const message = fixtures.transactionWithDeletedOffer()

    book._processTransaction(message)

    assert.strictEqual(book._offers.length, 0)
    assert.throws(() => {
      book._getOwnerFunds(addresses.ACCOUNT)
    })
  })

  it('Notify - deleted node - events', function(done) {
    let numTransactionEvents = 0
    let numModelEvents = 0
    let numTradeEvents = 0
    let numOfferRemovedEvents = 0

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book.on('transaction', function() {
      numTransactionEvents += 1
    })

    book.on('model', function() {
      numModelEvents += 1
    })

    book.on('trade', function() {
      numTradeEvents += 1
    })

    book.on('offer_removed', function() {
      numOfferRemovedEvents += 1
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithDeletedOffer()

    book._api.emit('ledger', {transactionCount: 1})

    book._api.connection.emit('transaction', message)

    assert.strictEqual(numTransactionEvents, 1)
    assert.strictEqual(numTradeEvents, 1)
    assert.strictEqual(numOfferRemovedEvents, 1)
    setTimeout(function() {
      assert.strictEqual(numModelEvents, 1)
      done()
    }, 300)
  })

  it('Notify - deleted node - trade', function(done) {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book.on('trade', function(tradePays, tradeGets) {
      const expectedTradePays = new XRPValue(fixtures.TAKER_PAYS)
      const expectedTradeGets = new IOUValue(fixtures.TAKER_GETS)

      assert(tradePays.equals(expectedTradePays))
      assert(tradeGets.equals(expectedTradeGets))

      done()
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithDeletedOffer()

    book._processTransaction(message)
  })

  it('Notify - deleted node - offer cancel', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithDeletedOffer({
      transaction_type: 'OfferCancel'
    })

    book._processTransaction(message)

    assert.strictEqual(book._offers.length, 2)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '4.9656112525')
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 1)
  })

  it('Notify - deleted node - offer cancel - last offer', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers().slice(0, 1))

    const message = fixtures.transactionWithDeletedOffer({
      transaction_type: 'OfferCancel'
    })

    book._processTransaction(message)

    assert.strictEqual(book._offers.length, 0)
    assert.throws(() => {
      book._getOwnerFunds(addresses.ACCOUNT)
    })
  })

  it('Notify - modified node', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithModifiedOffer()

    book._processTransaction(message)

    assert.strictEqual(book._offers.length, 3)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '23.8114145625')
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 2)

    assert.strictEqual(book._offers[0].is_fully_funded, true)
    assert.strictEqual(book._offers[0].taker_gets_funded, fixtures.TAKER_GETS_FINAL)
    assert.strictEqual(book._offers[0].taker_pays_funded, fixtures.TAKER_PAYS_FINAL)

    assert.strictEqual(book._offers[1].is_fully_funded, true)
    assert.strictEqual(book._offers[1].taker_gets_funded, '4.9656112525')
    assert.strictEqual(book._offers[1].taker_pays_funded, '972251352')
  })

  it('Notify - modified node - events', function(done) {
    let numTransactionEvents = 0
    let numModelEvents = 0
    let numTradeEvents = 0
    let numOfferChangedEvents = 0

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._api.connection.request = function() {
      return Promise.resolve({})
    }

    book.on('transaction', function() {
      numTransactionEvents += 1
    })

    book.on('model', function() {
      numModelEvents += 1
    })

    book.on('trade', function() {
      numTradeEvents += 1
    })

    book.on('offer_changed', function() {
      numOfferChangedEvents += 1
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithModifiedOffer()

    book._api.emit('ledger', {transactionCount: 1})

    book._api.connection.emit('transaction', message)

    setTimeout(function() {
      assert.strictEqual(numTransactionEvents, 1)
      assert.strictEqual(numTradeEvents, 1)
      assert.strictEqual(numOfferChangedEvents, 1)
      assert.strictEqual(numModelEvents, 1)
      done()
    }, 300)
  })

  it('Notify - modified node - trade', function(done) {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book.on('trade', function(tradePays, tradeGets) {
      const expectedTradePays = new XRPValue('800000000')
      const expectedTradeGets = new IOUValue('1')

      assert(tradePays.equals(expectedTradePays))
      assert(tradeGets.equals(expectedTradeGets))

      done()
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithModifiedOffer()

    book._processTransaction(message)
  })

  it('Notify - modified nodes - trade', function(done) {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book.on('trade', function(tradePays, tradeGets) {
      const expectedTradePays = new XRPValue('870000000')
      const expectedTradeGets = new IOUValue('2')

      assert(tradePays.equals(expectedTradePays))
      assert(tradeGets.equals(expectedTradeGets))

      done()
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithModifiedOffers()

    book._processTransaction(message)
  })

  it('Notify - no nodes', function(done) {
    let numTransactionEvents = 0
    let numModelEvents = 0
    let numTradeEvents = 0
    let numOfferChangedEvents = 0

    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book.on('transaction', function() {
      numTransactionEvents += 1
    })

    book.on('model', function() {
      numModelEvents += 1
    })

    book.on('trade', function() {
      numTradeEvents += 1
    })

    book.on('offer_changed', function() {
      numOfferChangedEvents += 1
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    const message = fixtures.transactionWithNoNodes()

    book._processTransaction(message)

    setTimeout(() => {
      assert.strictEqual(numTransactionEvents, 0)
      assert.strictEqual(numModelEvents, 0)
      assert.strictEqual(numTradeEvents, 0)
      assert.strictEqual(numOfferChangedEvents, 0)
      done()
    }, 300)
  })

  it('Delete offer - offer cancel - funded after delete', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers({
      account_funds: '20'
    }))

    book._deleteOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithDeletedOffer({
      transaction_type: 'OfferCancel'
    }).meta)[0], true)


    assert.strictEqual(book._offers.length, 2)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 1)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '4.9656112525')

    assert.strictEqual(book._offers[0].is_fully_funded, true)
  })

  it('Delete offer - offer cancel - not fully funded after delete', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers({
      account_funds: '4.5'
    }))

    book._deleteOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithDeletedOffer({
      transaction_type: 'OfferCancel'
    }).meta)[0], true)

    assert.strictEqual(book._offers.length, 2)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 1)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '4.9656112525')

    assert.strictEqual(book._offers[0].is_fully_funded, false)
    assert.strictEqual(book._offers[0].taker_gets_funded, '4.5')
    assert.strictEqual(book._offers[0].taker_pays_funded, '881086106')
  })

  it('Insert offer - best quality', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.QUALITY_OFFERS)

    book._insertOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithCreatedOffer({
      amount: '51.04587961502088'
    }).meta)[0])

    assert.strictEqual(book._offers.length, 2)

    assert.strictEqual(book._offers[0].taker_gets_funded, '51.04587961502088')
    assert.strictEqual(book._offers[0].taker_pays_funded, fixtures.TAKER_PAYS)
    assert.strictEqual(book._offers[0].quality, '75977580.74206542')
  })

  it('Insert offer - XRP gets quality calculation', function() {
    const book = createOrderBook({
      currency_gets: 'XRP',
      currency_pays: 'USD',
      issuer_pays: addresses.ISSUER
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._insertOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithCreatedOfferR({
      amount: '200'
    }).meta)[0])

    assert.strictEqual(book._offers.length, 1)

    assert.strictEqual(book._offers[0].TakerPays.value, '200')
    assert.strictEqual(book._offers[0].TakerGets, fixtures.TAKER_PAYS)
    assert.strictEqual(book._offers[0].quality, '0.000000051568422101479')
  })

  it('Insert offer - best quality - insufficient funds for all offers', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers())

    book._insertOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithCreatedOffer({
      amount: '298'
    }).meta)[0])

    assert.strictEqual(book._offers.length, 4)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 3)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '322.8114145625')

    assert.strictEqual(book._offers[0].is_fully_funded, true)
    assert.strictEqual(book._offers[0].taker_gets_funded, '298')
    assert.strictEqual(book._offers[0].taker_pays_funded, fixtures.TAKER_PAYS)

    assert.strictEqual(book._offers[1].is_fully_funded, true)
    assert.strictEqual(book._offers[1].taker_gets_funded, fixtures.TAKER_GETS)
    assert.strictEqual(book._offers[1].taker_pays_funded, fixtures.TAKER_PAYS)

    assert.strictEqual(book._offers[2].is_fully_funded, false)
    assert.strictEqual(book._offers[2].taker_gets_funded, '0.5185677538508')
    assert.strictEqual(book._offers[2].taker_pays_funded, '101533965')
  })

  it('Insert offer - worst quality - insufficient funds for all orders', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers({
      account_funds: '25'
    }))

    book._insertOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithCreatedOffer({
      amount: '5'
    }).meta)[0])

    assert.strictEqual(book._offers.length, 4)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 3)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '29.8114145625')

    assert.strictEqual(book._offers[0].is_fully_funded, true)
    assert.strictEqual(book._offers[0].taker_gets_funded, fixtures.TAKER_GETS)
    assert.strictEqual(book._offers[0].taker_pays_funded, fixtures.TAKER_PAYS)

    assert.strictEqual(book._offers[1].is_fully_funded, true)
    assert.strictEqual(book._offers[1].taker_gets_funded, '4.9656112525')
    assert.strictEqual(book._offers[1].taker_pays_funded, '972251352')

    assert.strictEqual(book._offers[3].is_fully_funded, false)
    assert.strictEqual(book._offers[3].taker_gets_funded, '0.1885854375')
    assert.strictEqual(book._offers[3].taker_pays_funded, '146279781')
  })

  it('Insert offer - middle quality - insufficient funds for all offers', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    book._subscribed = true
    book._waitingForOffers = false
    book._issuerTransferRate = new IOUValue('1.000000000')

    book._setOffers(fixtures.fiatOffers({
      account_funds: '30'
    }))

    book._insertOffer(OrderBookUtils.getAffectedNodes(
      fixtures.transactionWithCreatedOffer({
      amount: '19.84080331'
    }).meta)[0])

    assert.strictEqual(book._offers.length, 4)
    assert.strictEqual(book._offerCounts[addresses.ACCOUNT], 3)
    assert.strictEqual(book._offerCounts[addresses.OTHER_ACCOUNT], 1)
    assert.strictEqual(book._getOwnerOfferTotal(addresses.ACCOUNT).toString(), '44.6522178725')

    assert.strictEqual(book._offers[0].is_fully_funded, true)
    assert.strictEqual(book._offers[0].taker_gets_funded, fixtures.TAKER_GETS)
    assert.strictEqual(book._offers[0].taker_pays_funded, fixtures.TAKER_PAYS)

    assert.strictEqual(book._offers[1].is_fully_funded, false)
    assert.strictEqual(book._offers[1].taker_gets_funded, '10.15419669')
    assert.strictEqual(book._offers[1].taker_pays_funded, '1984871849')

    assert.strictEqual(book._offers[2].is_fully_funded, false)
    assert.strictEqual(book._offers[2].taker_gets_funded, '0')
    assert.strictEqual(book._offers[2].taker_pays_funded, '0')
  })

  it('Request offers - native currency', function(done) {

    const offers = {
      offers: fixtures.REQUEST_OFFERS_NATIVE
    }

    const expected = [
      {
      Account: addresses.ACCOUNT,
      BookDirectory: '6EAB7C172DEFA430DBFAD120FDC373B5F5AF8B191649EC985711A3A4254F5000',
      BookNode: '0000000000000000',
      Flags: 131072,
      LedgerEntryType: 'Offer',
      OwnerNode: '0000000000000000',
      Sequence: 195,
      TakerGets: '1000',
      TakerPays: {
        currency: 'USD',
        issuer: addresses.ISSUER,
        value: '56.06639660617357'
      },
      index: 'B6BC3B0F87976370EE11F5575593FE63AA5DC1D602830DC96F04B2D597F044BF',
      owner_funds: '600',
      is_fully_funded: false,
      taker_gets_funded: '600',
      taker_pays_funded: '33.6398379637041',
      qualityHex: '5711A3A4254F5000',
      quality: '.0560663966061735'
    },
    {
      Account: addresses.OTHER_ACCOUNT,
      BookDirectory: '6EAB7C172DEFA430DBFAD120FDC373B5F5AF8B191649EC985711B6D8C62EF414',
      BookNode: '0000000000000000',
      Expiration: 461498565,
      Flags: 131072,
      LedgerEntryType: 'Offer',
      OwnerNode: '0000000000000144',
      Sequence: 29354,
      TakerGets: '2000',
      TakerPays: {
        currency: 'USD',
        issuer: addresses.ISSUER,
        value: '99.72233516476456'
      },
      index: 'A437D85DF80D250F79308F2B613CF5391C7CF8EE9099BC4E553942651CD9FA86',
      owner_funds: '4000',
      is_fully_funded: true,
      taker_gets_funded: '2000',
      taker_pays_funded: '99.72233516476456',
      qualityHex: '5711B6D8C62EF414',
      quality: '0.049861167582382'
    },
    {
      Account: addresses.THIRD_ACCOUNT,
      BookDirectory: '6EAB7C172DEFA430DBFAD120FDC373B5F5AF8B191649EC985711B6D8C62EF414',
      BookNode: '0000000000000000',
      Expiration: 461498565,
      Flags: 131072,
      LedgerEntryType: 'Offer',
      OwnerNode: '0000000000000144',
      Sequence: 29356,
      TakerGets: '2000',
      TakerPays: {
        currency: 'USD',
        issuer: addresses.ISSUER,
        value: '99.72233516476456'
      },
      index: 'A437D85DF80D250F79308F2B613CF5391C7CF8EE9099BC4E553942651CD9FA86',
      owner_funds: '3900',
      is_fully_funded: true,
      taker_gets_funded: '2000',
      taker_pays_funded: '99.72233516476456',
      qualityHex: '5711B6D8C62EF414',
      quality: '0.049861167582382'
    },
    {
      Account: addresses.THIRD_ACCOUNT,
      BookDirectory: '6EAB7C172DEFA430DBFAD120FDC373B5F5AF8B191649EC985711B6D8C62EF414',
      BookNode: '0000000000000000',
      Expiration: 461498565,
      Flags: 131078,
      LedgerEntryType: 'Offer',
      OwnerNode: '0000000000000144',
      Sequence: 29354,
      TakerGets: '2000',
      TakerPays: {
        currency: 'USD',
        issuer: addresses.ISSUER,
        value: '99.72233516476456'
      },
      index: 'A437D85DF80D250F79308F2B613CF5391C7CF8EE9099BC4E553942651CD9FA86',
      is_fully_funded: false,
      taker_gets_funded: '1900',
      taker_pays_funded: '94.7362184065258',
      owner_funds: '3900',
      qualityHex: '5711B6D8C62EF414',
      quality: '0.049861167582382'
    }
    ]

    const book = createOrderBook({
      currency_gets: 'XRP',
      currency_pays: 'USD',
      issuer_pays: addresses.ISSUER
    })

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      switch (message.command) {
        case 'book_offers':
          return Promise.resolve(offers)
      }
      return Promise.resolve({})
    }


    book.on('model', function(model) {
      assert.deepEqual(model, expected)
      assert.strictEqual(book._waitingForOffers, false)
      assert.strictEqual(book._subscribed, true)
      done()
    })
  })

  it('Offers expired', function() {
    const book = createOrderBook({
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP'
    })

    let numModelEvents = 0
    let numOfferRemovedEvents = 0

    book.on('model', function() {
      numModelEvents += 1
    })

    book.on('offer_removed', function() {
      numOfferRemovedEvents += 1
    })

    book._subscribed = true
    book._issuerTransferRate = new IOUValue(1000000000)

    function toRippleTime(t) {
      const timestamp_ = t instanceof Date ? t.getTime() : t
      return Math.round(t / 1000) - 0x386D4380
    }

    const d1 = toRippleTime(new Date())
    let d2 = new Date()
    d2.setSeconds(d2.getSeconds() - 1)
    d2 = toRippleTime(d2)

    const offers = fixtures.fiatOffers({expiration: d2})
    offers[0].Expiration = offers[0].Expiration + 2

    book._setOffers(offers)

    assert(book._offers.length === 3)

    book._api.emit('ledger', {
      ledger_time: d1
    })

    assert(book._offers.length === 1)
    assert(numModelEvents === 1)
    assert(numOfferRemovedEvents === 2)
  })

  it('create historical order book', function(done) {
    const options = {
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'XRP',
      ledger_index: 123456
    }
    const book = createOrderBook(options)

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      const response = {}

      if (message.command === 'account_info') {
        response.account_data = {
          TransferRate: 1002000000
        }

      } else if (message.command === 'book_offers') {
        assert(message.ledger_index === options.ledger_index)

        response.offers = [{
          'Account': 'r9WMJQZZwYukHWJAKX7EGqgwgswnapVXXn',
          'BookDirectory': '4627DFFCFF8B5A265EDBD8AE8C14A52325DBFEDAF4F5C32E5D0595B9C5964000',
          'BookNode': '0000000000000000',
          'Flags': 131072,
          'LedgerEntryType': 'Offer',
          'OwnerNode': '0000000000000000',
          'PreviousTxnID': '0FCBEE97586F08CE8C9344AB769BDB167AA1F7346EEDCEB5398814AD8D7ADDB1',
          'PreviousTxnLgrSeq': 25998845,
          'Sequence': 1585,
          'TakerGets': {
            'currency': 'USD',
            'issuer': 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
            'value': '1000'
          },
          'TakerPays': '157200000000',
          'index': '10D49439691AE1C2FBF227E697F44D93AD02B29ECACC2CEB9834413C652927F2',
          'owner_funds': '5000',
          'quality': '157200000'
        }]

        response.ledger_index = options.ledger_index
      }

      return Promise.resolve(response)
    }

    book.on('model', function(offers) {
      assert.strictEqual(offers.length, 1)
      done()
    })
  })

  it('create historical order book (autobridged)', function(done) {
    const options = {
      currency_gets: 'USD',
      issuer_gets: addresses.ISSUER,
      currency_pays: 'BTC',
      issuer_pays: addresses.ISSUER,
      ledger_index: 123456
    }
    const book = createOrderBook(options)
    const rippled_offers = {
      XRPBTC: [{
        'Account': 'rBWVP27pWkp7RRy3ry5T7an7hJUQdJfCDR',
        'BookDirectory': '37AAC93D336021AE94310D0430FFA090F7137C97D473488C491A0F8E01CF5BA7',
        'BookNode': '0000000000000000',
        'Flags': 0,
        'LedgerEntryType': 'Offer',
        'OwnerNode': '000000000000001D',
        'PreviousTxnID': '0000000000000000000000000000000000000000000000000000000000000000',
        'PreviousTxnLgrSeq': 0,
        'Sequence': 22448923,
        'TakerGets': '11882350298',
        'TakerPays': {
          'currency': 'BTC',
          'issuer': 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          'value': '0.08716241007537089'
        },
        'index': '1292193CB4034FEFF0D8D2D0000AE622AFAC448CF1EAAF6DE6285891B119AD2C',
        'owner_funds': '104760699390',
        'quality': '7335451984616359e-27'
      }],
      USDXRP: [{
        'Account': 'rhZ3EktwDsz7sP52PeqL11yJw5EJqvcGSR',
        'BookDirectory': '4627DFFCFF8B5A265EDBD8AE8C14A52325DBFEDAF4F5C32E5D05B41E5D68032B',
        'BookNode': '0000000000000000',
        'Flags': 0,
        'LedgerEntryType': 'Offer',
        'OwnerNode': '0000000000000000',
        'PreviousTxnID': '2F182A1CCD45C24C2D689149BAE0EB8F01E15BB3A07345F5E4F1567631CCB952',
        'PreviousTxnLgrSeq': 26431760,
        'Sequence': 133792,
        'TakerGets': {
          'currency': 'USD',
          'issuer': 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          'value': '266.40355205'
        },
        'TakerPays': '42768889593',
        'index': 'CF077143BBD17ED6AA78F5A9B89F5C922FE49B45F32D223C600EA61CE5C88B35',
        'owner_funds': '1255.922848641749',
        'quality': '160541739.2669483'
      }],
      USDBTC: [{
        'Account': 'rME8Sxc66TxWhJLmd2zzmQZzFB8pR1gGSR',
        'BookDirectory': '20294C923E80A51B487EB9547B3835FD483748B170D2D0A4520420651117E696',
        'BookNode': '0000000000000000',
        'Flags': 0,
        'LedgerEntryType': 'Offer',
        'OwnerNode': '0000000000000000',
        'PreviousTxnID': '287F7E52C83A4D2770913BD985D0DD2CD12B671DBD57DE2444C473D948361D36',
        'PreviousTxnLgrSeq': 26431788,
        'Sequence': 115652,
        'TakerGets': {
          'currency': 'USD',
          'issuer': 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          'value': '269.1821425'
        },
        'TakerPays': {
          'currency': 'BTC',
          'issuer': 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          'value': '0.31266'
        },
        'index': 'D78C09048FD0AE84FB705CB416B346472F6BD88D91C5905912D9FC1C24347646',
        'owner_funds': '1871.049400514363',
        'quality': '0.001161518357407382'
      }]
    }

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      const response = {}
      let key

      if (message.command === 'account_info') {
        response.account_data = {
          TransferRate: 1002000000
        }

      } else if (message.command === 'book_offers') {
        assert(message.ledger_index === options.ledger_index)
        key = message.taker_gets.currency + message.taker_pays.currency
        response.offers = rippled_offers[key]
        response.ledger_index = options.ledger_index
      }

      return Promise.resolve(response)
    }

    book.on('model', function(offers) {
      assert.strictEqual(offers.length, 2)
      assert.strictEqual(offers[0].quality, '0.001161518357407382')
      assert.strictEqual(offers[1].quality, '0.001177646219919498')
      done()
    })
  })
})
