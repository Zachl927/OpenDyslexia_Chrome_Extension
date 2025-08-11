import type { Settings } from './settings';

// A mapping of all possible message actions to their payload types.
// This is used to create a discriminated union, which makes message handling type-safe.

export type Message =
  | { action: 'GET_ALL_SETTINGS' }
  | { action: 'GET_SETTINGS'; site: string }
  | {
      action: 'SET_DEFAULTS';
      globalEnabled: boolean;
      defaultFontSize: number;
      defaultLetterSpacing: number;
      defaultLineHeight: number;
    }
  | { action: 'RESET_ALL' }
  | { action: 'SET_SITE_ENABLED'; site: string; enabled: boolean }
  | { action: 'REMOVE_SITE'; site: string }
  | { action: 'EXCLUDE_SITE'; site: string }
  | { action: 'REMOVE_EXCLUDED_SITE'; site: string }
  | {
      action: 'UPDATE_SETTINGS';
      site: string;
      force?: boolean;
      fontSize?: number;
      spacing?: number;
      lineHeight?: number;
    }
  | {
      action: 'SETTINGS_UPDATED';
      newSettings: Settings;
    };
