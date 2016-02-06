// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Step = require('../components/step'),
      fs = require('fs'),
      glob = require('glob'),
      path = require('path');

// Step for validating the syntax of the JSON files in the //data directory. These files have been
// extracted out from the gamemode to allow for easy editing, but remain a frequent source of issues
// because people blindly modify the files and don't test locally.
class ValidateJsonStep extends Step {
  constructor(service) {
    super(service, 'validate-json', 'Validate JSON files');

    this.successCount_ = 0;
    this.failureCount_ = 0;
  }

  // Executes the step. Returns a promise that is to be resolved when the step is complete.
  run(log) {
    const globOptions = { cwd: this.directory };

    return new Promise((resolve, reject) => {
      glob('**/*.json', globOptions, (error, files) => {
        if (error) {
          reject(new Error('Unable to validate JSON files: ' + error));
          return;
        }

        // Verify that all the files are valid JSON files. Invalid files will not reject the promise
        // and will instead mark the step as having failed.
        Promise.all(files.map(file => this.verifyFile(log, file))).then(() => {
          if (!this.failureCount_)
            this.setStatus(true, 'Validated ' + this.successCount_ + ' JSON files.');
          else
            this.setStatus(false, 'Validated ' + this.successCount_ + ' JSON files, failed ' + this.failureCount_ + '.');

          resolve();
        });
      });
    });
  }

  // Asynchronously verifies that |file| contains valid JSON data.
  verifyFile(log, file) {
    const resolvedPath = path.join(this.directory, file);

    return new Promise((resolve, reject) => {
      fs.readFile(resolvedPath, 'utf8', (error, data) => {
        if (error) {
          reject(new Error('Unable to read a JSON file: ' + error));
          return;
        }

        // Try to parse the data as JSON. If it succeeds, we're happy. Otherwise we're sad and we
        // have to mark the step as having failed.
        try {
          JSON.parse(data);

          log(file + ' contains valid JSON data.');
          this.successCount_++;
        } catch (e) {
          log(`<error>${file} contains invalid JSON data: ${e}</error>`);
          this.failureCount_++;
        }

        resolve();
      });
    });
  }
};

module.exports = ValidateJsonStep;
