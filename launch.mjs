#!/usr/bin/env node
import { spawn } from 'child_process';

const containerName = `docketeer_${(Math.random() + 1)
  .toString(36)
  .substring(7)}`;
const flags = process.argv.slice(2);
const image = process.env.DOCKETEER_IMAGE;
const execPath = process.env.DOCKETEER_EXEC_PATH;
const bindPort = process.env.DOCKETEER_BIND_PORT;

const docker = spawn(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    `--name=${containerName}`,
    `-p=${bindPort}:${bindPort}`,
    image,
    execPath,
    '--remote-debugging-address=0.0.0.0',
    ...flags,
  ],
  {
    // shell: process.env.SHELL,
    stdio: 'inherit',
  }
);

// Always kill the container when we're done if it's not already dead
process.on('exit', () => docker.kill());
process.on('SIGTERM', () => docker.kill());
