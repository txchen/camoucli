import type { BrowserManager } from '../browser/manager.js';
import type { DaemonRequest } from '../ipc/protocol.js';

export class DaemonRouter {
  constructor(private readonly browserManager: BrowserManager) {}

  async handle(request: DaemonRequest): Promise<unknown> {
    switch (request.action) {
      case 'ping':
        return { ok: true, pid: process.pid };
      case 'open':
        return this.browserManager.open(request);
      case 'snapshot':
        return this.browserManager.snapshot(request);
      case 'click':
        return this.browserManager.click(request);
      case 'fill':
        return this.browserManager.fill(request);
      case 'press':
        return this.browserManager.press(request);
      case 'screenshot':
        return this.browserManager.screenshot(request);
      case 'get.url':
        return this.browserManager.getUrl(request);
      case 'get.title':
        return this.browserManager.getTitle(request);
      case 'get.text':
        return this.browserManager.getText(request);
      case 'wait':
        return this.browserManager.wait(request);
      case 'session.list':
        return this.browserManager.listSessions();
      case 'session.stop':
        return this.browserManager.stopSession(request.session);
      case 'tab.list':
        return this.browserManager.listTabs(request.session);
      case 'tab.new':
        return this.browserManager.newTab(request);
      case 'tab.close':
        return this.browserManager.closeTab(request.session, request.target);
    }
  }
}
