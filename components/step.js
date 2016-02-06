// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

// Base class for a build step. Holds information about the current step and provides convenience
// methods for updating the status of the step through the build service.
class Step {
  constructor(service, name) {
    this.service_ = service;
    this.name_ = name;

    this.success_ = true;
    this.status_ = 'Unknown';
  }

  // Returns the name of this step. Read-only after construction.
  get name() { return this.name_; }

  // Returns whether the step was executed successfully.
  get success() { return this.success_; }

  // Returns the current status of this step. Only writable for the step implementation.
  get status() { return this.status_; }

  // Executes the actual step. Default implementation will error to signal that the method must be
  // implemented by the actual step in order to provide functionality.
  run() { return Promise.reject(); }
};

module.exports = Step;
