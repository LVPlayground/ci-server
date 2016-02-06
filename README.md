# LVP Continuous Integration Server
In an effort to make contributing to Las Venturas Playground easier, a continuous build server is
available that validates all incoming pull requests.

The server has been written using [Node.js](https://nodejs.org), and is designed to be modular and
easy to understand, maintain and update.

## Installation
In order to install the continuous integration server, clone the repository in the same directory
that also has checkouts of the [playground](https://github.com/LVPlayground/playground) and
[playgroundjs-plugin](https://github.com/LVPlayground/playgroundjs-plugin) repositories:

```
$ mkdir playground && cd playground
$ git clone https://github.com/LVPlayground/playground.git
$ git clone https://github.com/LVPlayground/playgroundjs-plugin.git
$ git clone https://github.com/LVPlayground/ci-server.git
```

These repositories contain the necessary Linux binaries for the basic checks to be executable.

**TODO**: This doesn't give us the Pawn compiler, necessary to verify that lvp.ppr builds.

Finally, copy [config-example.json](config-example.json) to _config.json_ and change the settings
to your likings. We recommend choosing a secure secret of at least 16 characters in length.

## Running the continuous integration server
The server has been designed to work with [Node.js](https://nodejs.org) 5.5 and beyond. Run the
server using the following command:

```
$ nodejs index.js
```

In practice, you'll want to run the process in the background, using an isolated user account.

## Setting up the server with GitHub
Navigate to your GitHub project's settings and create a new Webhook with the following settings:

- **Payload URL**: http://your.server:1234/push
- **Content Type**: application/json
- **Secret**: The secret value in your configuration file.
- **Events**: Only the _pull_request_ event.
- **Active**: Yes.

The Webhook console will give you diagnostical output of the CI server. Please file any issues
on this repository and we'll look into them.

## Request handlers
The continuous integration server respects the following handlers:

- **/build/_SHA_**: Build logs for the build with the given _SHA_.
- **/build**: Overview of the last ten build attempts.
- **/push**: Execution point for requests coming from GitHub.
- **/robots.txt**: Textual output to prevent indexing.
