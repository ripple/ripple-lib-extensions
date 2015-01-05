
// Flags for ledger entries. In support of account_root().
var ledgerEntryFlags = {
  // Account Root
  account_root: {
    PasswordSpent:   0x00010000, // True, if password set fee is spent.
    RequireDestTag:  0x00020000, // True, to require a DestinationTag for payments.
    RequireAuth:     0x00040000, // True, to require a authorization to hold IOUs.
    DisallowXRP:     0x00080000, // True, to disallow sending XRP.
    DisableMaster:   0x00100000  // True, force regular key.
  },

  // Offer
  offer: {
    Passive:         0x00010000,
    Sell:            0x00020000  // True, offer was placed as a sell.
  },

  // Ripple State
  state: {
    LowReserve:      0x00010000, // True, if entry counts toward reserve.
    HighReserve:     0x00020000,
    LowAuth:         0x00040000,
    HighAuth:        0x00080000,
    LowNoRipple:     0x00100000,
    HighNoRipple:    0x00200000
  }
};

var transactionFlags = {
  // Universal flags can apply to any transaction type
  Universal: {
    FullyCanonicalSig:  0x80000000
  },

  AccountSet: {
    RequireDestTag:     0x00010000,
    OptionalDestTag:    0x00020000,
    RequireAuth:        0x00040000,
    OptionalAuth:       0x00080000,
    DisallowXRP:        0x00100000,
    AllowXRP:           0x00200000
  },

  TrustSet: {
    SetAuth:            0x00010000,
    NoRipple:           0x00020000,
    SetNoRipple:        0x00020000,
    ClearNoRipple:      0x00040000,
    SetFreeze:          0x00100000,
    ClearFreeze:        0x00200000
  },

  OfferCreate: {
    Passive:            0x00010000,
    ImmediateOrCancel:  0x00020000,
    FillOrKill:         0x00040000,
    Sell:               0x00080000
  },

  Payment: {
    NoRippleDirect:     0x00010000,
    PartialPayment:     0x00020000,
    LimitQuality:       0x00040000
  }
};

module.exports.ledgerEntryFlags = ledgerEntryFlags;
module.exports.transactionFlags = transactionFlags;
