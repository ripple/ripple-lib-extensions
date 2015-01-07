
ripple-lib-transactionparser
----------------------------

Parses transaction objects to a higher-level view.

### parseBalanceChanges(metadata)

Takes a transaction metadata object (as returned by a ripple-lib response) and computes the balance changes that were caused by that transaction.

The return value is a javascript object in the following format:

    { RIPPLEADDRESS: [BALANCECHANGE, ...], ... }

where BALANCECHANGE is a javascript object in the following format:

    {
      counterparty: RIPPLEADDRESS,
      currency: CURRENCYSTRING,
      value: DECIMALSTRING
    }

The keys in this object are the Ripple addresses whose balances have changed and the values are arrays of objects that represent the balance changes. Each balance change has a counterparty, which is the opposite party on the trustline, except for XRP, where the counterparty is set to the empty string.

The CURRENCYSTRING is 'XRP' for XRP, a 3-letter ISO currency code, or a 160-bit hex string in the [Currency format](https://wiki.ripple.com/Currency_format).
