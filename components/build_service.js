// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const https = require('https'),
      url = require('url');

// Messages that will be included for GitHub build status updates.
const BUILD_STARTED_MSG = 'The build has been started.',
      BUILD_SUCCEEDED_MSG = 'The build has succeeded!';

let buildEndpoint = null;
let buildSteps = [];

function wait(time) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), time);
  });
}

// The build service will actually execute the steps required in order to run the build. Each step
// is represented by a BuildStep instance that must be be registered before first use.
//
// In order for statuses on GitHub to not be stuck in the `pending` state, it is important that the
// service is defensively designed to protect against rogue or timing out build steps.
class BuildService {
  // Registers |endpoint| as the public build output endpoint for the service.
  static registerEndpoint(endpoint) {
    buildEndpoint = endpoint;
  }

  // Registers a new |step| with the build service.
  static registerStep(step) {

  }

  // Triggers a build with the build service. The |options| dictionary is expected to have the
  // following members: { sha, author, title, url, statusUrl, diff, base: { branch, sha } }.
  static trigger(storage, options) {
    const build = new BuildService(storage);

    Promise.resolve()
           .then(() => build.createLog(options.sha, options.author, options.title, options.url))
           .then(() => build.updateStatus(options.statusUrl, options.sha, 'pending', BUILD_STARTED_MSG))
           .then(() => wait(20000))
           .then(() => build.updateStatus(options.statusUrl, options.sha, 'success', BUILD_SUCCEEDED_MSG))
           .catch(error => console.error(error));

    // TODO: Execute each of the registered steps.
  }

  // -----------------------------------------------------------------------------------------------

  constructor(storage) {
    this.storage_ = storage;
  }

  // Creates a new log entry with the given properties. The "log" property will be set to in-
  // progress, and can be updated with new information after each step.
  createLog(sha, author, title, url) {
    return this.storage_.createBuild(sha, { author, title, url });
  }

  // Sends an update to |statusUrl| to mention that we're currently at |status|. Mind that the
  // |status| has to be one of { pending, success, error, failure }.
  updateStatus(statusUrl, sha, status, description) {
    return new Promise((resolve, reject) => {
      const requestData = {
        state: status,
        target_url: buildEndpoint + '/build/' + sha,
        description: description,
        context: 'LVPlayground/ci-server'
      };

      let requestOptions = url.parse(statusUrl);
      requestOptions.headers = {
        'User-Agent': 'LVPlayground/ci-server'
      };
      requestOptions.method = 'POST';

      const request = https.request(requestOptions, response => {
        if (response.statusCode != 201) {
          reject(new Error('Unable to update the GitHub issue status.'));
          return;
        }

        resolve();
      });

      request.write(JSON.stringify(requestData));
      request.end();
    });
  }
};

module.exports = BuildService;
