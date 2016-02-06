// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

'use strict';

// Class representing the `playground` repository in the parent directory of this tool, on which the
// continuous integration checks will take place.
class Repository {
  // Resets the current state of the repository, then updates it to |base|. Since this touches the
  // filesystem it happens asynchronously.
  updateTo(base) {
    console.log(base);
    return Promise.resolve();
  }

  // Applies the |diff| to the repository. The |diff| must have been fetched from the network. This
  // method returns a promise because it also happens asynchronously.
  applyDiff(diff) {
    console.log(diff);
    return Promise.resolve();
  }
};

module.exports = Repository;
