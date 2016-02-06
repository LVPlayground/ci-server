// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const BuildStorage = require('./components/build_storage'),
      Configuration = require('./components/configuration'),
      Server = require('./components/server');

// Variables that will be available after the configuration is available.
let server = null;
let storage = null;

// -------------------------------------------------------------------------------------------------

// Handler for the /build path, which shares a list of most recent builds or the build output of
// a specific build when the associated SHA has been included in the request's URL.
function BuildHandler(request, body, response) {
  if (request.url.length <= 7 /** len(/build/) **/) {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.write('<h1>Most recent builds</h1>');
    response.write('<ul>');

    for (const build of storage.getLatestBuilds()) {
      response.write(`<li>[${build.date.substr(0, 10)}] <b>${build.author}</b>: `);
      response.write(`<a href="${build.url}">${build.title}</a> `);
      response.write(`(<a href="/build/${build.sha}">log</a>)</li>`);
    }

    response.write('</ul>');
    response.end();
    return;
  }

  // Asynchronously retrieve the build information from the filesystem. |build| being set to NULL
  // indicates that the build could not be found for some reason.
  return storage.getBuild(request.url.substr(7)).then(build => {
    if (!build) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end();
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end(build.log);
  });
}

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

  server.registerHandler('/build', BuildHandler);
  server.registerHandler('/robots.txt', RobotHandler);

  storage = new BuildStorage(configuration['storage_path']);

}).catch(error => console.error(error));
