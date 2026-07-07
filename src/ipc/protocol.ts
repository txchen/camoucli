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

const cookiesExportRequestSchema = z.object({
  id: z.string(),
  action: z.literal('cookies.export'),
  session: z.string().min(1).optional(),
  path: z.string().optional(),
});

const cookiesImportRequestSchema = z.object({
  id: z.string(),
  action: z.literal('cookies.import'),
  session: z.string().min(1).optional(),
  path: z.string().min(1),
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

export const daemonRequestSchema = z.discriminatedUnion('action', [
  pingRequestSchema,
  openRequestSchema,
  backRequestSchema,
  forwardRequestSchema,
  reloadRequestSchema,
  snapshotRequestSchema,
  clickRequestSchema,
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
  findRequestSchema,
  evalRequestSchema,
  cookiesExportRequestSchema,
  cookiesImportRequestSchema,
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

export type DaemonRequest = z.infer<typeof daemonRequestSchema>;
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
