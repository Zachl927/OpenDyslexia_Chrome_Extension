import type { Settings, SiteSetting } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}

export async function setSiteSetting(origin: string, patch: Partial<SiteSetting>): Promise<Settings> {
  const settings = await getSettings();
  const newSiteSettings = {
    ...settings.siteSettings,
    [origin]: {
      ...settings.siteSettings[origin],
      ...patch
    }
  };
  const newSettings = { ...settings, siteSettings: newSiteSettings };
  await setSettings(newSettings);
  return newSettings;
}
