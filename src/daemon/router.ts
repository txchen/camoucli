import packageJson from '../../package.json' with { type: 'json' };

import type { BrowserManager } from '../browser/manager.js';
import type { DaemonRequest } from '../ipc/protocol.js';

export class DaemonRouter {
  constructor(private readonly browserManager: BrowserManager) {}

  async handle(request: DaemonRequest): Promise<unknown> {
    switch (request.action) {
      case 'ping':
        return { ok: true, pid: process.pid, version: packageJson.version };
      case 'open':
        return this.browserManager.open(request);
      case 'back':
        return this.browserManager.back(request);
      case 'forward':
        return this.browserManager.forward(request);
      case 'reload':
        return this.browserManager.reload(request);
      case 'snapshot':
        return this.browserManager.snapshot(request);
      case 'click':
        return this.browserManager.click(request);
      case 'download':
        return this.browserManager.download(request);
      case 'dblclick':
        return this.browserManager.dblclick(request);
      case 'hover':
        return this.browserManager.hover(request);
      case 'focus':
        return this.browserManager.focus(request);
      case 'fill':
        return this.browserManager.fill(request);
      case 'type':
        return this.browserManager.type(request);
      case 'check':
        return this.browserManager.check(request);
      case 'uncheck':
        return this.browserManager.uncheck(request);
      case 'select':
        return this.browserManager.select(request);
      case 'press':
        return this.browserManager.press(request);
      case 'keyboard.down':
        return this.browserManager.keyboardDown(request);
      case 'keyboard.up':
        return this.browserManager.keyboardUp(request);
      case 'keyboard.type':
        return this.browserManager.keyboardType(request);
      case 'keyboard.insertText':
        return this.browserManager.keyboardInsertText(request);
      case 'mouse.move':
        return this.browserManager.mouseMove(request);
      case 'mouse.down':
        return this.browserManager.mouseDown(request);
      case 'mouse.up':
        return this.browserManager.mouseUp(request);
      case 'mouse.wheel':
        return this.browserManager.mouseWheel(request);
      case 'scroll':
        return this.browserManager.scroll(request);
      case 'scroll.intoView':
        return this.browserManager.scrollIntoView(request);
      case 'upload':
        return this.browserManager.upload(request);
      case 'drag':
        return this.browserManager.drag(request);
      case 'screenshot':
        return this.browserManager.screenshot(request);
      case 'get.url':
        return this.browserManager.getUrl(request);
      case 'get.title':
        return this.browserManager.getTitle(request);
      case 'get.text':
        return this.browserManager.getText(request);
      case 'get.value':
        return this.browserManager.getValue(request);
      case 'get.html':
        return this.browserManager.getHtml(request);
      case 'get.attr':
        return this.browserManager.getAttribute(request);
      case 'get.count':
        return this.browserManager.getCount(request);
      case 'get.box':
        return this.browserManager.getBox(request);
      case 'get.styles':
        return this.browserManager.getStyles(request);
      case 'is.visible':
      case 'is.enabled':
      case 'is.checked':
        return this.browserManager.elementPredicate(request);
      case 'wait':
        return this.browserManager.wait(request);
      case 'runtime.set':
        return this.browserManager.setRuntime(request);
      case 'frame':
        return this.browserManager.setFrame(request);
      case 'dialog.status':
        return this.browserManager.dialogStatus(request);
      case 'dialog.accept':
      case 'dialog.dismiss':
        return this.browserManager.resolveDialog(request);
      case 'read':
        return this.browserManager.read(request);
      case 'find':
        return this.browserManager.find(request);
      case 'eval':
        return this.browserManager.eval(request);
      case 'cookies.export':
        return this.browserManager.exportCookies({ session: request.session ?? 'default', path: request.path });
      case 'cookies.import':
        return this.browserManager.importCookies({ session: request.session ?? 'default', path: request.path });
      case 'session.list':
        return this.browserManager.listSessions();
      case 'session.stop':
        return this.browserManager.stopSession(request.session);
      case 'session.stopAll':
        return this.browserManager.stopAllSessions();
      case 'session.info':
        return this.browserManager.sessionInfo(request.session);
      case 'profile.list':
        return this.browserManager.listStoredProfiles();
      case 'profile.inspect':
        return this.browserManager.inspectStoredProfile(request.profile);
      case 'profile.remove':
        return this.browserManager.removeStoredProfile(request.profile);
      case 'tab.list':
        return this.browserManager.listTabs(request.session);
      case 'tab.new':
        return this.browserManager.newTab(request);
      case 'tab.close':
        return this.browserManager.closeTab(request.session, request.target);
      case 'tab.activate':
        return this.browserManager.activateTab(request.session, request.target);
      case 'window.new':
        return this.browserManager.newWindow(request);
    }
  }
}
