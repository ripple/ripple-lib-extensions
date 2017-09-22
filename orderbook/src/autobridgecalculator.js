/* @flow */

'use strict' // eslint-disable-line strict

const _ = require('lodash')
const assert = require('assert')
const Utils = require('./orderbookutils')
const {IOUValue} = require('ripple-lib-value')

function assertValidNumber(number, message) {
  assert(!_.isNull(number) && !isNaN(number), message)
}

function assertValidLegOneOffer(legOneOffer, message) {
  assert(legOneOffer)
  assert.strictEqual(typeof legOneOffer, 'object', message)
  assert.strictEqual(typeof legOneOffer.TakerPays, 'object', message)
  assertValidNumber(legOneOffer.TakerGets, message)
}

const ZERO_VALUE = new IOUValue('0')

class AutobridgeCalculator {

  _currencyGets: string;
  _currencyPays: string;
  _issuerGets: string;
  _issuerPays: string;
  legOneOffers: Array<Object>;
  legTwoOffers: Array<Object>;

  _ownerFundsLeftover: { [key: string]: IOUValue };

  constructor(currencyGets: string, currencyPays: string,
    legOneOffers: Array<Object>, legTwoOffers: Array<Object>,
    issuerGets: string, issuerPays: string
  ) {
    this._currencyGets = currencyGets
    this._currencyPays = currencyPays
    this._issuerGets = issuerGets
    this._issuerPays = issuerPays
    this.legOneOffers = _.cloneDeep(legOneOffers)
    this.legTwoOffers = _.cloneDeep(legTwoOffers)

    this._ownerFundsLeftover = {}
  }


  /**
   * Calculates an ordered array of autobridged offers by quality
   *
   * @return {Array}
   */

  calculate(): Promise<Array<Object>> {

    const legOnePointer = 0
    const legTwoPointer = 0

    const offersAutobridged = []

    this._ownerFundsLeftover = {}

    return new Promise(resolve => {
      this._calculateInternal(legOnePointer, legTwoPointer, offersAutobridged,
        resolve)
    })
  }

  _calculateInternal(
    legOnePointer_: number, legTwoPointer_: number,
    offersAutobridged: Array<Object>, resolve: (offers: Array<Object>) => void
  ): void {

    let legOnePointer = legOnePointer_
    let legTwoPointer = legTwoPointer_

    const startTime = Date.now()

    while (this.legOneOffers[legOnePointer] &&
        this.legTwoOffers[legTwoPointer]) {
      // manually implement cooperative multitasking that yields after 30ms
      // of execution so user's browser stays responsive
      const lasted = (Date.now() - startTime)
      if (lasted > 30) {
        setTimeout(this._calculateInternal.bind(this, legOnePointer,
          legTwoPointer, offersAutobridged, resolve), 0)

        return
      }

      const legOneOffer = this.legOneOffers[legOnePointer]
      const legTwoOffer = this.legTwoOffers[legTwoPointer]
      const leftoverFunds = this._getLeftoverOwnerFunds(legOneOffer.Account)
      let autobridgedOffer

      if (legOneOffer.Account === legTwoOffer.Account) {
        this._unclampLegOneOwnerFunds(legOneOffer)
      } else if (!legOneOffer.is_fully_funded && !leftoverFunds.isZero()) {
        this._adjustLegOneFundedAmount(legOneOffer)
      }

      const legOneTakerGetsFunded = this._getOfferTakerGetsFunded(legOneOffer)
      const legTwoTakerPaysFunded = this._getOfferTakerPaysFunded(legTwoOffer)

      if (legOneTakerGetsFunded.isZero()) {
        legOnePointer++

        continue
      }

      if (legTwoTakerPaysFunded.isZero()) {
        legTwoPointer++

        continue
      }

      const compared = legOneTakerGetsFunded.comparedTo(legTwoTakerPaysFunded)
      if (compared > 0) {
        autobridgedOffer = this._getAutobridgedOfferWithClampedLegOne(
          legOneOffer,
          legTwoOffer
        )

        legTwoPointer++
      } else if (compared < 0) {
        autobridgedOffer = this._getAutobridgedOfferWithClampedLegTwo(
          legOneOffer,
          legTwoOffer
        )

        legOnePointer++
      } else {
        autobridgedOffer = this._getAutobridgedOfferWithoutClamps(
          legOneOffer,
          legTwoOffer
        )

        legOnePointer++
        legTwoPointer++
      }

      // calculate quality from leg qualities
      const legOneQuality = new IOUValue(legOneOffer.quality)
      const legTwoQuality = new IOUValue(legTwoOffer.quality)
      autobridgedOffer.quality =
        legOneQuality.multiply(legTwoQuality).toFixed()
      autobridgedOffer.BookDirectory =
        Utils.convertOfferQualityToHexFromText(autobridgedOffer.quality)
      autobridgedOffer.qualityHex = autobridgedOffer.BookDirectory

      offersAutobridged.push(autobridgedOffer)
    }

    resolve(offersAutobridged)
  }

