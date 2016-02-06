// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const https = require('https'),
      url = require('url');

// Messages that will be shown on GitHub if a JavaScript error occurs while executing a step.
const BUILD_ERROR_MSG = 'An error occurred while executing this step.';

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

  // Registers the new |steps| with the build service. Each individual step must be passed as an
  // entry in the |steps| array, with the value being a constructor extending from Step.
  static registerSteps(steps) {
    buildSteps = steps;
  }

  // Triggers a build with the build service. The |options| dictionary is expected to have the
  // following members: { sha, author, title, url, statusUrl, diff, base: { branch, sha } }.
  static trigger(storage, options) {
    const build = new BuildService(storage, options.statusUrl, options.sha);

    return Promise.resolve()
        .then(() => build.createLog(options.sha, options.author, options.title, options.url))
        .then(() => build.acquireBuildLock())
        .then(() => build.runSteps())
        .catch(error => console.error(error))
        .then(() => build.releaseBuildLock());

    // TODO: Update the repository based on |options.base| and apply the |options.diff|.
    // TODO: We probably want to have more excessive error handling in here.
  }

  // -----------------------------------------------------------------------------------------------

  constructor(storage, statusUrl, sha) {
    this.releaseLock_ = null;
    this.storage_ = storage;

    this.statusUrl_ = statusUrl;
    this.sha_ = sha;
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

  // Runs the build steps registered with the Build Service in parallel. Build steps are expected to
  // not update touch the file system. Build log updates will be done atomically.
  runSteps() {
    return Promise.all(buildSteps.map(step => this.runStep(new step(this))));
  }

  // Runs an individual build |step| asynchronously. Each step will register its own status with the
  // GitHub statuses API, so will show up as its own row in the process.
  runStep(step) {
    return Promise.resolve()
               .then(() => this.updateStatus(step.name, 'pending', 'Pending.'))
               .then(() => step.run())
               .then(() => this.updateStatus(step.name, step.success ? 'success' : 'failure', step.status))
               .catch(error => {
                  this.updateStatus(step.name, 'error', BUILD_ERROR_MSG);
                  console.error(error);
                });

    // TODO: Create a build log entry specific to this step.
    // TODO: Execute the actual step.
  }

  // Releases the build lock hold by the current build. May only be called once.
  releaseBuildLock() { this.releaseLock_(); }

  // Sends an update to |statusUrl_| to mention that |step| currently is at |status|. Mind that the
  // |status| has to be one of { pending, success, error, failure }.
  updateStatus(step, status, description) {
    return new Promise((resolve, reject) => {
      const requestData = {
        state: status,
        target_url: buildEndpoint + '/build/' + this.sha_,
        description: description,
        context: step
      };

      let requestOptions = url.parse(this.statusUrl_);
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
