import { describe, expect, it } from 'vitest';

import { parseProxyString, resolveLaunchConfig } from '../src/camoufox/config.js';
import { ValidationError } from '../src/util/errors.js';

describe('launch config parsing', () => {
  it('parses proxy URLs', () => {
    expect(parseProxyString('http://127.0.0.1:8080')).toEqual({ server: 'http://127.0.0.1:8080/' });
  });

  it('rejects invalid proxy URLs', () => {
    expect(() => parseProxyString('not-a-url')).toThrow(ValidationError);
  });

  it('resolves inline config and prefs JSON', async () => {
    const config = await resolveLaunchConfig({
      headless: true,
      preset: ['cache'],
      configJson: '{"navigator.language":"en-US"}',
      prefsJson: '{"network.http.speculative-parallel-limit":0}',
      width: 1280,
      height: 720,
    });

    expect(config.headless).toBe(true);
    expect(config.presetNames).toEqual(['cache']);
    expect(config.camouConfig['navigator.language']).toBe('en-US');
    expect(config.firefoxUserPrefs['browser.cache.memory.enable']).toBe(true);
    expect(config.firefoxUserPrefs['network.http.speculative-parallel-limit']).toBe(0);
    expect(config.viewport).toEqual({ width: 1280, height: 720 });
  });

  it('requires width and height together', async () => {
    await expect(resolveLaunchConfig({ width: 1280 })).rejects.toThrow(ValidationError);
  });

  it('rejects conflicting config sources and invalid locale/timezone', async () => {
    await expect(resolveLaunchConfig({ configPath: '/tmp/config.json', configJson: '{}' })).rejects.toThrow(ValidationError);
    await expect(resolveLaunchConfig({ locale: 'not-a-real-locale' })).rejects.toThrow(ValidationError);
    await expect(resolveLaunchConfig({ timezone: 'Mars/OlympusMons' })).rejects.toThrow(ValidationError);
  });

  it('resolves higher-level fingerprint helpers into config, prefs, and viewport', async () => {
    const config = await resolveLaunchConfig({
      locales: ['en-US', 'fr-FR'],
      screenProfile: 'desktop-fhd',
      windowProfile: 'desktop',
      blockImages: true,
      blockWebRtc: true,
      blockWebGl: true,
      disableCoop: true,
      fontSpacingSeed: 7,
      fonts: ['Arial', 'Helvetica'],
    });

    expect(config.locale).toBe('en-US');
    expect(config.camouConfig['navigator.language']).toBe('en-US');
    expect(config.camouConfig['navigator.languages']).toEqual(['en-US', 'en', 'fr-FR', 'fr']);
    expect(config.camouConfig['locale:language']).toBe('en');
    expect(config.camouConfig['locale:region']).toBe('US');
    expect(config.camouConfig['headers.Accept-Language']).toBe('en-US;q=1.0, en;q=0.9, fr-FR;q=0.8, fr;q=0.7');
    expect(config.camouConfig['screen.width']).toBe(1920);
    expect(config.camouConfig['window.outerWidth']).toBe(1536);
    expect(config.camouConfig['window.innerWidth']).toBe(1440);
    expect(config.camouConfig.fonts).toEqual(['Arial', 'Helvetica']);
    expect(config.camouConfig['fonts:spacing_seed']).toBe(7);
    expect(config.firefoxUserPrefs['permissions.default.image']).toBe(2);
    expect(config.firefoxUserPrefs['media.peerconnection.enabled']).toBe(false);
    expect(config.firefoxUserPrefs['webgl.disabled']).toBe(true);
    expect(config.firefoxUserPrefs['browser.tabs.remote.useCrossOriginOpenerPolicy']).toBe(false);
    expect(config.viewport).toEqual({ width: 1440, height: 900 });
  });

  it('merges fingerprint helper JSON with explicit overrides', async () => {
    const config = await resolveLaunchConfig({
      fingerprintJson: JSON.stringify({
        screenProfile: 'laptop-hd',
        blockImages: false,
        locales: ['de-DE'],
      }),
      blockImages: true,
      window: {
        width: 1200,
        height: 700,
      },
    });

    expect(config.locale).toBe('de-DE');
    expect(config.camouConfig['screen.width']).toBe(1366);
    expect(config.camouConfig['window.innerWidth']).toBe(1200);
    expect(config.camouConfig['window.innerHeight']).toBe(700);
    expect(config.firefoxUserPrefs['permissions.default.image']).toBe(2);
    expect(config.viewport).toEqual({ width: 1200, height: 700 });
  });

  it('resolves region helpers into locale, timezone, and geolocation defaults', async () => {
    const config = await resolveLaunchConfig({
      region: 'JP',
    });

    expect(config.locale).toBe('ja-JP');
    expect(config.timezoneId).toBe('Asia/Tokyo');
    expect(config.camouConfig['navigator.language']).toBe('ja-JP');
    expect(config.camouConfig['locale:region']).toBe('JP');
    expect(config.camouConfig['geolocation:latitude']).toBe(35.6764);
    expect(config.camouConfig['geolocation:longitude']).toBe(139.65);
    expect(config.camouConfig.timezone).toBe('Asia/Tokyo');
  });

  it('lets explicit locale and timezone overrides win over region defaults', async () => {
    const config = await resolveLaunchConfig({
      region: 'DE',
      locale: 'en-GB',
      timezone: 'Europe/London',
    });

    expect(config.locale).toBe('en-GB');
    expect(config.timezoneId).toBe('Europe/London');
    expect(config.camouConfig['geolocation:latitude']).toBe(52.52);
    expect(config.camouConfig['headers.Accept-Language']).toBe('en-GB;q=1.0, en;q=0.9');
  });

  it('rejects conflicting locale helper inputs', async () => {
    await expect(resolveLaunchConfig({ locale: 'en-US', locales: ['fr-FR'] })).rejects.toThrow(ValidationError);
  });

  it('rejects unknown region helpers', async () => {
    await expect(resolveLaunchConfig({ region: 'ZZ' })).rejects.toThrow(ValidationError);
  });
});
