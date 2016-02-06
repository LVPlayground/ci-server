// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const https = require('https'),
      url = require('url');

// Messages that will be included for GitHub build status updates.
const BUILD_STARTED_MSG = 'The build has been started.',
      BUILD_SUCCEEDED_MSG = 'The build has succeeded.',
      BUILD_ERROR_MSG = 'The build could not be completed.';

let buildAuthToken = null;
let buildEndpoint = null;
let buildSteps = [];

// The currently executing build. Because we use a single directory on the filesystem, the builds
// have to execute serially to prevent them from messing up each others files.
let currentBuildLock = Promise.resolve();

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
  // Registers |endpoint| as the public build output endpoint for the service, and |authToken| as
  // the token that will be used for authenticating against the GitHub API.
  static registerConfiguration(endpoint, authToken) {
    buildEndpoint = endpoint;
    buildAuthToken = authToken;
  }

  // Registers a new |step| with the build service.
  static registerStep(step) {

  }

  // Triggers a build with the build service. The |options| dictionary is expected to have the
  // following members: { sha, author, title, url, statusUrl, diff, base: { branch, sha } }.
  static trigger(storage, options) {
    const build = new BuildService(storage);

    return Promise.resolve()
        .then(() => build.createLog(options.sha, options.author, options.title, options.url))
        .then(() => build.updateStatus(options.statusUrl, options.sha, 'pending', BUILD_STARTED_MSG))
        .then(() => build.acquireBuildLock())
        .then(() => wait(20000))
        .then(() => build.updateStatus(options.statusUrl, options.sha, 'success', BUILD_SUCCEEDED_MSG))
        .catch(error => {
           build.updateStatus(options.statusUrl, options.sha, 'error', BUILD_ERROR_MSG);
           console.error(error)
         })
        .then(() => build.releaseBuildLock());

    // TODO: Update the repository based on |options.base| and apply the |options.diff|.
    // TODO: Execute each of the registered steps.
  }

  // -----------------------------------------------------------------------------------------------

  constructor(storage) {
    this.releaseLock_ = null;
    this.storage_ = storage;
  }

  // Creates a new log entry with the given properties. The "log" property will be set to in-
  // progress, and can be updated with new information after each step.
  createLog(sha, author, title, url) {
    return this.storage_.createBuild(sha, { author, title, url });
  }

  // Waits for the previous build to complete and then acquires a build lock ourselves, that won't
  // be released until the other build steps of the current run have been completed.
  acquireBuildLock() {
    const currentBuild = currentBuildLock;

    // Chain a new promise after the current build lock, storing |releaseLock_| as the tool to
    // release it enabling the next build to start.
    currentBuildLock = currentBuild.then(() => new Promise(resolve => this.releaseLock_ = resolve));

    return currentBuild;
  }

  // Releases the build lock hold by the current build. May only be called once.
  releaseBuildLock() { this.releaseLock_(); }

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
      requestOptions.method = 'POST';
      requestOptions.headers = {
        'Authorization': 'token ' + buildAuthToken,
        'User-Agent': 'LVPlayground/ci-server'
      };

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
