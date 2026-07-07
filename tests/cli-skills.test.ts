import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { SkillsCommandError, executeSkillsCommand, formatSkillsError } from '../src/cli/skills.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('camou skills command runtime', () => {
  it('lists visible skills and excludes hidden skills', () => {
    const root = createSkillsDir();
    writeSkill(root, 'core', 'core', 'Core browser automation guide.');
    writeSkill(root, 'camou', 'camou', 'Hidden bootstrap stub.', { hidden: true });

    const text = executeSkillsCommand(['list'], { skillsDirs: [root] });
    expect(text.stdout).toContain('core');
    expect(text.stdout).not.toContain('camou');

    const json = JSON.parse(executeSkillsCommand(['list', '--json'], { skillsDirs: [root] }).stdout) as {
      success: boolean;
      data: Array<{ name: string }>;
    };
    expect(json).toEqual({ success: true, data: [{ name: 'core', description: 'Core browser automation guide.' }] });
  });

  it('treats bare skills as list', () => {
    const root = createSkillsDir();
    writeSkill(root, 'core', 'core', 'Core browser automation guide.');

    expect(executeSkillsCommand([], { skillsDirs: [root] }).stdout).toBe(executeSkillsCommand(['list'], { skillsDirs: [root] }).stdout);
  });

  it('fetches hidden skills directly but excludes them from get --all', () => {
    const root = createSkillsDir();
    writeSkill(root, 'core', 'core', 'Core browser automation guide.');
    writeSkill(root, 'camou', 'camou', 'Hidden bootstrap stub.', { hidden: true });

    const hidden = executeSkillsCommand(['get', 'camou'], { skillsDirs: [root] });
    expect(hidden.stdout).toContain('name: camou');
    expect(hidden.stdout).toContain('# camou');

    const all = executeSkillsCommand(['get', '--all'], { skillsDirs: [root] });
    expect(all.stdout).toContain('name: core');
    expect(all.stdout).not.toContain('name: camou');
  });

  it('includes references and templates in full output', () => {
    const root = createSkillsDir();
    const skillDir = writeSkill(root, 'core', 'core', 'Core browser automation guide.');
    mkdirSync(join(skillDir, 'references'), { recursive: true });
    mkdirSync(join(skillDir, 'templates'), { recursive: true });
    writeFileSync(join(skillDir, 'references', 'commands.md'), '# Commands\n', 'utf8');
    writeFileSync(join(skillDir, 'templates', 'flow.sh'), '#!/usr/bin/env bash\n', 'utf8');

    const text = executeSkillsCommand(['get', 'core', '--full'], { skillsDirs: [root] });
    expect(text.stdout).toContain('--- references/commands.md ---');
    expect(text.stdout).toContain('--- templates/flow.sh ---');

    const json = JSON.parse(executeSkillsCommand(['get', 'core', '--full', '--json'], { skillsDirs: [root] }).stdout) as {
      success: boolean;
      data: Array<{ files: Array<{ path: string; content: string }> }>;
    };
    expect(json.success).toBe(true);
    expect(json.data[0]?.files.map((file) => file.path)).toEqual(['references/commands.md', 'templates/flow.sh']);
  });

  it('prints search paths and named skill paths', () => {
    const root = createSkillsDir();
    const skillDir = writeSkill(root, 'core', 'core', 'Core browser automation guide.');

    expect(executeSkillsCommand(['path'], { skillsDirs: [root] }).stdout).toBe(`${root}\n`);
    expect(executeSkillsCommand(['path', 'core'], { skillsDirs: [root] }).stdout).toBe(`${skillDir}\n`);

    const json = JSON.parse(executeSkillsCommand(['path', 'core', '--json'], { skillsDirs: [root] }).stdout) as {
      success: boolean;
      data: { name: string; path: string };
    };
    expect(json).toEqual({ success: true, data: { name: 'core', path: skillDir } });
  });

  it('uses CAMOU_SKILLS_DIR as a single override directory', () => {
    const root = createSkillsDir();
    writeSkill(root, 'core', 'core', 'Core browser automation guide.');

    const result = executeSkillsCommand(['list'], { env: { CAMOU_SKILLS_DIR: root } });
    expect(result.stdout).toContain('core');
  });

  it('formats agreed command errors', () => {
    const root = createSkillsDir();
    writeSkill(root, 'core', 'core', 'Core browser automation guide.');

    expectSkillsError(['get'], { skillsDirs: [root] }, 'No skill name provided. Usage: camou skills get <name>');
    expectSkillsError(['get', 'node'], { skillsDirs: [root] }, 'Skill not found: node');
    expectSkillsError(['foo'], { skillsDirs: [root] }, 'Unknown skills subcommand: foo');

    const jsonError = catchSkillsError(['get', 'node', '--json'], { skillsDirs: [root] });
    expect(formatSkillsError(jsonError)).toEqual({
      stdout: '{"success":false,"error":"Skill not found: node"}\n',
      stderr: '',
    });
  });

  it('reports missing skill directories with the camou env var name', () => {
    const error = catchSkillsError(['list', '--json'], { env: { CAMOU_SKILLS_DIR: join(tmpdir(), 'missing-camou-skills') } });
    expect(formatSkillsError(error).stdout).toBe(
      '{"success":false,"error":"Skills directory not found. Set CAMOU_SKILLS_DIR or reinstall camou."}\n',
    );
  });

  it('finds packaged production skills', () => {
    const json = JSON.parse(executeSkillsCommand(['list', '--json']).stdout) as {
      success: boolean;
      data: Array<{ name: string }>;
    };
    expect(json.success).toBe(true);
    expect(json.data.map((skill) => skill.name)).toEqual([
      'core',
      'dogfood',
      'migration',
      'network-debug',
      'node',
    ]);

    const hidden = executeSkillsCommand(['get', 'camou']);
    expect(hidden.stdout).toContain('hidden: true');
    expect(hidden.stdout).toContain('camou skills get core');

    const all = executeSkillsCommand(['get', '--all']);
    expect(all.stdout).toContain('name: dogfood');
    expect(all.stdout).toContain('name: migration');
    expect(all.stdout).toContain('name: network-debug');
    expect(all.stdout).toContain('name: node');
    expect(all.stdout).not.toContain('name: camou');
  });
});

function createSkillsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'camou-skills-test-'));
  tempDirs.push(dir);
  return dir;
}

function writeSkill(
  root: string,
  folder: string,
  name: string,
  description: string,
  options: { hidden?: boolean } = {},
): string {
  const dir = join(root, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n${options.hidden ? 'hidden: true\n' : ''}---\n\n# ${name}\n\nContent.\n`,
    'utf8',
  );
  return dir;
}

function catchSkillsError(args: string[], options: Parameters<typeof executeSkillsCommand>[1]): SkillsCommandError {
  try {
    executeSkillsCommand(args, options);
  } catch (error) {
    if (error instanceof SkillsCommandError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected SkillsCommandError');
}

function expectSkillsError(
  args: string[],
  options: Parameters<typeof executeSkillsCommand>[1],
  message: string,
): void {
  const error = catchSkillsError(args, options);
  expect(error.message).toBe(message);
  expect(formatSkillsError(error)).toEqual({ stdout: '', stderr: `${message}\n` });
}