    /**
   * In this case, the output from leg one and the input to leg two are the
   * same. We do not need to clamp either.
   * @param {Object} legOneOffer
   * @param {Object} legTwoOffer
   *
   * @return {Object}
   */

  _getAutobridgedOfferWithoutClamps(legOneOffer: Object, legTwoOffer: Object
  ): Object {
    const autobridgedTakerGets = this._getOfferTakerGetsFunded(legTwoOffer)
    const autobridgedTakerPays = this._getOfferTakerPaysFunded(legOneOffer)

    return this._formatAutobridgedOffer(
      autobridgedTakerGets,
      autobridgedTakerPays
    )
  }

  /**
   * In this case, the input from leg two is greater than the output to leg one.
   * Therefore, we must effectively clamp leg two input to leg one output.
   *
   * @param {Object} legOneOffer
   * @param {Object} legTwoOffer
   *
   * @return {Object}
   */

  _getAutobridgedOfferWithClampedLegTwo(legOneOffer: Object,
    legTwoOffer: Object
  ): Object {
    const legOneTakerGetsFunded = this._getOfferTakerGetsFunded(legOneOffer)
    const legTwoTakerPaysFunded = this._getOfferTakerPaysFunded(legTwoOffer)
    const legTwoQuality = new IOUValue(legTwoOffer.quality)

    const autobridgedTakerGets = legOneTakerGetsFunded.divide(legTwoQuality)
    const autobridgedTakerPays = this._getOfferTakerPaysFunded(legOneOffer)

    // Update funded amount since leg two offer was not completely consumed
    legTwoOffer.taker_gets_funded = this._getOfferTakerGetsFunded(legTwoOffer)
      .subtract(autobridgedTakerGets)
      .toFixed()
    legTwoOffer.taker_pays_funded = legTwoTakerPaysFunded
      .subtract(legOneTakerGetsFunded)
      .toFixed()

    return this._formatAutobridgedOffer(
      autobridgedTakerGets,
      autobridgedTakerPays
    )
  }

  /**
   * In this case, the output from leg one is greater than the input to leg two.
   * Therefore, we must effectively clamp leg one output to leg two input.
   *
   * @param {Object} legOneOffer
   * @param {Object} legTwoOffer
   *
   * @return {Object}
   */

  _getAutobridgedOfferWithClampedLegOne(legOneOffer: Object,
    legTwoOffer: Object
  ): Object {
    const legOneTakerGetsFunded = this._getOfferTakerGetsFunded(legOneOffer)
    const legTwoTakerPaysFunded = this._getOfferTakerPaysFunded(legTwoOffer)
    const legOneQuality = new IOUValue(legOneOffer.quality)

    const autobridgedTakerGets = this._getOfferTakerGetsFunded(legTwoOffer)
    const autobridgedTakerPays = legTwoTakerPaysFunded.multiply(legOneQuality)

    if (legOneOffer.Account === legTwoOffer.Account) {
      const legOneTakerGets = this._getOfferTakerGets(legOneOffer)
      const updatedTakerGets = legOneTakerGets.subtract(legTwoTakerPaysFunded)

      this._setLegOneTakerGets(legOneOffer, updatedTakerGets)

      this._clampLegOneOwnerFunds(legOneOffer)
    } else {
      // Update funded amount since leg one offer was not completely consumed
      const updatedTakerGetsFunded = legOneTakerGetsFunded
        .subtract(legTwoTakerPaysFunded)

      this._setLegOneTakerGetsFunded(legOneOffer, updatedTakerGetsFunded)
    }

    return this._formatAutobridgedOffer(
      autobridgedTakerGets,
      autobridgedTakerPays
    )
  }

