// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const fs = require('fs');

// Utility class for asynchronously loading a configuration file, returning a promise for easy
// observation of the success and failure cases of the process.
class Configuration {
  static load(filename) {
    return Promise.resolve(filename)
               .then(Configuration.confirmFileExists)
               .then(Configuration.readFile)
               .then(Configuration.parseFile);
  }

  // Confirms that |filename| exists on the filesystem.
  static confirmFileExists(filename) {
    return new Promise((resolve, reject) =>
        fs.access(filename, fs.R_OK, error => error ? reject('Invalid filename') : resolve(filename)));
  }

  // Reads the contents of |filename| and resolves the promise with the result.
  static readFile(filename) {
    return new Promise((resolve, reject) =>
        fs.readFile(filename, 'utf8', (error, data) => error ? reject('Unable to read file') : resolve(data)));
  }

  // Parses the |content| as JSON and returns the JavaScript object.
  static parseFile(content) {
    return Promise.resolve().then(() => JSON.parse(content));
  }
};

module.exports = Configuration;
