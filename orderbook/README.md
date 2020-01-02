# DEPRECATED: This library is not maintained.

# ripple-lib-orderbook

Live updating orderbook data from the XRP Ledger.

```javascript
  var api = new ripple.RippleAPI({server: 'wss://s1.ripple.com'});

  api.connect().then(function() {

    var book = rippleOrderbook.OrderBook.createOrderBook(api, {
      currency_gets: 'XRP',
      issuer_pays: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      currency_pays: 'USD'
    });

    book.on('model', function(offers) {
      console.log(offers);
    });
  });
```
