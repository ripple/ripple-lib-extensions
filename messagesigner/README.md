ripple-lib-messagesigner
------------------------

This module exports a Message class which can sign arbitrary data. To use it you
must use the exported class factory, which injects the required ripple-lib and
sjcl-extended dependencies.

```javascript
// import dependencies
var ripplelib = require('ripple-lib');
var sjcl = require('sjcl-extended');

// wire it all together
var messageFactory = require('ripple-lib-messagesigner');
var Message = messageFactory(ripplelib, sjcl);

// sign a message
var secret = 'safRpB5euNL52PZPTSqrE9gvuFwTC';
var msg = 'goodbye cruel world!';
var signature = Message.signMessage(msg, secret);

console.log(signature);
// AAAAG8rK+Ih6Oxf+kV5pHxjt9QPEaSNBgPUcBbzA9A5mI8ecC8YaWb3fxkUM4TVnI9EeP+JnGMN3BxEuHSmY2VBvy48=
```