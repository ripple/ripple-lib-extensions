var assert = require('assert-diff');
var parseOrderBookChanges = require('../src/index').parseOrderBookChanges;
var fixtures = require('./fixtures/orderbookchanges.js');

describe('parseOrderBookChanges', function() {
  it('parse OfferCreate -- consumed and partially consumed offer', function() {
    var meta = fixtures.offerCreateConsumedOffer().meta;
    var parsed = fixtures.parsedOfferCreate();
    assert.deepEqual(parsed, parseOrderBookChanges(meta));
  });

  it('parse OfferCreate -- created offer', function() {
    var meta = fixtures.offerCreateCreatedOffer().meta;
    var parsed = fixtures.parsedOfferCreateCreated();
    assert.deepEqual(parsed, parseOrderBookChanges(meta));
  });

  it('parse OfferCancel', function() {
    var meta = fixtures.offerCancel().meta;
    var parsed = fixtures.parsedOfferCancel();
    assert.deepEqual(parsed, parseOrderBookChanges(meta));
  });
});
