exports.offerCreateConsumedOffer = function() {
  return {
    "Account": "rBxy23n7ZFbUpS699rFVj1V9ZVhAq6EGwC",
    "Fee": "20000",
    "Flags": 131072,
    "Sequence": 609776,
    "SigningPubKey": "03917C08C81FEC424141C50A1C4B7C77A4B1563D51B7FA260797B9717F52C5E6D5",
    "TakerGets": {
      "currency": "BTC",
      "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
      "value": "0.2167622002262332"
    },
    "TakerPays": {
      "currency": "USD",
      "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
      "value": "57.5510124906279"
    },
    "TransactionType": "OfferCreate",
    "TxnSignature": "304402207E48A159CBA0491684C8BBE31DEF55859A7616EAA2339C43445CF0185DC20A07022017D442BB2F6AB8BB9925765A690473332D1C1157AE310409D3CFD45755708E6F",
    "date": 474426920,
    "hash": "0D13787384301F32E9E180C31F7F16EA0D2521783DBF71736B25AFF253FB6E11",
    "inLedger": 11086861,
    "ledger_index": 11086861,
    "meta": {
      "AffectedNodes": [
        {
        "DeletedNode": {
          "FinalFields": {
            "ExchangeRate": "520D604D6638790F",
            "Flags": 0,
            "RootIndex": "20294C923E80A51B487EB9547B3835FD483748B170D2D0A4520D604D6638790F",
            "TakerGetsCurrency": "0000000000000000000000005553440000000000",
            "TakerGetsIssuer": "0A20B3C85F482532A9578DBB3950B85CA06594D1",
            "TakerPaysCurrency": "0000000000000000000000004254430000000000",
            "TakerPaysIssuer": "0A20B3C85F482532A9578DBB3950B85CA06594D1"
          },
          "LedgerEntryType": "DirectoryNode",
          "LedgerIndex": "20294C923E80A51B487EB9547B3835FD483748B170D2D0A4520D604D6638790F"
        }
      },
      {
        "DeletedNode": {
          "FinalFields": {
            "Account": "r49y2xKuKVG2dPkNHgWQAV61cjxk8gryjQ",
            "BookDirectory": "20294C923E80A51B487EB9547B3835FD483748B170D2D0A4520D604D6638790F",
            "BookNode": "0000000000000000",
            "Flags": 0,
            "OwnerNode": "0000000000000000",
            "PreviousTxnID": "97AA291851DE9A894CFCCD4C69C96E9570F9182A5D39937463E1C80132DD65DE",
            "PreviousTxnLgrSeq": 11086861,
            "Sequence": 550,
            "TakerGets": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "TakerPays": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            }
          },
          "LedgerEntryType": "Offer",
          "LedgerIndex": "276522C8AAF28B5286C48E2373C119C48DAE78C3F8A047AAF67C22E4440C391B",
          "PreviousFields": {
            "TakerGets": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0.0000000036076"
            },
            "TakerPays": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "1358360000000000e-26"
            }
          }
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Flags": 0,
            "Owner": "r49y2xKuKVG2dPkNHgWQAV61cjxk8gryjQ",
            "RootIndex": "38D499A08201B64C001CF6B1803504373BFDA21A01302D3C0E78EF98544E9236"
          },
          "LedgerEntryType": "DirectoryNode",
          "LedgerIndex": "38D499A08201B64C001CF6B1803504373BFDA21A01302D3C0E78EF98544E9236"
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Balance": {
              "currency": "BTC",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-0.1151236147503502"
            },
            "Flags": 2228224,
            "HighLimit": {
              "currency": "BTC",
              "issuer": "rBxy23n7ZFbUpS699rFVj1V9ZVhAq6EGwC",
              "value": "0"
            },
            "HighNode": "0000000000000000",
            "LowLimit": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "LowNode": "000000000000028F"
          },
          "LedgerEntryType": "RippleState",
          "LedgerIndex": "42A6E9991D540C80BE4A43EF5254656DD862F602BBFF99BC576B44FBF6B7D775",
          "PreviousFields": {
            "Balance": {
              "currency": "BTC",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-0.3322932790173214"
            }
          },
          "PreviousTxnID": "B7CE60D440E11F31530E19A50A0775246102425D3594C9B886A7724BB1E58367",
          "PreviousTxnLgrSeq": 11086861
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Balance": {
              "currency": "USD",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-23112.9993818472"
            },
            "Flags": 2228224,
            "HighLimit": {
              "currency": "USD",
              "issuer": "r49y2xKuKVG2dPkNHgWQAV61cjxk8gryjQ",
              "value": "1000000000"
            },
            "HighNode": "0000000000000000",
            "LowLimit": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "LowNode": "0000000000000231"
          },
          "LedgerEntryType": "RippleState",
          "LedgerIndex": "615463C4F78931AA3E2B65FE49C6DAAC25A456C15679E67D1C19CA0943D98C5A",
          "PreviousFields": {
            "Balance": {
              "currency": "USD",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-23112.99938185081"
            }
          },
          "PreviousTxnID": "97AA291851DE9A894CFCCD4C69C96E9570F9182A5D39937463E1C80132DD65DE",
          "PreviousTxnLgrSeq": 11086861
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Balance": {
              "currency": "BTC",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-20.18770947118515"
            },
            "Flags": 131072,
            "HighLimit": {
              "currency": "BTC",
              "issuer": "r49y2xKuKVG2dPkNHgWQAV61cjxk8gryjQ",
              "value": "0"
            },
            "HighNode": "0000000000000000",
            "LowLimit": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "LowNode": "00000000000002C4"
          },
          "LedgerEntryType": "RippleState",
          "LedgerIndex": "817EB23FB16D8D17676F29055C989CDFB738B7FC310DF3AB5CA0D06AA2DC1326",
          "PreviousFields": {
            "Balance": {
              "currency": "BTC",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-20.18770947117157"
            }
          },
          "PreviousTxnID": "97AA291851DE9A894CFCCD4C69C96E9570F9182A5D39937463E1C80132DD65DE",
          "PreviousTxnLgrSeq": 11086861
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Balance": {
              "currency": "BTC",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-42.47198893790961"
            },
            "Flags": 2228224,
            "HighLimit": {
              "currency": "BTC",
              "issuer": "rQE5Z3FgVnRMbVfS6xiVQFgB4J3X162FVD",
              "value": "150"
            },
            "HighNode": "0000000000000000",
            "LowLimit": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "LowNode": "0000000000000201"
          },
          "LedgerEntryType": "RippleState",
          "LedgerIndex": "C688AE8E51943530C931C3B838D15818BDA1F1B60B641B5F866B724AD7D3E79B",
          "PreviousFields": {
            "Balance": {
              "currency": "BTC",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-42.25525274603999"
            }
          },
          "PreviousTxnID": "1C749407E3676E77693694BEBC73C74196EA39C4EB2BB47781ABD65F4AB315E9",
          "PreviousTxnLgrSeq": 11082323
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Balance": {
              "currency": "USD",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-283631.3541172556"
            },
            "Flags": 2228224,
            "HighLimit": {
              "currency": "USD",
              "issuer": "rQE5Z3FgVnRMbVfS6xiVQFgB4J3X162FVD",
              "value": "5000000"
            },
            "HighNode": "0000000000000000",
            "LowLimit": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "LowNode": "0000000000000201"
          },
          "LedgerEntryType": "RippleState",
          "LedgerIndex": "D8F66B71771581E6185072E5264B2C4C0F9C2CA642EE46B62D6F550D897D00FF",
          "PreviousFields": {
            "Balance": {
              "currency": "USD",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-283689.0202317675"
            }
          },
          "PreviousTxnID": "0419F004A3084E93D4708EDA40D64A9F52F52EAA854961C23E2779EBE400AAD9",
          "PreviousTxnLgrSeq": 11086605
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Account": "r49y2xKuKVG2dPkNHgWQAV61cjxk8gryjQ",
            "Balance": "52083119197",
            "Flags": 0,
            "OwnerCount": 8,
            "Sequence": 553
          },
          "LedgerEntryType": "AccountRoot",
          "LedgerIndex": "DD314C9308B172885F6D0F5F3F50A2EAB1D2E2BD75A65A4236547E9C1DD625DB",
          "PreviousFields": {
            "OwnerCount": 9
          },
          "PreviousTxnID": "F07EA8FA7FF285FA5EC5F5A36CCCFC0F3D4B9A9A2910EEABABF058F96F6CD402",
          "PreviousTxnLgrSeq": 11082743
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Balance": {
              "currency": "USD",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "-57.5510124906279"
            },
            "Flags": 2228224,
            "HighLimit": {
              "currency": "USD",
              "issuer": "rBxy23n7ZFbUpS699rFVj1V9ZVhAq6EGwC",
              "value": "0"
            },
            "HighNode": "0000000000000000",
            "LowLimit": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0"
            },
            "LowNode": "000000000000028F"
          },
          "LedgerEntryType": "RippleState",
          "LedgerIndex": "E929BE69F05FEB6B376C97E22A264D93D88A7E42BE3FE5BFBD1842AC08C85BCF",
          "PreviousFields": {
            "Balance": {
              "currency": "USD",
              "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
              "value": "0"
            }
          },
          "PreviousTxnID": "73867036670B2F95ADCFF006A253C700ED45EF83F1B125D4797F2C110B055B60",
          "PreviousTxnLgrSeq": 11086861
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Account": "rQE5Z3FgVnRMbVfS6xiVQFgB4J3X162FVD",
            "BookDirectory": "20294C923E80A51B487EB9547B3835FD483748B170D2D0A4520D61247A328674",
            "BookNode": "0000000000000000",
            "Flags": 0,
            "OwnerNode": "000000000000001B",
            "Sequence": 114646,
            "TakerGets": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0.00000002162526"
            },
            "TakerPays": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "8144010000000000e-26"
            }
          },
          "LedgerEntryType": "Offer",
          "LedgerIndex": "E9F98B8933C500737D5FD0BCAFC49EADB8F8A9D01170EFB7CA171D0DEF853D02",
          "PreviousFields": {
            "TakerGets": {
              "currency": "USD",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "57.55101250864556"
            },
            "TakerPays": {
              "currency": "BTC",
              "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
              "value": "0.2167361919510613"
            }
          },
          "PreviousTxnID": "23433B9508778BEE0E8CE398602BBEDAFAE210F59979BCAC818B6970DCCB91F5",
          "PreviousTxnLgrSeq": 11080258
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Account": "rBxy23n7ZFbUpS699rFVj1V9ZVhAq6EGwC",
            "Balance": "267312570945",
            "Flags": 0,
            "OwnerCount": 25,
            "Sequence": 609777
          },
          "LedgerEntryType": "AccountRoot",
          "LedgerIndex": "EAFF4A0B5E891B9BE6A4D484FD0A73356F099FA54F650C9D8FB35D3F29A44176",
          "PreviousFields": {
            "Balance": "267312590945",
            "Sequence": 609776
          },
          "PreviousTxnID": "B7CE60D440E11F31530E19A50A0775246102425D3594C9B886A7724BB1E58367",
          "PreviousTxnLgrSeq": 11086861
        }
      }
      ],
      "TransactionIndex": 48,
      "TransactionResult": "tesSUCCESS"
    },
    "validated": true
  };
};

