import type { Message } from '../types/messaging';

export function send(payload: Message): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, () => {
      const e = chrome.runtime.lastError;
      if (e) reject(e);
      else resolve();
    });
  });
}

let pingTimeout: number | undefined;

export function ping(payload: Message, wait = 60): void {
  // Debounced fire-and-forget (used for sliders)
  window.clearTimeout(pingTimeout);
  pingTimeout = window.setTimeout(() => { send(payload).catch(() => {}); }, wait);
}
