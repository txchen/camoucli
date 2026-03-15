const CAMOU_CONFIG_KEY = /^CAMOU_CONFIG_\d+$/;

export function getCamouConfigChunkSize(platform: NodeJS.Platform = process.platform): number {
  return platform === 'win32' ? 2047 : 32767;
}

export function chunkCamouConfig(
  config: Record<string, unknown> | string,
  platform: NodeJS.Platform = process.platform,
): string[] {
  const serialized = typeof config === 'string' ? config : JSON.stringify(config);
  const chunkSize = getCamouConfigChunkSize(platform);
  const chunks: string[] = [];

  for (let index = 0; index < serialized.length; index += chunkSize) {
    chunks.push(serialized.slice(index, index + chunkSize));
  }

  return chunks;
}

export function buildCamouConfigEnv(
  config: Record<string, unknown>,
  baseEnv: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Record<string, string> {
  const nextEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(baseEnv)) {
    if (!CAMOU_CONFIG_KEY.test(key) && value !== undefined) {
      nextEnv[key] = value;
    }
  }

  const chunks = chunkCamouConfig(config, platform);
  for (const [index, chunk] of chunks.entries()) {
    nextEnv[`CAMOU_CONFIG_${index + 1}`] = chunk;
  }

  return nextEnv;
}