  /**
   * Format an autobridged offer and compute synthetic values (e.g. quality)
   *
   * @param {IOUValue} takerGets
   * @param {IOUValue} takerPays
   *
   * @return {Object}
   */

  _formatAutobridgedOffer(takerGets: IOUValue, takerPays: IOUValue): Object {
    assert(takerGets instanceof IOUValue, 'Autobridged taker gets is invalid')
    assert(takerPays instanceof IOUValue, 'Autobridged taker pays is invalid')

    const autobridgedOffer = {}

    autobridgedOffer.TakerGets = {
      value: takerGets.toFixed(),
      currency: this._currencyGets,
      issuer: this._issuerGets
    }

    autobridgedOffer.TakerPays = {
      value: takerPays.toFixed(),
      currency: this._currencyPays,
      issuer: this._issuerPays
    }

    autobridgedOffer.taker_gets_funded = autobridgedOffer.TakerGets.value
    autobridgedOffer.taker_pays_funded = autobridgedOffer.TakerPays.value
    autobridgedOffer.autobridged = true

    return autobridgedOffer
  }

  /**
   * Apply clamp back on leg one offer after a round of autobridge calculation
   * completes. We must reapply clamps that have been removed because we cannot
   * guarantee that the next offer from leg two will also be from the same
   * account.
   *
   * When we reapply, it could happen that the amount of TakerGets left after
   * the autobridge calculation is less than the original funded amount. In this
   * case, we have extra funds we can use towards unfunded offers with worse
   * quality by the same owner.
   *
   * @param {Object} legOneOffer - IOU:XRP offer
   */

  _clampLegOneOwnerFunds(legOneOffer: Object): void {
    assertValidLegOneOffer(legOneOffer, 'Leg one offer is invalid')

    const takerGets = this._getOfferTakerGets(legOneOffer)

    if (takerGets.comparedTo(legOneOffer.initTakerGetsFunded) > 0) {
      // After clamping, TakerGets is still greater than initial funded amount
      this._setLegOneTakerGetsFunded(legOneOffer,
        legOneOffer.initTakerGetsFunded)
    } else {
      const updatedLeftover =
        legOneOffer.initTakerGetsFunded.subtract(takerGets)

      this._setLegOneTakerGetsFunded(legOneOffer, takerGets)
      this._addLeftoverOwnerFunds(legOneOffer.Account, updatedLeftover)
    }
  }

  /**
   * Add funds to account's leftover funds
   *
   * @param {String} account
   * @param {IOUValue} amount
   *
   * @return {IOUValue}
   */

  _addLeftoverOwnerFunds(account: string, amount: IOUValue): IOUValue {
    assert(amount instanceof IOUValue, 'Amount is invalid')

    this._ownerFundsLeftover[account] = this._getLeftoverOwnerFunds(account)
      .add(amount)

    return this._ownerFundsLeftover[account]
  }

  /**
   * Remove funds clamp on leg one offer. This is necessary when the two offers
   * are owned by the same account. In this case, it doesn't matter if offer one
   * is not fully funded. Leg one out goes to leg two in and since its the same
   * account, an infinite amount can flow.
   *
   * @param {Object} legOneOffer - IOU:XRP offer
   */

  _unclampLegOneOwnerFunds(legOneOffer: Object): void {
    assertValidLegOneOffer(legOneOffer, 'Leg one offer is invalid')

    legOneOffer.initTakerGetsFunded =
      this._getOfferTakerGetsFunded(legOneOffer)

    this._setLegOneTakerGetsFunded(
      legOneOffer,
      this._getOfferTakerGets(legOneOffer)
    )
  }

  /**
   * Set taker gets amount for a IOU:XRP offer. Also calculates taker pays
   * using offer quality
   *
   * @param {Object} legOneOffer - IOU:XRP offer
   * @param {IOUValue} takerGets
   */

  _setLegOneTakerGets(legOneOffer: Object, takerGets: IOUValue): void {
    assertValidLegOneOffer(legOneOffer, 'Leg one offer is invalid')
    assert(takerGets instanceof IOUValue, 'Taker gets funded is invalid')

    const legOneQuality = new IOUValue(legOneOffer.quality)

    legOneOffer.TakerGets = takerGets.toFixed()
    const value = takerGets.multiply(legOneQuality)
    legOneOffer.TakerPays = {
      currency: this._currencyPays,
      issuer: this._issuerPays,
      value: value.toFixed()
    }
  }


