#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const imgArgIndex = args.findIndex((arg) => !arg.startsWith('--'));
const dockerImage =
  process.env.DOCKETEER_IMAGE || args.slice(imgArgIndex, imgArgIndex + 1)[0];
const script = args.slice(imgArgIndex + (process.env.DOCKETEER_IMAGE ? 0 : 1));

const docketeerArgs = args.slice(0, imgArgIndex);
const parseArg = (name, envVar, fallback) =>
  docketeerArgs
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split('=')
    .pop() ||
  process.env[envVar] ||
  fallback;

const execPath = parseArg('exec-path', 'DOCKETEER_EXEC_PATH', 'google-chrome');

// Fetch the image first so that it doesn't get caught by Puppeteer's timeout
const pull = spawnSync(`docker`, ['pull', dockerImage], {
  shell: process.env.SHELL,
  stdio: 'inherit',
});

if (pull.status > 0) {
  console.error(`docker pull exited with code ${pull.status}`);
  process.exit(1);
}

// Now execute the script with some special environment variables set
spawnSync(script[0], script.slice(1), {
  shell: process.env.SHELL,
  stdio: 'inherit',
  env: {
    ...process.env,

    // A little trick for Node scripts to send control codes even if they're not in a TTY
    FORCE_COLOR: 'true',

    // This tricks Puppeteer into launching our script instead
    PUPPETEER_EXECUTABLE_PATH: path.resolve(__dirname, './launch.mjs'),

    // These are used as arguments to docker run
    DOCKETEER_IMAGE: dockerImage,
    DOCKETEER_EXEC_PATH: execPath,

    // This is just helpful for your scripts so you can set your hostname to host.docker.internal
    DOCKETEER_ENABLED: 'true',
  },
});
