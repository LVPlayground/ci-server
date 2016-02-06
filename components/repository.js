// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const child_process = require('child_process'),
      path = require('path');

// Class representing the `playground` repository in the parent directory of this tool, on which the
// continuous integration checks will take place.
class Repository {
  // Returns the absolute path to the repository's directory.
  get directory() { return path.resolve('../playground'); }

  // Executes |command| asynchronously on the directory of the repository. Both the command and the
  // output of the command will be written to the log file.
  executeCommand(log, command) {
    return new Promise((resolve, reject) => {
      log('$ ' + command + '\n');

      const options = {
        cwd: this.directory,
        timeout: 30000
      };

      console.log('$ ' + command);
      child_process.exec(command, options, (error, stdout, stderr) => {
        log(stdout); console.log(stdout);
        log(stderr); console.log(stderr);
        if (error)
          log(error); console.log(error);

        if (error)
          reject(new Error('Unable to execute command: ' + command));
        else
          resolve();
      });
    });
  }

  // Resets the current state of the repository, then updates it to |base|. Since this touches the
  // filesystem it happens asynchronously. We first fetch all latest information for the repository,
  // reset to a neutral state, then remove all files (including untracked files and changes to the
  // .gitignore file), check out the appropriate branch and then update to the base revision.
  updateTo(log, base) {
    const commands = [
      'git fetch -a',
      'git reset --hard',
      'git clean -f -d -x', 
      'git checkout ' + base.branch,
      'git reset --hard ' + base.sha
    ];

    let queue = Promise.resolve();
    commands.forEach(command =>
        queue = queue.then(() => this.executeCommand(log, command)));

    return queue;
  }

  // Applies the PR's diff to the repository. The |diffUrl| will be fetched from the network by the
  // command we use to apply it. This method returns a promise because it happens asynchronously.
  applyDiff(log, diffUrl) {
    console.log(diffUrl);
    return Promise.resolve();
  }
};

module.exports = Repository;
