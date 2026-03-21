import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureBasePaths, ensureSessionPaths } from '../src/state/paths.js';
import { listStoredSessionProfiles, removeStoredSessionProfile } from '../src/state/session-profiles.js';
import { createTestPaths } from './helpers/temp-paths.js';

describe('stored session profiles', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-session-profiles-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('lists stored profile directories from disk', async () => {
    const paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);
    await ensureSessionPaths(paths, 'work profile');
    await writeFile(path.join(paths.profilesDir, 'README.txt'), 'ignore me', 'utf8');

    const profiles = await listStoredSessionProfiles(paths);

    expect(profiles).toMatchObject([
      {
        profileName: 'work-profile',
        rootDir: path.join(paths.profilesDir, 'work-profile'),
        profileDir: path.join(paths.profilesDir, 'work-profile', 'user-data'),
        downloadsDir: path.join(paths.profilesDir, 'work-profile', 'downloads'),
        artifactsDir: path.join(paths.profilesDir, 'work-profile', 'artifacts'),
      },
    ]);
  });

  it('removes a stored profile by sanitized name', async () => {
    const paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);
    const sessionPaths = await ensureSessionPaths(paths, 'work profile');

    const result = await removeStoredSessionProfile(paths, 'work profile');
    const remaining = await listStoredSessionProfiles(paths);

    expect(result).toMatchObject({
      profileName: 'work-profile',
      removed: true,
      rootDir: sessionPaths.rootDir,
    });
    expect(remaining).toEqual([]);
  });

  it('returns a stable result when the stored profile is missing', async () => {
    const paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);

    await expect(removeStoredSessionProfile(paths, 'missing')).resolves.toMatchObject({
      profileName: 'missing',
      removed: false,
      rootDir: path.join(paths.profilesDir, 'missing'),
    });
  });
});
