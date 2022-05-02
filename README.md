# Docketeer

Docketeer allows you to run your Puppeteer scripts on your host machine whilst launching the browser
in a docker container. This is particularly useful when you need to have a consistent environment
regardless of the host machine running the scripts. For example, if you are running visual snapshot
tests on macOS when your build pipeline runs them in Linux.

## Usage

```
docketeer [--exec-path=<browser_bin>] [--bind-port=<port>] <docker_image> <command>
```

Simply prefix your usual command with docketeer via `npx`, `pnpx` or whatever the hell Yarn's
equivalent is:

```
npx docketeer npm test
```

You will also need to tweak your server to bind to `host.docker.internal`. An environment variable,
`DOCKETEER_ENABLED`, is provided for easy transition in your configs. For example, this is how you might
change your Storybook Storyshots puppeteer config:

```javascript
  test: puppeteerTest({
    testTimeout: 600000,
    setupTimeout: 600000,
    storybookUrl: process.env.DOCKETEER_ENABLED ? "http://host.docker.internal:9003" : "http://localhost:9003",
    
    // ...
  })
```

## Options

| Option               | Env                   | Description                                         | Default                     |
| :------------------: | :-------------------: | :-------------------------------------------------- | :-----:                     |
| `<docker_image>`     | `DOCKETEER_IMAGE`     | The docker image for the browser you want to launch | `browserless/chrome:latest` |
| `--exec-path=<path>` | `DOCKETEER_EXEC_PATH` | Path to the browser binary inside the docker image  | `google-chrome`             |
| `--bind-port=<port>` | `DOCKETEER_BIND_PORT` | The port that puppeteer will connect to             | `9222`                      |

## Why

A lot of guides recommend two approaches when it comes to running Puppeteer via docker:

 * Use `docker run` to run your scripts with the local files mounted inside the docker container.
   For certain test runners (e.g. Karma), this may mean compilation happens inside the container and
   this can be slow. It also means that native modules may not work correctly, and the image has
   to be rebuilt every time you upgrade Node locally for new features.
 * Run something like Browserless and change your scripts to use `puppeteer.attach()` instead of
   `puppeteer.launch()`. This usually means changing your workflow entirely, or maintaining two
   separate approaches, one for local and one for your build pipeline.

With the mounting approach, here's how long it takes to run our Storybook Storyshots visual snapshot
tests with a mounted volume on macOS:

```
$ time docker run \
	-it \
	--rm \
	--name ads \
	--workdir=/repo \
	--mount type=bind,source="$(currentDir)",target=/repo node-with-chrome-and-node-gyp:0.0.1 \
	pnpm visual-snapshot

...
________________________________________________________
Executed in   21.44 mins      fish           external
   usr time  437.04 millis    0.16 millis  436.89 millis
   sys time  483.23 millis    1.56 millis  481.67 millis

```

And here's how long it takes using Docketeer:
```
$ time npx docketeer --exec-path=chromium-browser node-with-chrome-and-node-gyp:0.0.1 pnpm visual-snapshot

...
________________________________________________________
Executed in  387.92 secs      fish           external
   usr time  556.42 millis  114.00 micros  556.31 millis
   sys time  405.67 millis  629.00 micros  405.04 millis
```

That's a saving of over 15 minutes! 
