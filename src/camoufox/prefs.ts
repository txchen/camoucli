import { z } from 'zod';

import { ValidationError } from '../util/errors.js';

const prefValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const firefoxUserPrefsSchema = z.record(z.string(), prefValueSchema);

export type FirefoxUserPrefs = z.infer<typeof firefoxUserPrefsSchema>;

export function parseFirefoxUserPrefs(input: unknown): FirefoxUserPrefs {
  const parsed = firefoxUserPrefsSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError('Firefox user prefs must be a JSON object.');
  }

  return parsed.data;
}

export function mergeFirefoxUserPrefs(...prefs: Array<FirefoxUserPrefs | undefined>): FirefoxUserPrefs {
  return prefs.reduce<FirefoxUserPrefs>((accumulator, current) => {
    if (!current) {
      return accumulator;
    }

    return {
      ...accumulator,
      ...current,
    };
  }, {});
}
