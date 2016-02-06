// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Repository = require('./repository'),
      https = require('https'),
      url = require('url');

// Messages that will be shown on GitHub if a JavaScript error occurs while executing a step.
const BUILD_ERROR_MSG = 'An error occurred while executing this step.';

let buildAuthToken = null;
let buildEndpoint = null;
let buildSteps = [];

// The currently executing build. Because we use a single directory on the filesystem, the builds
// have to execute serially to prevent them from messing up each others files.
let currentBuildLock = Promise.resolve();

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
        .then(() => build.createLog(options.author, options.title, options.url))
        .then(() => build.acquireBuildLock())
        .then(() => build.updateRepository(options.diff, options.base))
        .then(() => build.runSteps())
        .catch(error => console.error(error))
        .then(() => build.releaseBuildLock());
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
  createLog(author, title, url) {
    return this.storage_.createBuild(this.sha_, { author, title, url });
  }

  // Updates the log entry for |step| with |status|. The |status| will be appended to whatever the
  // current log output for the |step| contains. Updates will be atomic.
  updateLog(step, status) {
    if (typeof status !== 'string')
      status = JSON.stringify(status);

    return this.storage_.updateLog(this.sha_, step, status);
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

  // Updates the local checkout to |base|, then applies |diffUrl| to the tree, which is a URL that
  // contains the patch difference between |base| and the pull request created by the author.
  updateRepository(diffUrl, base) {
    const repo = new Repository();

    const log = BuildService.prototype.updateLog.bind(this, 'update');

    return Promise.resolve()
        .then(() => this.updateLog('update', 'Update starting.'))
        .then(() => repo.updateTo(log, base))
        .then(() => repo.applyDiff(log, diffUrl))
        .then(() => this.updateLog('update', 'Update completed.'))
        .catch(error => {
          console.error(error);
          return Promise.all([
            this.updateLog('update', 'Error: ' + JSON.stringify(error)),
            Promise.reject(error)  // stop the build run
          ]);
        });
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
        .then(() => this.updateLog(step.id, 'Step starting.'))
        .then(() => this.updateStatus(step, 'pending', 'Pending.'))
        .then(() => step.run())
        .then(() => this.updateStatus(step, step.success ? 'success' : 'failure', step.status))
        .catch(error => {
          console.error(error);
          return Promise.all([
             this.updateStatus(step, 'error', BUILD_ERROR_MSG),
             this.updateLog(step.id, 'Error: ' + JSON.stringify(error))
          ]);
        })
        .then(() => this.updateLog(step.id, step.statusOutput()));
  }

  // Releases the build lock hold by the current build. May only be called once.
  releaseBuildLock() { this.releaseLock_(); }

  // Sends an update to |statusUrl_| to mention that |step| currently is at |status|. Mind that the
  // |status| has to be one of { pending, success, error, failure }.
  updateStatus(step, status, description) {
    console.log('Updating the status for ' + this.sha_ + ' (step: ' + step.id + '; status: ' + status + ')');

    return new Promise((resolve, reject) => {
      const requestData = {
        state: status,
        target_url: buildEndpoint + '/build/' + this.sha_ + '/' + step.id,
        description: description,
        context: step.name
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
