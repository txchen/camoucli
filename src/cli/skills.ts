import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR_NAMES = ['skills', 'skill-data'] as const;
const SUPPLEMENTARY_DIR_NAMES = ['references', 'templates'] as const;
const SKILLS_DIR_ERROR = 'Skills directory not found. Set CAMOU_SKILLS_DIR or reinstall camou.';

export interface SkillsCommandOptions {
  json?: boolean | undefined;
  full?: boolean | undefined;
  all?: boolean | undefined;
  skillsDirs?: string[] | undefined;
  moduleUrl?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
}

export interface SkillsCommandResult {
  stdout: string;
  stderr: string;
}

interface SkillInfo {
  name: string;
  description: string;
  dir: string;
  hidden: boolean;
}

interface ParsedSkillsArgs {
  operands: string[];
  json: boolean;
  full: boolean;
  all: boolean;
}

export class SkillsCommandError extends Error {
  constructor(message: string, readonly json: boolean) {
    super(message);
    this.name = 'SkillsCommandError';
  }
}

function parseFrontmatter(content: string): { name: string; description: string; hidden: boolean } | undefined {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return undefined;
  }

  const afterOpening = trimmed.slice(3);
  const end = afterOpening.indexOf('\n---');
  if (end < 0) {
    return undefined;
  }

  const lines = afterOpening.slice(0, end).split(/\r?\n/);
  let name: string | undefined;
  let description = '';
  let hidden = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.startsWith('name:')) {
      name = unquoteYamlScalar(line.slice('name:'.length).trim());
      continue;
    }
    if (line.startsWith('description:')) {
      const parts = [unquoteYamlScalar(line.slice('description:'.length).trim())];
      while (i + 1 < lines.length && /^(\s{2,}|\t)/.test(lines[i + 1] ?? '')) {
        i += 1;
        parts.push(unquoteYamlScalar((lines[i] ?? '').trim()));
      }
      description = parts.filter(Boolean).join(' ');
      continue;
    }
    if (line.startsWith('hidden:')) {
      hidden = ['true', 'yes'].includes(line.slice('hidden:'.length).trim().toLowerCase());
    }
  }

  if (!name) {
    return undefined;
  }

  return { name, description, hidden };
}