exports.offerCreateCreatedOffer = function() {
  return {
    "Account": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
    "Fee": "12000",
    "Flags": 0,
    "LastLedgerSequence": 11349682,
    "Memos": [
      {
      "Memo": {
        "MemoData": "7274312E322E31",
        "MemoType": "636C69656E74"
      }
    }
    ],
    "Sequence": 26,
    "SigningPubKey": "039549AB540046941E2BD313CB71F0EEA3A560B587AE4ED75A7120965A67E0D6E1",
    "TakerGets": {
      "currency": "JPY",
      "issuer": "r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN",
      "value": "0.0001"
    },
    "TakerPays": "10000000000000",
    "TransactionType": "OfferCreate",
    "TxnSignature": "3044022056A68DDAD0F7568874D5233B408E9D22E50DF464CC1994F5F922E7124BA7719C02202021849173D5B51BA707A7B6A335357B75B375EA016A83914289942F51835AC4",
    "date": 475609770,
    "hash": "D53A3B99AC0C3CAF35D72178390ACA94CD42479A98CEA438EEAFF338E5FEB76D",
    "inLedger": 11349675,
    "ledger_index": 11349675,
    "meta": {
      "AffectedNodes": [
        {
        "CreatedNode": {
          "LedgerEntryType": "Offer",
          "LedgerIndex": "296EE8E1CC21F1122DB7A95EFD3C0BEC5CB1FCB4817573B47734E6EC55090707",
          "NewFields": {
            "Account": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
            "BookDirectory": "9F72CA02AB7CBA0FD97EA5F245C03EDC555C3FE97749CD4266038D7EA4C68000",
            "Sequence": 26,
            "TakerGets": {
              "currency": "JPY",
              "issuer": "r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN",
              "value": "0.0001"
            },
            "TakerPays": "10000000000000"
          }
        }
      },
      {
        "CreatedNode": {
          "LedgerEntryType": "DirectoryNode",
          "LedgerIndex": "9F72CA02AB7CBA0FD97EA5F245C03EDC555C3FE97749CD4266038D7EA4C68000",
          "NewFields": {
            "ExchangeRate": "66038D7EA4C68000",
            "RootIndex": "9F72CA02AB7CBA0FD97EA5F245C03EDC555C3FE97749CD4266038D7EA4C68000",
            "TakerGetsCurrency": "0000000000000000000000004A50590000000000",
            "TakerGetsIssuer": "5BBC0F22F61D9224A110650CFE21CC0C4BE13098"
          }
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Account": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
            "Balance": "59940000",
            "Flags": 0,
            "OwnerCount": 2,
            "Sequence": 27
          },
          "LedgerEntryType": "AccountRoot",
          "LedgerIndex": "C666A91E2D289AB6DD1A44363E1F4714B60584AA79B2CBFBB3330236610E4E47",
          "PreviousFields": {
            "Balance": "59952000",
            "OwnerCount": 1,
            "Sequence": 26
          },
          "PreviousTxnID": "86BD597EE965EB803B9C44BBFD651468076BCF1F982BD1F91D7B2E77BB0BC50A",
          "PreviousTxnLgrSeq": 11349670
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Flags": 0,
            "Owner": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
            "RootIndex": "E8C9FDFB9C7494135DF41ED69DFD0B9747CFE0ADF046E32BA24510B6A1EFDAE0"
          },
          "LedgerEntryType": "DirectoryNode",
          "LedgerIndex": "E8C9FDFB9C7494135DF41ED69DFD0B9747CFE0ADF046E32BA24510B6A1EFDAE0"
        }
      }
      ],
      "TransactionIndex": 11,
      "TransactionResult": "tesSUCCESS"
    },
    "validated": true
  };
};

