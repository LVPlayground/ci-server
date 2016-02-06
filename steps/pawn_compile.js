// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const Step = require('../components/step'),
      child_process = require('child_process'),
      path = require('path');

// Step for verifying that the Pawn portion of our gamemode continues to compile when the changes in
// the pull request have been applied. The compilation will happen asynchronously on the server.
class PawnCompileStep extends Step {
  constructor(service) {
    super(service, 'pawn-compile', 'Pawn compilation');
  }

  // Executes the step. Returns a promise that is to be resolved when the step is complete.
  run(log) {
    const compilerBinary = path.resolve('tools/lvpcc/pawncc'),
          scriptDirectory = path.join(this.directory, 'pawn'),
          scriptBinary = path.join(scriptDirectory, 'lvp.amx');

    const command = 'nice -n 19 ' + compilerBinary + ' lvp.pwn';
    return new Promise((resolve, reject) => {
      log('$ ' + command + '\n');

      const options = {
        cwd: scriptDirectory,
        timeout: 180000
      };

      console.log('$ ' + command);
      child_process.exec(command, options, (error, stdout, stderr) => {
        log(stdout); console.log(stdout);
        log(stderr); console.log(stderr);
        if (error)
          log(error); console.log(error);

        if (error) {
          this.setStatus(false, 'Found errors while trying to compile lvp.amx.');
          reject(new Error('Unable to compile lvp.amx: ' + error));
        } else {
          this.setStatus(true, 'Successfully compiled lvp.amx (xxx kB).');
          resolve();
        }

      });
    });
  }
};

module.exports = PawnCompileStep;
