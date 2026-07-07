import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { launchInputSchema } from '../camoufox/config.js';
import type { ErrorPayload } from '../util/errors.js';

const browserRequestBase = launchInputSchema.extend({
  id: z.string(),
  session: z.string().min(1),
  tabName: z.string().min(1).optional(),
});

const pingRequestSchema = z.object({
  id: z.string(),
  action: z.literal('ping'),
});

const openRequestSchema = browserRequestBase.extend({
  action: z.literal('open'),
  url: z.string().min(1).optional(),
});

const backRequestSchema = browserRequestBase.extend({
  action: z.literal('back'),
});

const forwardRequestSchema = browserRequestBase.extend({
  action: z.literal('forward'),
});

const reloadRequestSchema = browserRequestBase.extend({
  action: z.literal('reload'),
});

const snapshotRequestSchema = browserRequestBase.extend({
  action: z.literal('snapshot'),
  interactive: z.boolean().default(false),
});

const clickRequestSchema = browserRequestBase.extend({
  action: z.literal('click'),
  target: z.string().min(1),
  newTab: z.boolean().default(false),
  label: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const downloadRequestSchema = browserRequestBase.extend({
  action: z.literal('download'),
  target: z.string().min(1),
  path: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
});

const dblclickRequestSchema = browserRequestBase.extend({
  action: z.literal('dblclick'),
  target: z.string().min(1),
});

const hoverRequestSchema = browserRequestBase.extend({
  action: z.literal('hover'),
  target: z.string().min(1),
});

const focusRequestSchema = browserRequestBase.extend({
  action: z.literal('focus'),
  target: z.string().min(1),
});

const fillRequestSchema = browserRequestBase.extend({
  action: z.literal('fill'),
  target: z.string().min(1),
  text: z.string(),
});

const typeRequestSchema = browserRequestBase.extend({
  action: z.literal('type'),
  target: z.string().min(1),
  text: z.string(),
  clear: z.boolean().default(false),
  delayMs: z.number().int().nonnegative().optional(),
});

const checkRequestSchema = browserRequestBase.extend({
  action: z.literal('check'),
  target: z.string().min(1),
});

const uncheckRequestSchema = browserRequestBase.extend({
  action: z.literal('uncheck'),
  target: z.string().min(1),
});

const selectRequestSchema = browserRequestBase.extend({
  action: z.literal('select'),
  target: z.string().min(1),
  value: z.union([z.string(), z.array(z.string().min(1)).min(1)]),
});

const pressRequestSchema = browserRequestBase.extend({
  action: z.literal('press'),
  key: z.string().min(1),
});

const keyboardDownRequestSchema = browserRequestBase.extend({
  action: z.literal('keyboard.down'),
  key: z.string().min(1),
});

const keyboardUpRequestSchema = browserRequestBase.extend({
  action: z.literal('keyboard.up'),
  key: z.string().min(1),
});

const keyboardTypeRequestSchema = browserRequestBase.extend({
  action: z.literal('keyboard.type'),
  text: z.string(),
  delayMs: z.number().int().nonnegative().optional(),
});

const keyboardInsertTextRequestSchema = browserRequestBase.extend({
  action: z.literal('keyboard.insertText'),
  text: z.string(),
});

const mouseButtonSchema = z.enum(['left', 'right', 'middle']);

const mouseMoveRequestSchema = browserRequestBase.extend({
  action: z.literal('mouse.move'),
  x: z.number(),
  y: z.number(),
});

const mouseDownRequestSchema = browserRequestBase.extend({
  action: z.literal('mouse.down'),
  button: mouseButtonSchema.optional(),
});

const mouseUpRequestSchema = browserRequestBase.extend({
  action: z.literal('mouse.up'),
  button: mouseButtonSchema.optional(),
});

const mouseWheelRequestSchema = browserRequestBase.extend({
  action: z.literal('mouse.wheel'),
  deltaX: z.number(),
  deltaY: z.number(),
});

const scrollRequestSchema = browserRequestBase.extend({
  action: z.literal('scroll'),
  direction: z.enum(['up', 'down', 'left', 'right']).default('down'),
  amount: z.number().int().positive().optional(),
  target: z.string().min(1).optional(),
});

const scrollIntoViewRequestSchema = browserRequestBase.extend({
  action: z.literal('scroll.intoView'),
  target: z.string().min(1),
});

const uploadRequestSchema = browserRequestBase.extend({
  action: z.literal('upload'),
  target: z.string().min(1),
  files: z.array(z.string().min(1)).min(1),
});

const dragRequestSchema = browserRequestBase.extend({
  action: z.literal('drag'),
  source: z.string().min(1),
  target: z.string().min(1),
});

const screenshotFormatSchema = z.enum(['png', 'jpeg']);

const screenshotRequestSchema = browserRequestBase.extend({
  action: z.literal('screenshot'),
  target: z.string().min(1).optional(),
  path: z.string().optional(),
  fullPage: z.boolean().optional(),
  format: screenshotFormatSchema.optional(),
  quality: z.number().int().min(0).max(100).optional(),
});

const consoleEventsRequestSchema = z.object({
  id: z.string(),
  action: z.literal('console'),
  session: z.string().min(1),
  clear: z.boolean().default(false),
});

const pageErrorsRequestSchema = z.object({
  id: z.string(),
  action: z.literal('errors'),
  session: z.string().min(1),
  clear: z.boolean().default(false),
});

const highlightRequestSchema = browserRequestBase.extend({
  action: z.literal('highlight'),
  target: z.string().min(1),
  durationMs: z.number().int().positive().optional(),
});

const clipboardReadRequestSchema = browserRequestBase.extend({
  action: z.literal('clipboard.read'),
});

const clipboardWriteRequestSchema = browserRequestBase.extend({
  action: z.literal('clipboard.write'),
  text: z.string(),
});

const clipboardCopyRequestSchema = browserRequestBase.extend({
  action: z.literal('clipboard.copy'),
});

const clipboardPasteRequestSchema = browserRequestBase.extend({
  action: z.literal('clipboard.paste'),
});

const getUrlRequestSchema = browserRequestBase.extend({
  action: z.literal('get.url'),
});

const getTitleRequestSchema = browserRequestBase.extend({
  action: z.literal('get.title'),
});

const getTextRequestSchema = browserRequestBase.extend({
  action: z.literal('get.text'),
  target: z.string().min(1),
});

const getValueRequestSchema = browserRequestBase.extend({
  action: z.literal('get.value'),
  target: z.string().min(1),
});

const getHtmlRequestSchema = browserRequestBase.extend({
  action: z.literal('get.html'),
  target: z.string().min(1),
});

const getAttributeRequestSchema = browserRequestBase.extend({
  action: z.literal('get.attr'),
  target: z.string().min(1),
  attribute: z.string().min(1),
});

const getCountRequestSchema = browserRequestBase.extend({
  action: z.literal('get.count'),
  target: z.string().min(1),
});

const getBoxRequestSchema = browserRequestBase.extend({
  action: z.literal('get.box'),
  target: z.string().min(1),
});

const getStylesRequestSchema = browserRequestBase.extend({
  action: z.literal('get.styles'),
  target: z.string().min(1),
});

const elementPredicateRequestSchema = browserRequestBase.extend({
  action: z.enum(['is.visible', 'is.enabled', 'is.checked']),
  target: z.string().min(1),
});

const loadStateSchema = z.enum(['domcontentloaded', 'load', 'networkidle']);

const waitRequestSchema = browserRequestBase.extend({
  action: z.literal('wait'),
  ms: z.number().int().nonnegative().optional(),
  target: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  loadState: loadStateSchema.optional(),
  url: z.string().min(1).optional(),
  fn: z.string().min(1).optional(),
  download: z.boolean().default(false),
  path: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const runtimeSettingSchema = z.union([
  z.object({
    setting: z.literal('viewport'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({
    setting: z.literal('geolocation'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
  }),
  z.object({
    setting: z.literal('offline'),
    value: z.boolean(),
  }),
  z.object({
    setting: z.literal('headers'),
    headers: z.record(z.string(), z.string()),
  }),
  z.object({
    setting: z.literal('credentials'),
    origin: z.string().min(1),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    setting: z.literal('media'),
    colorScheme: z.enum(['dark', 'light', 'no-preference']).optional(),
    reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  }),
]);

const runtimeSetRequestSchema = browserRequestBase.extend({
  action: z.literal('runtime.set'),
  runtime: runtimeSettingSchema,
});

const frameRequestSchema = browserRequestBase.extend({
  action: z.literal('frame'),
  target: z.string().min(1),
});

const dialogStatusRequestSchema = browserRequestBase.extend({
  action: z.literal('dialog.status'),
});

const dialogResolveRequestSchema = browserRequestBase.extend({
  action: z.enum(['dialog.accept', 'dialog.dismiss']),
  text: z.string().optional(),
});

const readModeSchema = z.enum(['text', 'raw', 'outline']);

const readRequestSchema = browserRequestBase.extend({
  action: z.literal('read'),
  url: z.string().min(1).optional(),
  mode: readModeSchema.default('text'),
  filter: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const findLocatorTypeSchema = z.enum(['role', 'text', 'label', 'placeholder', 'alt', 'title', 'testid', 'first', 'last', 'nth']);
const findSubactionSchema = z.enum(['click', 'fill', 'check', 'hover', 'text']);

const findRequestSchema = browserRequestBase.extend({
  action: z.literal('find'),
  locatorType: findLocatorTypeSchema,
  value: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  index: z.number().int().nonnegative().optional(),
  name: z.string().min(1).optional(),
  exact: z.boolean().optional(),
  subaction: findSubactionSchema.default('click'),
  text: z.string().optional(),
});

const evalRequestSchema = browserRequestBase.extend({
  action: z.literal('eval'),
  expression: z.string().min(1),
});

const networkRouteRequestSchema = browserRequestBase.extend({
  action: z.literal('network.route'),
  url: z.string().min(1),
  abort: z.boolean().optional(),
  body: z.string().optional(),
  status: z.number().int().min(100).max(599).optional(),
  contentType: z.string().min(1).optional(),
  resourceTypes: z.array(z.string().min(1)).optional(),
});

const networkUnrouteRequestSchema = z.object({
  id: z.string(),
  action: z.literal('network.unroute'),
  session: z.string().min(1),
  url: z.string().min(1).optional(),
});

const networkRequestsRequestSchema = z.object({
  id: z.string(),
  action: z.literal('network.requests'),
  session: z.string().min(1),
  clear: z.boolean().default(false),
  filter: z.string().min(1).optional(),
  resourceTypes: z.array(z.string().min(1)).optional(),
  method: z.string().min(1).optional(),
  status: z.number().int().min(100).max(599).optional(),
});

const networkRequestRequestSchema = z.object({
  id: z.string(),
  action: z.literal('network.request'),
  session: z.string().min(1),
  requestId: z.string().min(1),
});

const networkHarStartRequestSchema = z.object({
  id: z.string(),
  action: z.literal('network.har.start'),
  session: z.string().min(1),
});

const networkHarStopRequestSchema = z.object({
  id: z.string(),
  action: z.literal('network.har.stop'),
  session: z.string().min(1),
  path: z.string().min(1).optional(),
});

const traceStartRequestSchema = z.object({
  id: z.string(),
  action: z.literal('trace.start'),
  session: z.string().min(1),
  screenshots: z.boolean().optional(),
  snapshots: z.boolean().optional(),
  sources: z.boolean().optional(),
});

const traceStopRequestSchema = z.object({
  id: z.string(),
  action: z.literal('trace.stop'),
  session: z.string().min(1),
  path: z.string().min(1).optional(),
});

const cookiesExportRequestSchema = z.object({
  id: z.string(),
  action: z.literal('cookies.export'),
  session: z.string().min(1).optional(),
  path: z.string().optional(),
});

const cookiesGetRequestSchema = z.object({
  id: z.string(),
  action: z.literal('cookies.get'),
  session: z.string().min(1).optional(),
  urls: z.array(z.string().min(1)).optional(),
});

const cookiesSetRequestSchema = browserRequestBase.extend({
  action: z.literal('cookies.set'),
  name: z.string().min(1).optional(),
  value: z.string().optional(),
  url: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
  curlPath: z.string().min(1).optional(),
});

const cookiesClearRequestSchema = z.object({
  id: z.string(),
  action: z.literal('cookies.clear'),
  session: z.string().min(1).optional(),
});

const cookiesImportRequestSchema = z.object({
  id: z.string(),
  action: z.literal('cookies.import'),
  session: z.string().min(1).optional(),
  path: z.string().min(1),
});

const storageRequestSchema = browserRequestBase.extend({
  action: z.enum(['storage.local', 'storage.session']),
  operation: z.enum(['get', 'set', 'clear']),
  key: z.string().optional(),
  value: z.string().optional(),
});

const stateSaveRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.save'),
  session: z.string().min(1).optional(),
  path: z.string().min(1),
});

const stateLoadRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.load'),
  session: z.string().min(1).optional(),
  path: z.string().min(1),
});

const stateListRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.list'),
});

const stateShowRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.show'),
  path: z.string().min(1),
});

const stateClearRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.clear'),
  path: z.string().min(1).optional(),
  all: z.boolean().default(false),
});

const stateCleanRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.clean'),
});

const stateRenameRequestSchema = z.object({
  id: z.string(),
  action: z.literal('state.rename'),
  from: z.string().min(1),
  to: z.string().min(1),
});

const sessionListRequestSchema = z.object({
  id: z.string(),
  action: z.literal('session.list'),
});

const sessionStopRequestSchema = z.object({
  id: z.string(),
  action: z.literal('session.stop'),
  session: z.string().min(1),
});

const sessionStopAllRequestSchema = z.object({
  id: z.string(),
  action: z.literal('session.stopAll'),
});

const sessionInfoRequestSchema = z.object({
  id: z.string(),
  action: z.literal('session.info'),
  session: z.string().min(1),
});

const tabListRequestSchema = z.object({
  id: z.string(),
  action: z.literal('tab.list'),
  session: z.string().min(1),
});

const profileListRequestSchema = z.object({
  id: z.string(),
  action: z.literal('profile.list'),
});

const profileInspectRequestSchema = z.object({
  id: z.string(),
  action: z.literal('profile.inspect'),
  profile: z.string().min(1),
});

const profileRemoveRequestSchema = z.object({
  id: z.string(),
  action: z.literal('profile.remove'),
  profile: z.string().min(1),
});

const tabNewRequestSchema = browserRequestBase.extend({
  action: z.literal('tab.new'),
  url: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});

