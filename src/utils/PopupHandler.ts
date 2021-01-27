import { EventEmitter } from "events";

import { isExtension } from "./helpers";

class PopupHandler extends EventEmitter {
  url: URL;

  target: string;

  features: string;

  window: Window | browser.windows.Window;

  windowTimer: number;

  iClosedWindow: boolean;

  constructor({ url, target, features }: { url: URL; target?: string; features?: string }) {
    super();
    this.url = url;
    this.target = target || "_blank";
    this.features = features || "directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=700,width=1200";
    this.window = undefined;
    this.windowTimer = undefined;
    this.iClosedWindow = false;
    this._setupTimer();
  }

  _setupTimer(): void {
    this.windowTimer = Number(
      setInterval(() => {
        if (!isExtension) {
          const localWindow = this.window as Window;
          if (localWindow && localWindow.closed) {
            clearInterval(this.windowTimer);
            if (!this.iClosedWindow) {
              this.emit("close");
            }
            this.iClosedWindow = false;
            this.window = undefined;
          }
        }
        if (this.window === undefined) clearInterval(this.windowTimer);
      }, 500)
    );
    if (isExtension) {
      const localWindow = this.window as browser.windows.Window;
      const listener = (id: number) => {
        if (id === localWindow.id) {
          if (!this.iClosedWindow) {
            this.emit("close");
          }
          this.iClosedWindow = false;
          this.window = undefined;
          browser.windows.onRemoved.removeListener(listener);
        }
      };
      browser.windows.onRemoved.addListener(listener);
    }
  }

  async open(): Promise<void> {
    if (!isExtension) {
      this.window = window.open(this.url.href, this.target, this.features);
      return;
    }
    this.window = await browser.windows.create({ url: this.url.href, type: "popup" });
  }

  async close(): Promise<void> {
    this.iClosedWindow = true;
    if (this.window) {
      if (!isExtension) {
        const localWindow = this.window as Window;
        localWindow.close();
      } else {
        const localWindow = this.window as browser.windows.Window;
        if (localWindow.id) await browser.windows.remove(localWindow.id);
      }
    }
  }
}

export default PopupHandler;
