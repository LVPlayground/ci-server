// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Configuration = require('./components/configuration'),
      Server = require('./components/server');

// Variables that will be available after the configuration is available.
let server = null;

// -------------------------------------------------------------------------------------------------

// Handler for /robots.txt to tell spiders that nothing on the server should be indexed.
function RobotHandler(request, body, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.write('User-agent: *\n');
  response.write('Disallow: /');
  response.end();
}

// -------------------------------------------------------------------------------------------------

Configuration.load('config.json').then(configuration => {
  server = new Server(configuration['bind_host'], configuration['bind_port']);

  server.registerHandler('/robots.txt', RobotHandler);

}).catch(error => console.error(error));