const tabCloseRequestSchema = z.object({
  id: z.string(),
  action: z.literal('tab.close'),
  session: z.string().min(1),
  target: z.string().min(1).optional(),
});

const tabActivateRequestSchema = z.object({
  id: z.string(),
  action: z.literal('tab.activate'),
  session: z.string().min(1),
  target: z.string().min(1),
});

const windowNewRequestSchema = browserRequestBase.extend({
  action: z.literal('window.new'),
  url: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});

export const daemonRequestSchema: z.ZodTypeAny = z.discriminatedUnion('action', [
  pingRequestSchema,
  openRequestSchema,
  backRequestSchema,
  forwardRequestSchema,
  reloadRequestSchema,
  snapshotRequestSchema,
  clickRequestSchema,
  downloadRequestSchema,
  dblclickRequestSchema,
  hoverRequestSchema,
  focusRequestSchema,
  fillRequestSchema,
  typeRequestSchema,
  checkRequestSchema,
  uncheckRequestSchema,
  selectRequestSchema,
  pressRequestSchema,
  keyboardDownRequestSchema,
  keyboardUpRequestSchema,
  keyboardTypeRequestSchema,
  keyboardInsertTextRequestSchema,
  mouseMoveRequestSchema,
  mouseDownRequestSchema,
  mouseUpRequestSchema,
  mouseWheelRequestSchema,
  scrollRequestSchema,
  scrollIntoViewRequestSchema,
  uploadRequestSchema,
  dragRequestSchema,
  screenshotRequestSchema,
  consoleEventsRequestSchema,
  pageErrorsRequestSchema,
  highlightRequestSchema,
  clipboardReadRequestSchema,
  clipboardWriteRequestSchema,
  clipboardCopyRequestSchema,
  clipboardPasteRequestSchema,
  getUrlRequestSchema,
  getTitleRequestSchema,
  getTextRequestSchema,
  getValueRequestSchema,
  getHtmlRequestSchema,
  getAttributeRequestSchema,
  getCountRequestSchema,
  getBoxRequestSchema,
  getStylesRequestSchema,
  elementPredicateRequestSchema,
  waitRequestSchema,
  runtimeSetRequestSchema,
  frameRequestSchema,
  dialogStatusRequestSchema,
  dialogResolveRequestSchema,
  readRequestSchema,
  findRequestSchema,
  evalRequestSchema,
  networkRouteRequestSchema,
  networkUnrouteRequestSchema,
  networkRequestsRequestSchema,
  networkRequestRequestSchema,
  networkHarStartRequestSchema,
  networkHarStopRequestSchema,
  traceStartRequestSchema,
  traceStopRequestSchema,
  cookiesExportRequestSchema,
  cookiesGetRequestSchema,
  cookiesSetRequestSchema,
  cookiesClearRequestSchema,
  cookiesImportRequestSchema,
  storageRequestSchema,
  stateSaveRequestSchema,
  stateLoadRequestSchema,
  stateListRequestSchema,
  stateShowRequestSchema,
  stateClearRequestSchema,
  stateCleanRequestSchema,
  stateRenameRequestSchema,
  sessionListRequestSchema,
  sessionStopRequestSchema,
  sessionStopAllRequestSchema,
  sessionInfoRequestSchema,
  profileListRequestSchema,
  profileInspectRequestSchema,
  profileRemoveRequestSchema,
  tabListRequestSchema,
  tabNewRequestSchema,
  tabCloseRequestSchema,
  tabActivateRequestSchema,
  windowNewRequestSchema,
]);

