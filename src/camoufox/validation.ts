import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

import { z } from 'zod';

import { ValidationError } from '../util/errors.js';

const propertyDefinitionSchema = z.object({
  property: z.string(),
  type: z.string(),
});

const propertiesSchema = z.array(propertyDefinitionSchema);

type PropertyType = 'str' | 'int' | 'uint' | 'double' | 'bool' | 'array' | 'dict';

const KNOWN_PROPERTY_FILES = [
  'properties.json',
  path.join('Camoufox.app', 'Contents', 'Resources', 'properties.json'),
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPropertiesFile(rootDir: string): Promise<string | undefined> {
  for (const relativePath of KNOWN_PROPERTY_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.name === 'properties.json') {
        return fullPath;
      }
    }
  }

  return undefined;
}

async function loadPropertyTypes(rootDir: string): Promise<Record<string, PropertyType> | undefined> {
  const propertiesFile = await findPropertiesFile(rootDir);
  if (!propertiesFile) {
    return undefined;
  }

  const raw = await readFile(propertiesFile, 'utf8');
  const parsed = propertiesSchema.parse(JSON.parse(raw));

  return Object.fromEntries(parsed.map((item) => [item.property, item.type as PropertyType]));
}

export function validateCamouConfigValue(value: unknown, expectedType: PropertyType): boolean {
  switch (expectedType) {
    case 'str':
      return typeof value === 'string';
    case 'int':
      return Number.isInteger(value);
    case 'uint':
      return Number.isInteger(value) && Number(value) >= 0;
    case 'double':
      return typeof value === 'number';
    case 'bool':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'dict':
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    default:
      return true;
  }
}

export async function validateCamouConfig(config: Record<string, unknown>, browserRootDir: string): Promise<void> {
  if (Object.keys(config).length === 0) {
    return;
  }

  let propertyTypes: Record<string, PropertyType> | undefined;
  try {
    propertyTypes = await loadPropertyTypes(browserRootDir);
  } catch (error) {
    throw new ValidationError('Unable to read Camoufox property definitions for config validation.', undefined, error);
  }

  if (!propertyTypes) {
    return;
  }

  for (const [key, value] of Object.entries(config)) {
    const expectedType = propertyTypes[key];
    if (!expectedType) {
      throw new ValidationError(`Unknown Camoufox property: ${key}`);
    }

    if (!validateCamouConfigValue(value, expectedType)) {
      throw new ValidationError(
        `Invalid type for Camoufox property ${key}. Expected ${expectedType}, received ${Array.isArray(value) ? 'array' : typeof value}.`,
      );
    }
  }
}
