#!/usr/bin/env node
import { spawn } from 'child_process';

const containerName = `docketeer_${(Math.random() + 1)
  .toString(36)
  .substring(7)}`;

const getRandomPort = () => {
  throw new Error(
    '--remote-debugging-port=0 is unsupported. Please pass an actual port or use --remote-debugging-pipe.'
  );
};

const flags = process.argv.slice(2);
const image = process.env.DOCKETEER_IMAGE;
const execPath = process.env.DOCKETEER_EXEC_PATH;
const bindPortFlag = flags
  .find((flag) => flag.startsWith('--remote-debugging-port='))
  ?.split('=')
  .pop()
  .replace(/^0$/, getRandomPort);

const docker = spawn(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    `--name=${containerName}`,
    ...(bindPortFlag ? [`-p=${bindPortFlag}:${bindPortFlag}`] : []),
    image,
    execPath,
    '--remote-debugging-address=0.0.0.0',

    // Pass in the flags specified by Puppeteer, but remove the --user-data-dir flag as a partial
    // workaround for https://github.com/andyearnshaw/docketeer/issues/1
    ...flags.filter((flag) => !flag.startsWith('--user-data-dir=')),
  ],
  {
    // shell: process.env.SHELL,
    stdio: 'inherit',
  }
);

// Always kill the container when we're done if it's not already dead
process.on('exit', () => docker.kill());
process.on('SIGTERM', () => docker.kill());
process.on('SIGINT', () => docker.kill());
