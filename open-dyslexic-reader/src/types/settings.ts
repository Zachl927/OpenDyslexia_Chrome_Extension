export interface SiteSetting {
  enabled: boolean;
  force: boolean; // Add this
  fontSize: number;       // multiplier, e.g. 1.0
  spacing: number;        // px, e.g. 0
  lineHeight: number;     // multiplier, e.g. 1.4
}

export interface Settings {
  globalEnabled: boolean;                // default false
  siteSettings: Record<string, SiteSetting>;
  defaultFontSize: number;               // 1.0
  defaultLetterSpacing: number;          // 0
  defaultLineHeight: number;             // 1.6 (or PRD default)
  excludeSites: string[];                // sites in "safe mode"
}

export const DEFAULT_SETTINGS: Settings = {
  globalEnabled: false,
  siteSettings: {},
  defaultFontSize: 1.0,
  defaultLetterSpacing: 0,
  defaultLineHeight: 1.6,
  excludeSites: []
};
