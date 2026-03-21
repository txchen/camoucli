import { beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

const CURRENT_VERSION = packageJson.version;
const INCOMPATIBLE_VERSION = '0.0.0';

const spawnMock = vi.fn();
const getDaemonStatusMock = vi.fn();
const cleanupStaleDaemonArtifactsMock = vi.fn();
const readDaemonPidMock = vi.fn();
const stopDaemonProcessMock = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('../src/ipc/client.js', () => ({
  getDaemonStatus: getDaemonStatusMock,
}));

vi.mock('../src/daemon/runtime.js', () => ({
  cleanupStaleDaemonArtifacts: cleanupStaleDaemonArtifactsMock,
  readDaemonPid: readDaemonPidMock,
  stopDaemonProcess: stopDaemonProcessMock,
}));

describe('daemon compatibility startup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    spawnMock.mockReturnValue({ unref: vi.fn() });
    cleanupStaleDaemonArtifactsMock.mockResolvedValue({ pid: undefined, pidAlive: false, removedPidFile: false, removedSocket: false });
    readDaemonPidMock.mockResolvedValue(undefined);
    stopDaemonProcessMock.mockResolvedValue(true);
  });

  it('reuses a compatible running daemon', async () => {
    getDaemonStatusMock.mockResolvedValue({ ok: true, pid: 101, version: CURRENT_VERSION });

    const { ensureDaemonRunning } = await import('../src/cli/daemon.js');
    await ensureDaemonRunning({ daemonPidFile: '/tmp/daemon.pid', daemonLogFile: '/tmp/daemon.log' } as never, false);

    expect(stopDaemonProcessMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('restarts an older daemon version before proceeding', async () => {
    getDaemonStatusMock
      .mockResolvedValueOnce({ ok: true, pid: 101, version: INCOMPATIBLE_VERSION })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ok: true, pid: 202, version: CURRENT_VERSION });

    const { ensureDaemonRunning } = await import('../src/cli/daemon.js');
    const promise = ensureDaemonRunning({ daemonPidFile: '/tmp/daemon.pid', daemonLogFile: '/tmp/daemon.log' } as never, false);
    await vi.runAllTimersAsync();
    await promise;

    expect(stopDaemonProcessMock).toHaveBeenCalledWith(101);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it('stops a running daemon using its reported pid', async () => {
    getDaemonStatusMock.mockResolvedValue({ ok: true, pid: 101, version: CURRENT_VERSION });

    const { stopDaemon } = await import('../src/cli/daemon.js');
    const result = await stopDaemon({ daemonPidFile: '/tmp/daemon.pid', daemonLogFile: '/tmp/daemon.log' } as never);

    expect(stopDaemonProcessMock).toHaveBeenCalledWith(101);
    expect(result).toEqual({ stopped: true, pid: 101 });
  });

  it('restarts the daemon and returns the new status', async () => {
    getDaemonStatusMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ok: true, pid: 202, version: CURRENT_VERSION })
      .mockResolvedValueOnce({ ok: true, pid: 202, version: CURRENT_VERSION });

    const { restartDaemon } = await import('../src/cli/daemon.js');
    const promise = restartDaemon({ daemonPidFile: '/tmp/daemon.pid', daemonLogFile: '/tmp/daemon.log' } as never, false);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ restarted: true, stopped: false, pid: 202, version: CURRENT_VERSION });
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});
