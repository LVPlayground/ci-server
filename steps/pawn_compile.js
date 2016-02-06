// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Step = require('../components/step');

// Step for verifying that the Pawn portion of our gamemode continues to compile when the changes in
// the pull request have been applied. The compilation will happen asynchronously on the server.
class PawnCompileStep extends Step {
  constructor(service) {
    super(service, 'pawn-compile', 'Pawn compilation');
  }

  // Executes the step. Returns a promise that is to be resolved when the step is complete.
  run(log) {
    log('Not yet implemented.');
    return Promise.reject();
  }
};

module.exports = PawnCompileStep;