  /**
   * Set taker gets funded amount for a IOU:XRP offer. Also calculates taker
   * pays funded using offer quality and updates is_fully_funded flag
   *
   * @param {Object} legOneOffer - IOU:XRP offer
   * @param {IOUValue} takerGetsFunded
   */

  _setLegOneTakerGetsFunded(legOneOffer: Object, takerGetsFunded: IOUValue
  ): void {
    assertValidLegOneOffer(legOneOffer, 'Leg one offer is invalid')
    assert(takerGetsFunded instanceof IOUValue, 'Taker gets funded is invalid')

    legOneOffer.taker_gets_funded = takerGetsFunded.toFixed()
    legOneOffer.taker_pays_funded = takerGetsFunded
      .multiply(new IOUValue(legOneOffer.quality))
      .toFixed()

    if (legOneOffer.taker_gets_funded === legOneOffer.TakerGets.value) {
      legOneOffer.is_fully_funded = true
    }
  }

  /**
   * Increase leg one offer funded amount with extra funds found after applying
   * clamp.
   *
   * @param {Object} legOneOffer - IOU:XRP offer
   */

  _adjustLegOneFundedAmount(legOneOffer: Object): void {
    assertValidLegOneOffer(legOneOffer, 'Leg one offer is invalid')
    assert(!legOneOffer.is_fully_funded,
      'Leg one offer cannot be fully funded')

    const fundedSum = this._getOfferTakerGetsFunded(legOneOffer)
      .add(this._getLeftoverOwnerFunds(legOneOffer.Account))

    if (fundedSum.comparedTo(this._getOfferTakerGets(legOneOffer)) >= 0) {
      // There are enough extra funds to fully fund the offer
      const legOneTakerGets = this._getOfferTakerGets(legOneOffer)
      const updatedLeftover = fundedSum.subtract(legOneTakerGets)

      this._setLegOneTakerGetsFunded(legOneOffer, legOneTakerGets)
      this._setLeftoverOwnerFunds(legOneOffer.Account, updatedLeftover)
    } else {
      // There are not enough extra funds to fully fund the offer
      this._setLegOneTakerGetsFunded(legOneOffer, fundedSum)
      this._resetOwnerFundsLeftover(legOneOffer.Account)
    }
  }


  /**
   * Reset owner funds leftovers for an account to 0
   *
   * @param {String} account
   *
   * @return {IOUValue}
   */

  _resetOwnerFundsLeftover(account: string): IOUValue {
    this._ownerFundsLeftover[account] = ZERO_VALUE

    return this._ownerFundsLeftover[account]
  }

  /**
   * Set account's leftover funds
   *
   * @param {String} account
   * @param {IOUValue} amount
   */

  _setLeftoverOwnerFunds(account: string, amount: IOUValue): void {
    assert(amount instanceof IOUValue, 'Amount is invalid')

    this._ownerFundsLeftover[account] = amount
  }

  /**
   * Retrieve leftover funds found after clamping leg one by account
   *
   * @param {String} account
   *
   * @return {IOUValue}
   */

  _getLeftoverOwnerFunds(account: string): IOUValue {
    let amount = this._ownerFundsLeftover[account]

    if (!amount) {
      amount = ZERO_VALUE
    }

    return amount
  }

  _getOfferTakerGetsFunded(offer: Object): IOUValue {
    assertValidNumber(offer.taker_gets_funded, 'Taker gets funded is invalid')
    return new IOUValue(offer.taker_gets_funded)
  }

  _getOfferTakerPaysFunded(offer: Object): IOUValue {
    assertValidNumber(offer.taker_pays_funded, 'Taker pays funded is invalid')
    return new IOUValue(offer.taker_pays_funded)
  }

  _getOfferTakerGets(offer: Object): IOUValue {
    assert(typeof offer, 'object', 'Offer is invalid')
    return new IOUValue(Utils.getValueFromRippledAmount(offer.TakerGets))
  }

}

exports.AutobridgeCalculator = AutobridgeCalculator
