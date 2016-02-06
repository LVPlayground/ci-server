// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Authentication = require('./components/authentication'),
      BuildService = require('./components/build_service'),
      BuildStorage = require('./components/build_storage'),
      Configuration = require('./components/configuration'),
      Server = require('./components/server');

// Register the build steps required to provide verification for Las Venturas Playground.
BuildService.registerSteps([
    /* Validate JSON */    require('./steps/validate_json'),
    /* Pawn compilation */ require('./steps/pawn_compile'),
    /* JavaScript tests */ require('./steps/javascript_tests')
]);

// Variables that will be available after the configuration is available.
let authentication = null;
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
      response.write(`<li>[${build.date}] <b>${build.author}</b>: `);
      response.write(`<a href="${build.url}">${build.title}</a> `);
      response.write(`(<a href="/build/${build.sha}/update">log</a>)</li>`);
    }

    response.write('</ul>');
    response.end();
    return;
  }

  const chunks = request.url.substr(7).split('/');

  // Asynchronously retrieve the build information from the filesystem. |build| being set to NULL
  // indicates that the build could not be found for some reason.
  return storage.getBuild(chunks[0]).then(build => {
    if (!build || chunks.length != 2 || !build.hasOwnProperty(chunks[1])) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end();
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html' });

    // Create a header at the top of the page with links to the other log files associated with this
    // SHA. Anything but the blacklist below will be explicitly linked.
    const steps = Object.keys(build).filter(step => ['author', 'title', 'url', 'date', 'log'].indexOf(step) == -1);
    const headers = steps.map(step => `<a href="/build/${chunks[0]}/${step}">${step}</a>`);
    
    response.write('<style>error { color: red; font-weight: bold; }</style>');
    response.write(headers.join(' - ') + '<hr><pre>');

    response.end(build[chunks[1]]);
  });
}

// Handler for pushes coming from GitHub Web hooks. After authentication, these will trigger a build
// on the continuous integration testing system.
function PushHandler(request, body, response) {
  return authentication.verify(request, body).then(error => {
    if (error) {
      response.writeHead(401, { 'Content-Type': 'text/plain' });
      response.end();
      return;
    }

    // Authentication has succeeded! Now that we know that the request is coming from GitHub, we
    // can figure out what has to happen with the request. Only the "pull_request" event is handled.
    if (request.headers['x-github-event'] != 'pull_request') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('Event skipped.');
      return;
    }

    // Decode the request's |body| as JSON. If the body cannot be decoded as valid JSON we issue a
    // HTTP 400 Bad Request response, as something went wrong on GitHub's side.
    let options = null;
    try {
      options = JSON.parse(body);

    } catch (e) { console.error(e); }

    if (!options) {
      response.writeHead(400, { 'Content-Type': 'text/plain' });
      response.end();
      return;
    }

    // The request has been received in proper shape. Immediately close the connection with the
    // GitHub push service as we don't need it anymore.
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Event handled.');

    // Now trigger the build service with the change's information. The build service also needs
    // access to the build storage, as that's where data will be stored.
    const pullRequest = options.pull_request;

    console.log('[' + request.socket.remoteAddress + '] Triggering a build for PR #' + pullRequest.number);

    BuildService.trigger(storage, {
      sha: pullRequest.head.sha,

      author: pullRequest.user.login,
      title: pullRequest.title,
      url: pullRequest.html_url,

      statusUrl: pullRequest.statuses_url,
      diff: pullRequest.diff_url,
      base: {
        branch: pullRequest.base.ref,
        sha: pullRequest.base.sha
      }

    }).then(() =>
        console.log('[' + request.socket.remoteAddress + '] Build finished for PR #' + pullRequest.number));
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

Configuration.load('config.json').then(config => {
  authentication = new Authentication(config['secret']);

  server = new Server(config['bind_host'], config['bind_port']);

  server.registerHandler('/build', BuildHandler);
  server.registerHandler('/push', PushHandler);
  server.registerHandler('/robots.txt', RobotHandler);

  storage = new BuildStorage(config['storage_path']);

  BuildService.registerConfiguration(config['endpoint'], config['oauth_token']);

}).catch(error => console.error(error));
