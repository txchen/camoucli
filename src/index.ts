export { CamoufoxSession, launchCamoufox, launchCamoufoxContext, withCamoufox, type LaunchCamoufoxOptions } from './api.js';
export {
  doctorCamoufox,
  inspectCamoufoxInstall,
  installCamoufox,
  removeCamoufox,
  resolveRelease,
  type CamoufoxInstallInspection,
  type ResolvedRelease,
} from './camoufox/installer.js';
export {
  listInstalledBrowsers,
  loadBrowserRegistry,
  requireInstalledBrowser,
  resolveInstalledBrowser,
  setCurrentBrowser,
  setInstalledBrowser,
  type BrowserInstallListing,
  type BrowserInstallRecord,
  type BrowserRegistry,
} from './camoufox/registry.js';
export { listCamoufoxPresets, resolveCamoufoxPresets, type CamoufoxPresetDefinition, type ResolvedPresetBundle } from './camoufox/presets.js';
export { getCamoucliPaths, ensureBasePaths, ensureSessionPaths, getSessionPaths, type CamoucliPaths, type SessionPaths } from './state/paths.js';
export {
  BrowserNotInstalledError,
  CamoucliError,
  DaemonStartError,
  InstallError,
  IpcError,
  RefNotFoundError,
  SessionError,
  UnsupportedPlatformError,
  ValidationError,
  getExitCode,
  isCamoucliError,
  toErrorPayload,
  type ErrorPayload,
} from './util/errors.js';
export type { LaunchInput, ResolvedLaunchConfig } from './camoufox/config.js';
export type { BrowserLaunchProbe, LaunchedSession } from './camoufox/launcher.js';
export type { BrowserContext, Page } from 'playwright-core';
