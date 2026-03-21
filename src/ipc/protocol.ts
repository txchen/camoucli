import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { launchInputSchema } from '../camoufox/config.js';
import type { ErrorPayload } from '../util/errors.js';

const browserRequestBase = launchInputSchema.extend({
  id: z.string(),
  session: z.string().min(1),
  tabName: z.string().min(1),
});

const pingRequestSchema = z.object({
  id: z.string(),
  action: z.literal('ping'),
});

const openRequestSchema = browserRequestBase.extend({
  action: z.literal('open'),
  url: z.string().min(1),
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
});

const hoverRequestSchema = browserRequestBase.extend({
  action: z.literal('hover'),
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
  value: z.string(),
});

const pressRequestSchema = browserRequestBase.extend({
  action: z.literal('press'),
  key: z.string().min(1),
});

const scrollRequestSchema = browserRequestBase.extend({
  action: z.literal('scroll'),
  direction: z.enum(['up', 'down', 'left', 'right']),
  amount: z.number().int().positive().optional(),
});

const scrollIntoViewRequestSchema = browserRequestBase.extend({
  action: z.literal('scroll.intoView'),
  target: z.string().min(1),
});

const screenshotRequestSchema = browserRequestBase.extend({
  action: z.literal('screenshot'),
  path: z.string().optional(),
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

const loadStateSchema = z.enum(['domcontentloaded', 'load', 'networkidle']);

const waitRequestSchema = browserRequestBase.extend({
  action: z.literal('wait'),
  target: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  loadState: loadStateSchema.optional(),
  timeoutMs: z.number().int().positive().optional(),
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
});

const tabCloseRequestSchema = z.object({
  id: z.string(),
  action: z.literal('tab.close'),
  session: z.string().min(1),
  target: z.string().min(1),
});

export const daemonRequestSchema = z.discriminatedUnion('action', [
  pingRequestSchema,
  openRequestSchema,
  backRequestSchema,
  forwardRequestSchema,
  reloadRequestSchema,
  snapshotRequestSchema,
  clickRequestSchema,
  hoverRequestSchema,
  fillRequestSchema,
  typeRequestSchema,
  checkRequestSchema,
  uncheckRequestSchema,
  selectRequestSchema,
  pressRequestSchema,
  scrollRequestSchema,
  scrollIntoViewRequestSchema,
  screenshotRequestSchema,
  getUrlRequestSchema,
  getTitleRequestSchema,
  getTextRequestSchema,
  getValueRequestSchema,
  waitRequestSchema,
  evalRequestSchema,
  cookiesExportRequestSchema,
  cookiesImportRequestSchema,
  sessionListRequestSchema,
  sessionStopRequestSchema,
  sessionStopAllRequestSchema,
  profileListRequestSchema,
  profileInspectRequestSchema,
  profileRemoveRequestSchema,
  tabListRequestSchema,
  tabNewRequestSchema,
  tabCloseRequestSchema,
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
