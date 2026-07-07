import { describe, expect, it, vi } from 'vitest';

import { executeBatchCommands } from '../src/cli/batch.js';

describe('CLI batch execution', () => {
  it('executes parsed commands sequentially through normal daemon actions', async () => {
    const executeAction = vi.fn(async (action: string) => ({ action }));

    const result = await executeBatchCommands(
      [
        ['open'],
        ['network', 'route', '*', '--abort', '--resource-type', 'script'],
        ['cookies', 'set', '--curl', 'cookies.curl', '--domain', 'localhost'],
        ['navigate', 'localhost:3000/target', '--session', 'child'],
      ],
      { session: 'work', headless: true },
      executeAction,
    );

    expect(executeAction).toHaveBeenNthCalledWith(
      1,
      'open',
      expect.objectContaining({ action: 'open', url: undefined }),
      expect.objectContaining({ session: 'work', headless: true }),
    );
    expect(executeAction).toHaveBeenNthCalledWith(
      2,
      'network.route',
      expect.objectContaining({ action: 'network.route', url: '*', abort: true, resourceTypes: ['script'] }),
      expect.objectContaining({ session: 'work', headless: true }),
    );
    expect(executeAction).toHaveBeenNthCalledWith(
      3,
      'cookies.set',
      expect.objectContaining({ action: 'cookies.set', curlPath: 'cookies.curl', domain: 'localhost' }),
      expect.objectContaining({ session: 'work', headless: true }),
    );
    expect(executeAction).toHaveBeenNthCalledWith(
      4,
      'open',
      expect.objectContaining({ action: 'open', url: 'https://localhost:3000/target', session: 'child' }),
      expect.objectContaining({ session: 'child', headless: true }),
    );
    expect(result).toEqual({
      count: 4,
      results: [
        { index: 1, argv: ['open'], action: 'open', data: { action: 'open' } },
        { index: 2, argv: ['network', 'route', '*', '--abort', '--resource-type', 'script'], action: 'network.route', data: { action: 'network.route' } },
        { index: 3, argv: ['cookies', 'set', '--curl', 'cookies.curl', '--domain', 'localhost'], action: 'cookies.set', data: { action: 'cookies.set' } },
        { index: 4, argv: ['navigate', 'localhost:3000/target', '--session', 'child'], action: 'open', data: { action: 'open' } },
      ],
    });
  });

  it('rejects non-daemon commands inside a batch', async () => {
    await expect(executeBatchCommands([['install']], {}, async () => undefined)).rejects.toThrow('install cannot run inside batch');
  });
});
