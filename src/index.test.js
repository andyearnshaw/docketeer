import { jest } from '@jest/globals';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('main exec', () => {
  let importCount = 0;
  const execute = async ({ env = {}, args = [] }) => {
    const oldArgv = process.argv;
    const oldEnv = process.env;

    try {
      process.argv = ['node', 'index.js', ...args];
      process.env = env;
      await import(`./index.js?${importCount++}`);
    } finally {
      process.env = oldEnv;
      process.argv = oldArgv;
    }
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pulls the docker image before running the script', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    jest.spyOn(process, 'exit').mockImplementationOnce(() => {});

    await execute({
      env: { SHELL: 'me-shell' },
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(console.error).toHaveBeenCalledTimes(0);
    expect(process.exit).toHaveBeenCalledTimes(0);

    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      'docker',
      ['pull', 'browserless/chrome'],
      {
        shell: 'me-shell',
        stdio: 'inherit',
      }
    );
  });

  it('exits early if the docker pull has a non-zero exit code', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    jest.spyOn(process, 'exit').mockImplementationOnce(() => {});
    spawnSync.mockReturnValueOnce({ status: 300 });

    await execute({
      env: { SHELL: 'me-shell' },
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(console.error).toHaveBeenCalledWith(expect.any(String));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('executes the script argument with the shell, inherited stdio and including process.env', async () => {
    const mockEnv = { SHELL: 'me-shell', VAR_1: 'foo', VAR_2: 'bar' };

    await execute({
      env: mockEnv,
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith('npm', ['run', 'myscript'], {
      shell: mockEnv.SHELL,
      stdio: 'inherit',
      env: expect.objectContaining(mockEnv),
    });
  });

  it('sets the PUPPETEER_EXECUTABLE_PATH env var to the local launch.js file', async () => {
    await execute({
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          PUPPETEER_EXECUTABLE_PATH: path.resolve(__dirname, './launch.js'),
        }),
      })
    );
  });

  it('adds a FORCE_COLOR env var to enable colour output from the executed script', async () => {
    await execute({
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          FORCE_COLOR: 'true',
        }),
      })
    );
  });

  it('adds a DOCKETEER_ENABLED env var to allow the executed script to detect docketeer', async () => {
    await execute({
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          DOCKETEER_ENABLED: 'true',
        }),
      })
    );
  });

  it('sets the DOCKETEER_IMAGE env var to the provided image identifier', async () => {
    await execute({
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          DOCKETEER_IMAGE: 'browserless/chrome',
        }),
      })
    );
  });

  it('sets the DOCKETEER_IMAGE env var from the parent env if provided', async () => {
    await execute({
      env: { DOCKETEER_IMAGE: 'puppeteer/chrome' },
      args: ['npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          DOCKETEER_IMAGE: 'puppeteer/chrome',
        }),
      })
    );
  });

  it('sets the DOCKETEER_EXEC_PATH var to "google-chrome" by default', async () => {
    await execute({
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          DOCKETEER_EXEC_PATH: 'google-chrome',
        }),
      })
    );
  });

  it('sets the DOCKETEER_EXEC_PATH var from the parent env if provided', async () => {
    await execute({
      env: { DOCKETEER_EXEC_PATH: 'chromium-browser' },
      args: ['browserless/chrome', 'npm', 'run', 'myscript'],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          DOCKETEER_EXEC_PATH: 'chromium-browser',
        }),
      })
    );
  });

  it('sets the DOCKETEER_EXEC_PATH var to the value of --exec-path if provided', async () => {
    await execute({
      env: { DOCKETEER_EXEC_PATH: 'google-chrome' },
      args: [
        '--exec-path=chromium-browser',
        'browserless/chrome',
        'npm',
        'run',
        'myscript',
      ],
    });

    expect(spawnSync).toHaveBeenLastCalledWith(
      'npm',
      ['run', 'myscript'],
      expect.objectContaining({
        env: expect.objectContaining({
          DOCKETEER_EXEC_PATH: 'chromium-browser',
        }),
      })
    );
  });
});
