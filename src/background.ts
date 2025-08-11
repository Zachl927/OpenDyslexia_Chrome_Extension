import { getSettings, setSettings } from './lib/storage';
import type { Settings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';

console.log('OpenDyslexic Reader background script loaded.');

/**
 * On extension installation or update, this ensures that the settings in storage
 * contain all the default keys, without overwriting existing user data.
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const newSettings: Partial<Settings> = {};
    let needsUpdate = false;

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (stored[key] === undefined) {
        (newSettings as Record<keyof Settings, unknown>)[key as keyof Settings] = DEFAULT_SETTINGS[key as keyof Settings];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await setSettings(newSettings);
      console.log('Default settings have been initialized for missing keys.');
    }
  } catch (_e) {
    console.error(`Error during onInstalled:`, _e);
  }
});

// Type definitions for messages between different parts of the extension.
// This creates a discriminated union, allowing for type-safe message handling.
type Message =
  | { action: 'GET_SETTINGS'; site: string }
  | {
      action: 'UPDATE_SETTINGS';
      site: string;
      fontSize?: number;
      spacing?: number;
      lineHeight?: number;
      force?: boolean;
    }
  | {
      action: 'SET_DEFAULTS';
      defaultFontSize?: number;
      defaultLetterSpacing?: number;
      defaultLineHeight?: number;
      globalEnabled?: boolean;
    }
  | { action: 'EXCLUDE_SITE'; site: string }
  | { action: 'REMOVE_EXCLUDED_SITE'; site: string }
  // Options page messages
  | { action: 'GET_ALL_SETTINGS' }
  | { action: 'SET_DEFAULTS'; defaultFontSize?: number; defaultLetterSpacing?: number; defaultLineHeight?: number; globalEnabled?: boolean }
  | { action: 'SET_SITE_ENABLED'; site: string; enabled: boolean }
  | { action: 'REMOVE_SITE'; site: string }
  | { action: 'RESET_ALL' }
  // Broadcast message
  | { action: 'SETTINGS_UPDATED'; newSettings: Settings };

/**
 * Normalizes a URL or origin string to a consistent format. It extracts the
 * hostname and converts it to lowercase, stripping any port number.
 * @param input The URL or origin string.
 * @returns The normalized origin.
 */
const normalizeOrigin = (input: string): string => {
  try {
    return new URL(input).hostname.toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    // Fallback for origins that are not full URLs.
    const sanitized = input.includes('://')
      ? input.split('/')[2]
      : input.split('/')[0];
    return sanitized.split(':')[0].toLowerCase();
  }
};

/**
 * Iterates through all open tabs and sends each one the latest calculated
 * settings. This is used to apply global changes immediately.
 */
async function propagateAllSettings() {
  try {
    const s = await getSettings();
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      const origin = normalizeOrigin(tab.url);
      if (origin.startsWith('chrome-extension:') || origin.startsWith('chrome:')) {
        continue;
      }

      const isExcluded = s.excludeSites.includes(origin);
      const perSite = s.siteSettings[origin];
      const isEnabled = isExcluded ? false : (perSite?.enabled ?? s.globalEnabled);

      const settingsForTab = {
        enabled: isEnabled,
        fontSize: perSite?.fontSize ?? s.defaultFontSize,
        spacing: perSite?.spacing ?? s.defaultLetterSpacing,
        lineHeight: perSite?.lineHeight ?? s.defaultLineHeight,
      };

      if (settingsForTab.enabled) {
        chrome.tabs.sendMessage(tab.id, { action: 'UPDATE_STYLE', ...settingsForTab })
          .catch(() => { /* Suppress error if content script isn't there */ });
      } else {
        chrome.tabs.sendMessage(tab.id, { action: 'SET_FONT', enabled: false })
          .catch(() => { /* Suppress error if content script isn't there */ });
      }
    }
    // Also broadcast a general settings update for any UI pages.
    chrome.runtime.sendMessage({ action: 'SETTINGS_UPDATED', newSettings: s });
  } catch (_e) {
    console.error(`Error during settings propagation:`, _e);
  }
}

/**
 * Handles incoming messages from other parts of the extension, like popups or content scripts.
 * It uses a type-safe switch to delegate to appropriate handlers.
 */
chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  // Immediately invoked async function to handle promises.
  (async () => {
    try {
      console.log('Received message:', msg);
      const origin = normalizeOrigin(
        'site' in msg ? msg.site : 'unknown'
      );

      switch (msg.action) {
        case 'GET_SETTINGS': {
          const s = await getSettings();
          const siteSettings = s.siteSettings[origin];
          const isExcluded = s.excludeSites.includes(origin);

          const response = {
            enabled: isExcluded ? false : siteSettings?.enabled ?? s.globalEnabled,
            force: siteSettings?.force ?? false,
            fontSize: siteSettings?.fontSize ?? s.defaultFontSize,
            spacing: siteSettings?.spacing ?? s.defaultLetterSpacing,
            lineHeight: siteSettings?.lineHeight ?? s.defaultLineHeight,
            isExcluded,
          };
          sendResponse(response);
          break;
        }

        case 'UPDATE_SETTINGS': {
          const s = await getSettings();
          const site = s.siteSettings[origin] ?? {};
          const updatedSite = {
            ...site,
            fontSize: msg.fontSize ?? site.fontSize,
            spacing: msg.spacing ?? site.spacing,
            lineHeight: msg.lineHeight ?? site.lineHeight,
            force: msg.force ?? site.force,
          };
          await setSettings({
            siteSettings: { ...s.siteSettings, [origin]: updatedSite }
          });
          await propagateAllSettings();
          sendResponse({ status: 'ok' });
          break;
        }

        case 'EXCLUDE_SITE': {
          const s = await getSettings();
          const updatedExcludes = [...new Set([...s.excludeSites, origin])];
          const site = s.siteSettings[origin] ?? {};
          const updatedSite = { ...site, enabled: false };

          await setSettings({
            excludeSites: updatedExcludes,
            siteSettings: { ...s.siteSettings, [origin]: updatedSite },
          });
          await propagateAllSettings();
          sendResponse({ status: 'ok' });
          break;
        }

        case 'REMOVE_EXCLUDED_SITE': {
          const s = await getSettings();
          const updatedExcludes = s.excludeSites.filter(site => site !== origin);
          await setSettings({ excludeSites: updatedExcludes });
          await propagateAllSettings();
          sendResponse({ ok: true }); return;
        }

        // ----------------------------------------------------------------
        // Options Page Handlers
        // ----------------------------------------------------------------
        case 'GET_ALL_SETTINGS': {
          const s = await getSettings();
          sendResponse(s); return;
        }

        case 'SET_DEFAULTS': {
          const patch: Partial<Settings> = {};
          if (typeof msg.defaultFontSize === 'number') patch.defaultFontSize = msg.defaultFontSize;
          if (typeof msg.defaultLetterSpacing === 'number') patch.defaultLetterSpacing = msg.defaultLetterSpacing;
          if (typeof msg.defaultLineHeight === 'number') patch.defaultLineHeight = msg.defaultLineHeight;
          if (typeof msg.globalEnabled === 'boolean') patch.globalEnabled = msg.globalEnabled;
          await setSettings(patch);
          await propagateAllSettings();
          sendResponse({ ok: true });
          return;
        }

        case 'SET_SITE_ENABLED': {
          const s = await getSettings();
          const siteSettings = s.siteSettings[origin] ?? {};
          const updatedSite = { ...siteSettings, enabled: !!msg.enabled };
          await setSettings({
            siteSettings: { ...s.siteSettings, [origin]: updatedSite },
          });
          await propagateAllSettings();
          sendResponse({ ok: true });
          return;
        }

        case 'REMOVE_SITE': {
          const s = await getSettings();
          const next = { ...s.siteSettings };
          delete next[origin];
          await setSettings({ siteSettings: next });
          await propagateAllSettings();
          sendResponse({ ok: true }); return;
        }
        
        case 'RESET_ALL': {
          await setSettings(DEFAULT_SETTINGS);
          await propagateAllSettings();
          sendResponse({ ok: true }); return;
        }

        case 'SETTINGS_UPDATED': {
          // This is a broadcast message, so we don't do anything here.
          // It's received by UI components.
          break;
        }

        default: {
          const exhaustiveCheck: never = msg;
          console.warn('Unreachable case in onMessage:', exhaustiveCheck);
          break;
        }
      }
    } catch (err) {
      console.error(
        `Error in onMessage for action ${msg.action}:`,
        err
      );
    }
  })();

  return true; // Keep message channel open for async response
});

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  try {
    if (cmd !== 'toggle-font' || !tab?.url || !tab.id) return;
    const origin = normalizeOrigin(tab.url);

    const s = await getSettings();
    const prev = s.siteSettings[origin] ?? {
      enabled: s.globalEnabled, // Use global enabled as baseline
      fontSize: s.defaultFontSize,
      spacing: s.defaultLetterSpacing,
      lineHeight: s.defaultLineHeight,
      force: false,
    };
    const next = { ...prev, enabled: !prev.enabled };

    await setSettings({ siteSettings: { ...s.siteSettings, [origin]: next } });
    await propagateAllSettings();
  } catch (_e) {
    console.error(`Error handling command "${cmd}" for tab ${tab?.id}:`, _e);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status !== 'complete' || !tab.url) return;
    const origin = normalizeOrigin(tab.url);

    const s = await getSettings();
    if (s.excludeSites.includes(origin)) return;

    const per = s.siteSettings[origin];
    const shouldEnable = per?.enabled ?? s.globalEnabled;
    if (!shouldEnable) return;

    const fontSize = per?.fontSize ?? s.defaultFontSize;
    const spacing = per?.spacing ?? s.defaultLetterSpacing;
    const lineHeight = per?.lineHeight ?? s.defaultLineHeight;

    await chrome.tabs.sendMessage(tabId, {
      action: 'SET_FONT',
      enabled: true,
      fontSize, spacing, lineHeight
    });
  } catch (_e) {
    if (_e instanceof Error && _e.message.includes('Receiving end does not exist')) {
      // Suppress this error, as it's common when the content script isn't ready.
      return;
    }
    console.error(`Error during onUpdated for tab ${tabId} and origin ${tab.url}:`, _e);
  }
});