function unquoteYamlScalar(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function findPackageRoot(moduleUrl: string): string | undefined {
  let dir = dirname(fileURLToPath(moduleUrl));
  while (true) {
    if (SKILL_DIR_NAMES.some((name) => existsSync(join(dir, name)))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

export function findSkillsDirs(options: SkillsCommandOptions = {}): string[] {
  if (options.skillsDirs) {
    return options.skillsDirs;
  }

  const env = options.env ?? process.env;
  const override = env.CAMOU_SKILLS_DIR;
  if (override) {
    return existsSync(override) ? [override] : [];
  }

  const root = findPackageRoot(options.moduleUrl ?? import.meta.url);
  if (!root) {
    return [];
  }

  return SKILL_DIR_NAMES.map((name) => join(root, name)).filter((path) => existsSync(path));
}

export function discoverSkills(skillsDirs: string[]): SkillInfo[] {
  const skills: SkillInfo[] = [];

  for (const skillsDir of skillsDirs) {
    let entries: string[];
    try {
      entries = readdirSync(skillsDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const dir = join(skillsDir, entry);
      const skillMd = join(dir, 'SKILL.md');
      if (!existsSync(skillMd)) {
        continue;
      }

      let content: string;
      try {
        content = readFileSync(skillMd, 'utf8');
      } catch {
        continue;
      }

      const parsed = parseFrontmatter(content);
      if (parsed) {
        skills.push({ ...parsed, dir });
      }
    }
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

function collectSupplementaryFiles(skillDir: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  for (const subdirName of SUPPLEMENTARY_DIR_NAMES) {
    const subdir = join(skillDir, subdirName);
    if (!existsSync(subdir)) {
      continue;
    }

    let entries: string[];
    try {
      entries = readdirSync(subdir).sort();
    } catch {
      continue;
    }

    for (const entry of entries) {
      const path = join(subdir, entry);
      try {
        files.push({
          path: `${subdirName}/${entry}`,
          content: readFileSync(path, 'utf8'),
        });
      } catch {
        continue;
      }
    }
  }

  return files;
}

function readSkillContent(skill: SkillInfo): string {
  return readFileSync(join(skill.dir, 'SKILL.md'), 'utf8');
}

function truncateDescription(description: string, maxLength: number): string {
  if (description.length <= maxLength) {
    return description;
  }

  const boundary = Array.from(description).slice(0, maxLength + 1).join('').length;
  const cut = description.slice(0, boundary).lastIndexOf(' ');
  return `${description.slice(0, cut > 0 ? cut : maxLength)}...`;
}

function parseSkillsArgs(args: string[], options: SkillsCommandOptions): ParsedSkillsArgs {
  const operands: string[] = [];
  let json = options.json ?? false;
  let full = options.full ?? false;
  let all = options.all ?? false;

  for (const arg of args) {
    if (arg === '--json') {
      json = true;
    } else if (arg === '--full') {
      full = true;
    } else if (arg === '--all') {
      all = true;
    } else {
      operands.push(arg);
    }
  }

  return { operands, json, full, all };
}

function jsonResult(data: unknown): SkillsCommandResult {
  return {
    stdout: `${JSON.stringify({ success: true, data })}\n`,
    stderr: '',
  };
}

function textResult(stdout: string): SkillsCommandResult {
  return { stdout, stderr: '' };
}

function runList(skills: SkillInfo[], json: boolean): SkillsCommandResult {
  const visibleSkills = skills.filter((skill) => !skill.hidden);
  if (json) {
    return jsonResult(visibleSkills.map((skill) => ({ name: skill.name, description: skill.description })));
  }

  if (visibleSkills.length === 0) {
    return textResult('No skills found\n');
  }

  const maxName = Math.max(...visibleSkills.map((skill) => skill.name.length));
  return textResult(
    visibleSkills
      .map((skill) => `  ${skill.name.padEnd(maxName)}  ${truncateDescription(skill.description, 70)}`)
      .join('\n')
      .concat('\n'),
  );
}

function runGet(skills: SkillInfo[], names: string[], getAll: boolean, full: boolean, json: boolean): SkillsCommandResult {
  const targets = getAll
    ? skills.filter((skill) => !skill.hidden)
    : names.map((name) => {
        const skill = skills.find((candidate) => candidate.name === name);
        if (!skill) {
          throw new SkillsCommandError(`Skill not found: ${name}`, json);
        }
        return skill;
      });

  if (targets.length === 0) {
    throw new SkillsCommandError('No skill name provided. Usage: camou skills get <name>', json);
  }

  if (json) {
    return jsonResult(
      targets.map((skill) => {
        const item: { name: string; content: string; files?: Array<{ path: string; content: string }> } = {
          name: skill.name,
          content: readSkillContent(skill),
        };
        const files = full ? collectSupplementaryFiles(skill.dir) : [];
        if (files.length > 0) {
          item.files = files;
        }
        return item;
      }),
    );
  }

  const blocks = targets.map((skill) => {
    let content = readSkillContent(skill);
    if (!content.endsWith('\n')) {
      content = `${content}\n`;
    }
    if (!full) {
      return content;
    }
    for (const file of collectSupplementaryFiles(skill.dir)) {
      content += `\n--- ${file.path} ---\n\n${file.content}`;
      if (!content.endsWith('\n')) {
        content += '\n';
      }
    }
    return content;
  });

  return textResult(blocks.join('\n---\n\n'));
}

function runPath(skillsDirs: string[], skills: SkillInfo[], name: string | undefined, json: boolean): SkillsCommandResult {
  if (!name) {
    return json ? jsonResult({ paths: skillsDirs }) : textResult(`${skillsDirs.join('\n')}\n`);
  }

  const skill = skills.find((candidate) => candidate.name === name);
  if (!skill) {
    throw new SkillsCommandError(`Skill not found: ${name}`, json);
  }

  return json ? jsonResult({ name: skill.name, path: skill.dir }) : textResult(`${skill.dir}\n`);
}

export function executeSkillsCommand(args: string[], options: SkillsCommandOptions = {}): SkillsCommandResult {
  const parsed = parseSkillsArgs(args, options);
  const skillsDirs = findSkillsDirs(options);
  if (skillsDirs.length === 0) {
    throw new SkillsCommandError(SKILLS_DIR_ERROR, parsed.json);
  }

  const skills = discoverSkills(skillsDirs);
  const subcommand = parsed.operands[0] ?? 'list';

  if (subcommand === 'list') {
    return runList(skills, parsed.json);
  }
  if (subcommand === 'get') {
    return runGet(skills, parsed.operands.slice(1), parsed.all, parsed.full, parsed.json);
  }
  if (subcommand === 'path') {
    return runPath(skillsDirs, skills, parsed.operands[1], parsed.json);
  }

  throw new SkillsCommandError(`Unknown skills subcommand: ${subcommand}`, parsed.json);
}

export function formatSkillsError(error: SkillsCommandError): SkillsCommandResult {
  if (error.json) {
    return {
      stdout: `${JSON.stringify({ success: false, error: error.message })}\n`,
      stderr: '',
    };
  }

  return {
    stdout: '',
    stderr: `${error.message}\n`,
  };
}
