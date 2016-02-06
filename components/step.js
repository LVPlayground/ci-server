// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

// Base class for a build step. Holds information about the current step and provides convenience
// methods for updating the status of the step through the build service.
class Step {
  constructor(service, id, name) {
    this.service_ = service;
    this.id_ = id;
    this.name_ = name;

    this.success_ = true;
    this.status_ = 'Unknown';

    this.start_ = new Date().getTime();
  }

  // Id of the step. Will be used as an identifier in the URL when requesting log output.
  get id() { return this.id_; }

  // Returns the name of this step. Read-only after construction.
  get name() { return this.name_; }

  // Returns whether the step was executed successfully.
  get success() { return this.success_; }

  // Returns the current status of this step. Only writable for the step implementation.
  get status() { return this.status_; }

  // Creates a textual description of whether or not the step was executed successfully.
  statusOutput() {
    const executionTime = ((new Date().getTime()) - this.start_) / 1000;

    let output = '\n\n';
    output += 'Step finished (took ' + executionTime + ' seconds); ';
    output += this.success_ ? 'success! ' : 'failure! ';
    output += this.status_;

    return output;
  }

  // Executes the actual step. Default implementation will error to signal that the method must be
  // implemented by the actual step in order to provide functionality.
  run() { return Promise.reject(); }
};

module.exports = Step;
