ripple-lib-extensions
=====================

A collection of packages that extend the functionality of ripple-lib.

####Use in the Browser
These modules will need to be compiled for use in the browser.
From the root directory run `$ npm install` then `$ gulp`
The compiled libraries will be available in the `/dist` directory

###Orderbook
Live updating orderbook data from the Ripple Network.  Requires RippleAPI version 0.14.0 or greater.

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

###Transaction Parser
###Message Signer
