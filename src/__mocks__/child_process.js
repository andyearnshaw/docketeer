import { jest } from '@jest/globals';

export const spawnSync = jest.fn(() => ({ status: 0 }));

export const spawn = jest.fn(() => ({
  on: jest.fn(),
  kill: jest.fn(),
}));

export const execSync = jest.fn(() => Buffer.from(''));
