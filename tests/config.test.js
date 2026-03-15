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
            configJson: '{"navigator.language":"en-US"}',
            prefsJson: '{"network.http.speculative-parallel-limit":0}',
            width: 1280,
            height: 720,
        });
        expect(config.headless).toBe(true);
        expect(config.camouConfig['navigator.language']).toBe('en-US');
        expect(config.firefoxUserPrefs['network.http.speculative-parallel-limit']).toBe(0);
        expect(config.viewport).toEqual({ width: 1280, height: 720 });
    });
    it('requires width and height together', async () => {
        await expect(resolveLaunchConfig({ width: 1280 })).rejects.toThrow(ValidationError);
    });
});
//# sourceMappingURL=config.test.js.map