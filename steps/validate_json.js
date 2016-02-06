// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Step = require('../components/step');

// Step for validating the syntax of the JSON files in the //data directory. These files have been
// extracted out from the gamemode to allow for easy editing, but remain a frequent source of issues
// because people blindly modify the files and don't test locally.
class ValidateJsonStep extends Step {
  constructor(service) {
    super(service, 'validate-json', 'Validate JSON files');
  }

  run() {
    return Promise.resolve();
  }
};

module.exports = ValidateJsonStep;