exports.offerCancel = function() {
  return {
    "Account": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
    "Fee": "12000",
    "Flags": 0,
    "LastLedgerSequence": 11236701,
    "OfferSequence": 20,
    "Sequence": 22,
    "SigningPubKey": "039549AB540046941E2BD313CB71F0EEA3A560B587AE4ED75A7120965A67E0D6E1",
    "TransactionType": "OfferCancel",
    "TxnSignature": "304402200E24DFA7B5F37675CCBE5370EDB51A8EC4E58D55D34ADC19505DE3EE686ED64B0220421C955F4F4D63DFA517E48F81393FB007035C18821D25D8EA8C36D9A71AF0F4",
    "date": 475105560,
    "hash": "3D948699072B40312AE313E7E8297EED83080C9A4D5B564BCACF0951ABF00AC5",
    "inLedger": 11236693,
    "ledger_index": 11236693,
    "meta": {
      "AffectedNodes": [
        {
        "DeletedNode": {
          "FinalFields": {
            "Account": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
            "BookDirectory": "9F72CA02AB7CBA0FD97EA5F245C03EDC555C3FE97749CD425B038D7EA4C68000",
            "BookNode": "0000000000000000",
            "Flags": 0,
            "OwnerNode": "0000000000000000",
            "PreviousTxnID": "3D768E210A152DFA89C051FEFC26F2FFBF91AC8B794482B8DA906157D3B2C348",
            "PreviousTxnLgrSeq": 11235523,
            "Sequence": 20,
            "TakerGets": {
              "currency": "JPY",
              "issuer": "r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN",
              "value": "1000"
            },
            "TakerPays": "1000000000"
          },
          "LedgerEntryType": "Offer",
          "LedgerIndex": "39A270DE16B6861952C5409626B0FA68FCC1089DD242AF55D8B1CAE6194C0E67"
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "ExchangeRate": "5B038D7EA4C68000",
            "Flags": 0,
            "RootIndex": "9F72CA02AB7CBA0FD97EA5F245C03EDC555C3FE97749CD425B038D7EA4C68000",
            "TakerGetsCurrency": "0000000000000000000000004A50590000000000",
            "TakerGetsIssuer": "5BBC0F22F61D9224A110650CFE21CC0C4BE13098",
            "TakerPaysCurrency": "0000000000000000000000000000000000000000",
            "TakerPaysIssuer": "0000000000000000000000000000000000000000"
          },
          "LedgerEntryType": "DirectoryNode",
          "LedgerIndex": "9F72CA02AB7CBA0FD97EA5F245C03EDC555C3FE97749CD425B038D7EA4C68000"
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Account": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
            "Balance": "29988000",
            "Flags": 0,
            "OwnerCount": 1,
            "Sequence": 23
          },
          "LedgerEntryType": "AccountRoot",
          "LedgerIndex": "C666A91E2D289AB6DD1A44363E1F4714B60584AA79B2CBFBB3330236610E4E47",
          "PreviousFields": {
            "Balance": "30000000",
            "OwnerCount": 2,
            "Sequence": 22
          },
          "PreviousTxnID": "FC061E8B2FAE945F4F674E11D4EF25F3B951DEB9116CDE5506B35EF383DC8988",
          "PreviousTxnLgrSeq": 11235525
        }
      },
      {
        "ModifiedNode": {
          "FinalFields": {
            "Flags": 0,
            "Owner": "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M",
            "RootIndex": "E8C9FDFB9C7494135DF41ED69DFD0B9747CFE0ADF046E32BA24510B6A1EFDAE0"
          },
          "LedgerEntryType": "DirectoryNode",
          "LedgerIndex": "E8C9FDFB9C7494135DF41ED69DFD0B9747CFE0ADF046E32BA24510B6A1EFDAE0"
        }
      }
      ],
      "TransactionIndex": 2,
      "TransactionResult": "tesSUCCESS"
    },
    "validated": true
  };
};

