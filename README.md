ripple-lib-extensions
=====================

A collection of packages that extend the functionality of ripple-lib.

## Not maintained

Warning: These packages are not actively maintained. We recommend using [ripple-lib](https://github.com/ripple/ripple-lib) instead.

#### Use in the Browser

These modules will need to be compiled for use in the browser.

From the root directory of each module, run `$ npm install` then `$ gulp`

The compiled libraries will be available in the `/dist/web` directory

### Orderbook

Live updating orderbook data from the XRP Ledger.  Requires RippleAPI version 0.14.0 or greater.

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

### Transaction Parser

Parses transaction objects to a higher-level view.

### Message Signer

Signs arbitrary data.