const successResponseSchema = z.object({
  id: z.string(),
  success: z.literal(true),
  data: z.unknown(),
});

const errorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

const failureResponseSchema = z.object({
  id: z.string(),
  success: z.literal(false),
  error: errorPayloadSchema,
});

export const daemonResponseSchema = z.union([successResponseSchema, failureResponseSchema]);

export type DaemonRequest =
  | z.infer<typeof pingRequestSchema>
  | z.infer<typeof openRequestSchema>
  | z.infer<typeof backRequestSchema>
  | z.infer<typeof forwardRequestSchema>
  | z.infer<typeof reloadRequestSchema>
  | z.infer<typeof snapshotRequestSchema>
  | z.infer<typeof clickRequestSchema>
  | z.infer<typeof downloadRequestSchema>
  | z.infer<typeof dblclickRequestSchema>
  | z.infer<typeof hoverRequestSchema>
  | z.infer<typeof focusRequestSchema>
  | z.infer<typeof fillRequestSchema>
  | z.infer<typeof typeRequestSchema>
  | z.infer<typeof checkRequestSchema>
  | z.infer<typeof uncheckRequestSchema>
  | z.infer<typeof selectRequestSchema>
  | z.infer<typeof pressRequestSchema>
  | z.infer<typeof keyboardDownRequestSchema>
  | z.infer<typeof keyboardUpRequestSchema>
  | z.infer<typeof keyboardTypeRequestSchema>
  | z.infer<typeof keyboardInsertTextRequestSchema>
  | z.infer<typeof mouseMoveRequestSchema>
  | z.infer<typeof mouseDownRequestSchema>
  | z.infer<typeof mouseUpRequestSchema>
  | z.infer<typeof mouseWheelRequestSchema>
  | z.infer<typeof scrollRequestSchema>
  | z.infer<typeof scrollIntoViewRequestSchema>
  | z.infer<typeof uploadRequestSchema>
  | z.infer<typeof dragRequestSchema>
  | z.infer<typeof screenshotRequestSchema>
  | z.infer<typeof consoleEventsRequestSchema>
  | z.infer<typeof pageErrorsRequestSchema>
  | z.infer<typeof highlightRequestSchema>
  | z.infer<typeof clipboardReadRequestSchema>
  | z.infer<typeof clipboardWriteRequestSchema>
  | z.infer<typeof clipboardCopyRequestSchema>
  | z.infer<typeof clipboardPasteRequestSchema>
  | z.infer<typeof getUrlRequestSchema>
  | z.infer<typeof getTitleRequestSchema>
  | z.infer<typeof getTextRequestSchema>
  | z.infer<typeof getValueRequestSchema>
  | z.infer<typeof getHtmlRequestSchema>
  | z.infer<typeof getAttributeRequestSchema>
  | z.infer<typeof getCountRequestSchema>
  | z.infer<typeof getBoxRequestSchema>
  | z.infer<typeof getStylesRequestSchema>
  | z.infer<typeof elementPredicateRequestSchema>
  | z.infer<typeof waitRequestSchema>
  | z.infer<typeof runtimeSetRequestSchema>
  | z.infer<typeof frameRequestSchema>
  | z.infer<typeof dialogStatusRequestSchema>
  | z.infer<typeof dialogResolveRequestSchema>
  | z.infer<typeof readRequestSchema>
  | z.infer<typeof findRequestSchema>
  | z.infer<typeof evalRequestSchema>
  | z.infer<typeof networkRouteRequestSchema>
  | z.infer<typeof networkUnrouteRequestSchema>
  | z.infer<typeof networkRequestsRequestSchema>
  | z.infer<typeof networkRequestRequestSchema>
  | z.infer<typeof networkHarStartRequestSchema>
  | z.infer<typeof networkHarStopRequestSchema>
  | z.infer<typeof traceStartRequestSchema>
  | z.infer<typeof traceStopRequestSchema>
  | z.infer<typeof cookiesExportRequestSchema>
  | z.infer<typeof cookiesGetRequestSchema>
  | z.infer<typeof cookiesSetRequestSchema>
  | z.infer<typeof cookiesClearRequestSchema>
  | z.infer<typeof cookiesImportRequestSchema>
  | z.infer<typeof storageRequestSchema>
  | z.infer<typeof stateSaveRequestSchema>
  | z.infer<typeof stateLoadRequestSchema>
  | z.infer<typeof stateListRequestSchema>
  | z.infer<typeof stateShowRequestSchema>
  | z.infer<typeof stateClearRequestSchema>
  | z.infer<typeof stateCleanRequestSchema>
  | z.infer<typeof stateRenameRequestSchema>
  | z.infer<typeof sessionListRequestSchema>
  | z.infer<typeof sessionStopRequestSchema>
  | z.infer<typeof sessionStopAllRequestSchema>
  | z.infer<typeof sessionInfoRequestSchema>
  | z.infer<typeof profileListRequestSchema>
  | z.infer<typeof profileInspectRequestSchema>
  | z.infer<typeof profileRemoveRequestSchema>
  | z.infer<typeof tabListRequestSchema>
  | z.infer<typeof tabNewRequestSchema>
  | z.infer<typeof tabCloseRequestSchema>
  | z.infer<typeof tabActivateRequestSchema>
  | z.infer<typeof windowNewRequestSchema>;
export type DaemonResponse = z.infer<typeof daemonResponseSchema>;
export type DaemonSuccessResponse = z.infer<typeof successResponseSchema>;
export type DaemonFailureResponse = z.infer<typeof failureResponseSchema>;

export function createRequestId(): string {
  return `req_${randomUUID()}`;
}

export function successResponse(id: string, data: unknown): DaemonSuccessResponse {
  return {
    id,
    success: true,
    data,
  };
}

export function failureResponse(id: string, error: ErrorPayload): DaemonFailureResponse {
  return {
    id,
    success: false,
    error,
  };
}
