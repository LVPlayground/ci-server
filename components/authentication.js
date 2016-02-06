// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const crypto = require('crypto');

// This class implements the functionality required to validate that a request is originating from
// GitHub, and has been sent with the appropriate secret.
class Authentication {
  constructor(secret) {
    this.secret_ = secret;
  }

  // Verifies that the |request| has been sent with an X-Hub-Signature header that verifies the
  // authenticity of the |body| by hashing against the |secret_|.
  verify(request, body) {
    return new Promise(resolve => {
      const headers = request.headers;
      if (!headers.hasOwnProperty('x-github-event') ||
          !headers.hasOwnProperty('x-hub-signature')) {
        resolve(true /* error */);
        return;
      }

      // Validate the X-Hub-Signature header (it must be present, and contain a sha1 value).
      const signatureHeader = headers['x-hub-signature'],
            signature = signatureHeader.substr(5);

      if (!/^[a-zA-Z0-9]{40}$/.test(signature)) {
        resolve(true /* error */);
        return;
      }

      // Compute the signature of the data payload, and compare it against the given signature.
      const contentSignature = crypto.createHmac('sha1', this.secret_).update(body).digest('hex');
      if (contentSignature != signature) {
        resolve(true /* error */);
        return;
      }

      // Great! The message has been authenticated.
      resolve(false /* error */);
    });
  }
};

module.exports = Authentication;
