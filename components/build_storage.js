// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

const fs = require('fs'),
      path = require('path');

// The build storage provides the ability to read, write and index the builds known by this server.
// All operations will be done on the filesystem, and thus have to be asynchronous.
class BuildStorage {
  constructor(path) {
    this.path_ = path;
    this.latestBuilds_ = [];

    // There may be a few seconds after server-boot where the latest build information is not
    // available, bot honestly we can survive that race condition.
    this.determineLatestBuilds();
  }

  // Determines the ten most recent builds handled by the continuous integration server and writes
  // them to the |latestBuilds_| member. This will be determined based on file modification time.
  determineLatestBuilds() {
    fs.readdir(this.path_, (error, filenames) => {
      if (error) {
        console.error(error);
        return;
      }

      // Convert the array |filenames| to promises that load the modification time.
      const timePromii = filenames.map(filename => this.determineFileModificationTime(filename));
      Promise.all(timePromii).then(files => {
        // Sort the list of files by their last modification time. We only care about the ten most
        // recent files that were written to in the directory.
        files.sort((lhs, rhs) => {
          if (!lhs) return -1;
          if (!rhs) return 1;

          return rhs[1] - lhs[1];
        });

        // Read the meta data for the first ten files in the |files| array, and store the result in
        // the |this.latestBuilds_| member for future synchronous access.
        const readPromii = files.slice(0, 10).map(file => this.readFileMetaData(file[0]));
        Promise.all(readPromii).then(builds =>
            this.latestBuilds_ = builds);
      });
    });
  }

  // Returns a promise that will be resolved when the file modification time of |filename| has been
  // determined. This method accesses the filesystem and thus is asynchronous.
  determineFileModificationTime(filename) {
    return new Promise(resolve => {
      fs.stat(path.join(this.path_, filename), (error, stats) =>
          error ? resolve(null) : resolve([ filename, stats.mtime ]));
    });
  }

  // Returns a promise that will be resolved when the contents of the file have been read, and the
  // metadata stored in |filename| can be returned as desired.
  readFileMetaData(filename) {
    return new Promise(resolve => {
      fs.readFile(path.join(this.path_, filename), 'utf8', (error, data) => {
        const build = this.readBuildFromData(error, data);
        if (build)
          resolve({ sha: filename, date: build.date, author: build.author, title: build.title, url: build.url });
        else
          resolve(null);
      });
    });
  }

  // Safely interprets |data| as a build output file. If |error| is set, it will be assumed that the
  // value of |data| should not be considered.
  readBuildFromData(error, data) {
    if (error)
      return null;

    // If the |data| cannot be parsed as JSON data, an exception will be written to the console and
    // NULL will be returned instead, behaving as if the file does not exist.
    try {
      return JSON.parse(data);

    } catch (e) { console.error(e); }

    return null;
  }

  // Returns an array with the 10 most recent builds on the server. This method is synchronous as
  // it will be initialized once on server load, and updated on modification.
  getLatestBuilds() {
    return this.latestBuilds_;
  }

  // Returns whether |sha| represents a valid git commit hash.
  verifySha(sha) {
    return /^[a-zA-Z0-9]{40}$/.test(sha);
  }

  // Returns a promise that will resolve with the build information about the build identified by
  // |sha| when this has been loaded from the filesystem. The promise will be resolved with NULL if
  // the |sha| is invalid, or if the build can not be found on the operating system.
  getBuild(sha) {
    return new Promise(resolve => {
      // (1) Verify that the given |sha| has been appropriately formatted.
      if (!this.verifySha(sha)) {
        resolve(null);
        return;
      }

      // (2) Asynchronously load the file from disk. If |error| is set, the file either does not
      // exist or is not writable by this process. Otherwise the |data| is available.
      fs.readFile(path.join(this.path_, sha), 'utf8', (error, data) =>
          resolve(this.readBuildFromData(error, data)));
    });
  }

  // Creates a new build file on the filesystem with the given information. Additionally, the list
  // of recent builds will be updated to include the given information.
  createBuild(sha, data) {
    return new Promise((resolve, reject) => {
      // (1) Verify that the given |sha| has been appropriately formatted.
      if (!this.verifySha(sha)) {
        reject(new Error('The given |sha| has not been formatted correctly.'));
        return;
      }

      // (2) Append the `log` and the `date` fields to the |data| section.
      data.date = new Date().toISOString().split('T')[0];
      data.log = 'Build started...';

      // (3) Asynchronously write the data to disk. Resolve the promise when done.
      fs.writeFile(path.join(this.path_, sha), JSON.stringify(data), error =>
          error ? reject('Unable to write a file to disk') : resolve(data));

    }).then(data => {
      // (4) Include the `sha` in the data.
      data.sha = sha;

      // (5) Make sure that the build is included in the latest build section, but only after
      // checking that it hasn't already been included.
      for (const build of this.latestBuilds_) {
        if (build.sha == sha)
          return;
      }

      this.latestBuilds_.unshift(data);
      while (this.latestBuilds_.length > 10)
        this.latestBuilds_.pop();
    })
  }
};

module.exports = BuildStorage;
