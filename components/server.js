// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const http = require('http');

// Wrapper around the node.js http server to be more friendly with out configuration object. The
// created server will be very basic, only exposing the ability to listen to certain requests.
class Server {
  // Creates the server and starts listening on |hostname|:|port|. Will output another message to the
  // console when the server is actually accepting requests.
  constructor(hostname, port) {
    console.log('Initializing the HTTP server...');

    this.handlers_ = [];

    this.server_ = http.createServer(this.__proto__.onRequest.bind(this));
    this.server_.listen(port, hostname, () =>
        console.log(`Listening on ${hostname}:${port}...`));
  }

  // Registers |handler| as a function to be invoked for requests that start with |pathPrefix|. The
  // |handler| must accept three arguments: request, body, response.
  registerHandler(prefix, handler) {
    this.handlers_.push({ prefix: prefix, fn: handler });
  }

  // Called when a request has arrived. Will execute the associated handler, if any, when the full
  // request headers and body have been received from the sender.
  onRequest(request, response) {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', data => body += data);
    request.on('end', () => {
      // Iterate over the registered handlers to find one that's interested in this request.
      for (const handler of this.handlers_) {
        if (!request.url.startsWith(handler.prefix))
          continue;

        try {
          handler.fn(request, body, response);

        } catch (e) {
          // Send a standard 500 Internal Server Error response when the handler errored out.
          response.writeHead(500, { 'Content-Type': 'text/plain' });
          response.end();
        }

        return;
      }

      // Send a standard 404 Not Found response when no handler could be invoked.
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end();
    });
  }
};

module.exports = Server;
