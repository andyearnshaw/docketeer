import { jest } from '@jest/globals';
import { spawn } from 'child_process';

const dockerArgs = ['run', '--rm', '--init'];
const arraySlice = Array.prototype.slice;

describe('docker launcher', () => {
  const getDockerImageIndex = (params) =>
    1 + params.slice(1).findIndex((param) => !String(param).startsWith('-'));

  const getDockerFlags = (params) =>
    params.slice(1, getDockerImageIndex(params));

  const getExecFlags = (params) =>
    params.slice(getDockerImageIndex(params) + 2);

  const execute = async ({ env = {}, args = [] }) => {
    const oldArgv = process.argv;
    const oldEnv = process.env;

    try {
      process.argv = ['node', 'launch.mjs', ...args];
      process.env = env;
      await import(`./launch.mjs?${Math.random() * 100000}`);
    } finally {
      process.env = oldEnv;
      process.argv = oldArgv;
    }
  };

  afterEach(() => {
    jest.restoreAllMocks();
    process.removeAllListeners('exit');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  it('executes docker run with the --rm and --init flags', async () => {
    await execute({});

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith('docker', expect.any(Array), {
      stdio: 'inherit',
    });

    const params = spawn.mock.calls[0][1];
    const dockerFlags = getDockerFlags(params);
    expect(params[0]).toEqual('run');
    expect(dockerFlags).toContain('--rm');
    expect(dockerFlags).toContain('--init');
  });

  it('uses a random container name prefixed with "docketeer_"', async () => {
    const nameRegex = /^--name=docketeer_(\w+)/;
    await execute({});
    expect(spawn).toHaveBeenCalledTimes(1);

    const dockerFlags1 = getDockerFlags(spawn.mock.calls[0][1]);
    expect(dockerFlags1).toContainEqual(expect.stringMatching(nameRegex));

    const id1 = RegExp.$1;
    await execute({});
    expect(spawn).toHaveBeenCalledTimes(2);

    const dockerFlags2 = getDockerFlags(spawn.mock.calls[0][1]);
    expect(dockerFlags2).toContainEqual(expect.stringMatching(nameRegex));

    const id2 = RegExp.$2;
    expect(id1).not.toEqual(id2);
  });

  it('binds to the port provided by the DOCKETEER_BIND_PORT env var', async () => {
    await execute({
      env: {
        DOCKETEER_BIND_PORT: '3000',
      },
    });

    expect(spawn).toHaveBeenCalledTimes(1);

    const params = spawn.mock.calls[0][1];
    const dockerFlags = getDockerFlags(params);
    expect(dockerFlags).toContain('-p=3000:3000');
  });

  it('runs using the image from the DOCKETEER_IMAGE env var', async () => {
    await execute({
      env: {
        DOCKETEER_IMAGE: 'browserless/chrome',
      },
    });

    expect(spawn).toHaveBeenCalledTimes(1);

    const params = spawn.mock.calls[0][1];
    const image = params[getDockerImageIndex(params)];
    expect(image).toBe('browserless/chrome');
  });

  it('uses the DOCKETEER_EXEC_PATH env var for the executable in the container', async () => {
    await execute({
      env: {
        DOCKETEER_EXEC_PATH: 'chromium-browser',
      },
    });

    expect(spawn).toHaveBeenCalledTimes(1);

    const params = spawn.mock.calls[0][1];
    const execPath = params[getDockerImageIndex(params) + 1];
    expect(execPath).toBe('chromium-browser');
  });

  it('sets the --remote-debugging-address chrome flag to 0.0.0.0', async () => {
    await execute({});

    expect(spawn).toHaveBeenCalledTimes(1);

    const params = spawn.mock.calls[0][1];
    const browserFlags = getExecFlags(params);
    expect(browserFlags).toContain('--remote-debugging-address=0.0.0.0');
  });

  it('passes any additional args to the target executable', async () => {
    await execute({
      args: ['foo', 'bar', '--baz=qux'],
    });

    expect(spawn).toHaveBeenCalledTimes(1);

    const params = spawn.mock.calls[0][1];
    const browserFlags = getExecFlags(params);
    expect(browserFlags).toEqual(
      expect.arrayContaining(['foo', 'bar', '--baz=qux'])
    );
  });

  it('removes any --user-data-dir flag from the browser flags', async () => {
    await execute({
      args: ['--user-data-dir=/foo/bar'],
    });

    expect(spawn).toHaveBeenCalledTimes(1);

    const params = spawn.mock.calls[0][1];
    const browserFlags = getExecFlags(params);
    expect(browserFlags).not.toContainEqual(
      expect.stringMatching(/^--user-data-dir=/)
    );
  });

  it('kills the docker process on exit', async () => {
    jest.spyOn(process, 'on');

    await execute({});
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function));

    const spawned = spawn.mock.results[0].value;

    expect(spawned.kill).toHaveBeenCalledTimes(0);
    process.emit('exit');
    expect(spawned.kill).toHaveBeenCalledTimes(1);
  });

  it('kills the docker process on SIGINT', async () => {
    jest.spyOn(process, 'on');

    await execute({});
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    const spawned = spawn.mock.results[0].value;

    expect(spawned.kill).toHaveBeenCalledTimes(0);
    process.emit('SIGINT');
    expect(spawned.kill).toHaveBeenCalledTimes(1);
  });

  it('kills the docker process on SIGTERM', async () => {
    jest.spyOn(process, 'on');

    await execute({});
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    const spawned = spawn.mock.results[0].value;

    expect(spawned.kill).toHaveBeenCalledTimes(0);
    process.emit('SIGTERM');
    expect(spawned.kill).toHaveBeenCalledTimes(1);
  });
});
