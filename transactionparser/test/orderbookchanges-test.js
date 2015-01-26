var assert = require('assert-diff');
var parseOrderbookChanges = require('../src/index').parseOrderbookChanges;
var fixtures = require('./fixtures/orderbookchanges.js');

describe('parseOrderbookChanges', function() {
  it('parse OfferCreate -- consumed and partially consumed offer', function() {
    var meta = fixtures.offerCreateConsumedOffer().meta;
    var parsed = fixtures.parsedOfferCreateConsumed();
    assert.deepEqual(parsed, parseOrderbookChanges(meta));
  });

  it('parse OfferCreate -- created offer', function() {
    var meta = fixtures.offerCreateCreatedOffer().meta;
    var parsed = fixtures.parsedOfferCreateCreated();
    assert.deepEqual(parsed, parseOrderbookChanges(meta));
  });

  it('parse OfferCancel', function() {
    var meta = fixtures.offerCancel().meta;
    var parsed = fixtures.parsedOfferCancel();
    assert.deepEqual(parsed, parseOrderbookChanges(meta));
  });
});