exports.parsedOfferCreate = function () {
  return {
    "r49y2xKuKVG2dPkNHgWQAV61cjxk8gryjQ": [
      {
        "taker_pays": {
          "currency": "BTC",
          "counterparty": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
          "value": "-1.35836e-11"
        },
        "taker_gets": {
          "currency": "USD",
          "counterparty": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
          "value": "-3.6076e-9"
        },
        "sequence": 550,
        "status": "closed"
      }
    ],
    "rQE5Z3FgVnRMbVfS6xiVQFgB4J3X162FVD": [
      {
        "taker_pays": {
          "currency": "BTC",
          "counterparty": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
          "value": "-0.2167361918696212"
        },
        "taker_gets": {
          "currency": "USD",
          "counterparty": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
          "value": "-57.5510124870203"
        },
        "sequence": 114646,
        "status": "open"
      }
    ]
  };
};

exports.parsedOfferCreateCreated = function() {
  return {
    "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M": [
      {
        "taker_pays": {
          "currency": "XRP",
          "counterparty": "",
          "value": "10000000"
        },
        "taker_gets": {
          "currency": "JPY",
          "counterparty": "r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN",
          "value": "0.0001"
        },
        "sequence": 26,
        "status": "created"
      }
    ]
  };
};

exports.parsedOfferCancel = function () {
  return {
    "rEQWVz1qN4DWw5J17s3DgXQzUuVYDSpK6M": [
      {
        "taker_pays": {
          "currency": "XRP",
          "counterparty": "",
          "value": "0"
        },
        "taker_gets": {
          "currency": "JPY",
          "counterparty": "r94s8px6kSw1uZ1MV98dhSRTvc6VMPoPcN",
          "value": "0"
        },
        "sequence": 20,
        "status": "canceled"
      }
    ]
  };
};
