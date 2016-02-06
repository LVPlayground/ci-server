// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Step = require('../components/step'),
      child_process = require('child_process'),
      path = require('path');

// Step for verifying that the JavaScript portion of our gamemode continues to compile and be able
// to execute all tests included in the source.
class JavaScriptTestsStep extends Step {
  constructor(service) {
    super(service, 'javascript-compile', 'JavaScript tests');
  }

  // Executes the step. Returns a promise that is to be resolved when the step is complete.
  run(log) {
    const serverDirectory = path.resolve('../server'),
          testRunnerDirectory = path.resolve('../playgroundjs-plugin/src/out'),
          testRunner = path.join(testRunnerDirectory, 'test_runner');

    const command = `LD_LIBRARY_PATH=${testRunnerDirectory} ${testRunner}`;
    return new Promise((resolve, reject) => {
      log('$ ' + command + '\n');

      const options = {
        cwd: serverDirectory,
        timeout: 30000
      };

      console.log('$ ' + command);
      child_process.exec(command, options, (error, stdout, stderr) => {
        log(stdout); console.log(stdout);
        log(stderr); console.log(stderr);
        if (error)
          log(error); console.log(error);

        if (error)
          this.setStatus(false, 'Found errors while testing the JavaScript code.');
        else
          this.setStatus(true, 'Successfully tested the JavaScript code.');

        resolve();
      });
    });
  }
};

module.exports = JavaScriptTestsStep;
