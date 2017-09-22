/* eslint-disable max-nested-callbacks */
/* eslint-disable max-params */
/* eslint-disable max-len */

'use strict' // eslint-disable-line strict

const assert = require('assert-diff')

const RippleAPI = require('ripple-lib').RippleAPI
const OrderBook = require('../src/orderbook').OrderBook

const {normalizeCurrency} = require('../src/currencyutils')
const regression = require('./fixtures/regression-data.json')
const regressionResults = require('./fixtures/regression-data-results.json')
const regressionTransactions = require('./fixtures/regression-data-transactions.json')


describe.skip('regression test', function() {

  it('usd/usd model', function(done) {
    const api = new RippleAPI()
    const book = OrderBook.createOrderBook(api, {
      currency_gets: 'USD',
      issuer_gets: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      currency_pays: 'USD',
      issuer_pays: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
    })

    let models = 0

    book._api.isConnected = function() {
      return true
    }

    book._api.connection.request = function(message) {
      let response = {}

      switch (message.command) {
        case 'subscribe': {
          break
        }
        case 'account_info': {
          response = regression.account_info
          break
        }
        case 'book_offers': {
          const key = message.taker_gets.currency + message.taker_pays.currency
          response = regression.book_offers[key]
          break
        }
      }
      return Promise.resolve(response)
    }

    function emitLedger(index) {
      setTimeout(() => {
        book._api.emit('ledgerClosed', regression.ledgerClosed[index])
        const length = regressionTransactions[index].length
        for (let j = 0; j < length; j++) {
          book._api.connection.emit('transaction',
            regressionTransactions[index][j])
        }
      }, 1)

    }

    function normalizeResult(offers) {
      offers.forEach(offer => {
        offer.TakerGets.currency = normalizeCurrency(offer.TakerGets.currency)
        offer.TakerPays.currency = normalizeCurrency(offer.TakerPays.currency)
      })
    }

    book.on('model', function(offers) {
      const expected = regressionResults[models]
      normalizeResult(expected)
      assert.deepEqual(offers, expected)

      if (models < regressionResults.length - 1) {
        emitLedger(models)
        models++
      } else {
        done()
      }
    })

  })

})
