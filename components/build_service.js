// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

let buildSteps = [];

// The build service will actually execute the steps required in order to run the build. Each step
// is represented by a BuildStep instance that must be be registered before first use.
//
// In order for statuses on GitHub to not be stuck in the `pending` state, it is important that the
// service is defensively designed to protect against rogue or timing out build steps.
class BuildService {
  // Registers a new |step| with the build service.
  static registerStep(step) {

  }

  // Triggers a build with the build service. The |options| dictionary is expected to have the
  // following members: { sha, author, title, url, diff, base: { branch, sha } }.
  static trigger(storage, options) {
    const build = new BuildService(storage);

    Promise.resolve()
           .then(() => build.createLog(options.sha, options.author, options.title, options.url))
           .catch(error => console.error(error));

    // TODO: Update GitHub status to "pending".
    // TODO: Execute each of the registered steps.
    // TODO: Update GitHub status to "success" or "failure".
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
};

module.exports = BuildService;
