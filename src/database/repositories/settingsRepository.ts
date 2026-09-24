import { db } from '../db';
import type { AppSettings } from '../../types/document';

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  customText: { r: 232, g: 238, b: 247 },
  customBackground: { r: 11, g: 17, b: 27 },
  customAccent: { r: 92, g: 124, b: 250 },
};

const SETTINGS_KEY = 'appearance';

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    return (await db.settings.get(SETTINGS_KEY))?.value ?? DEFAULT_SETTINGS;
  },

  async save(value: AppSettings): Promise<void> {
    await db.settings.put({ key: SETTINGS_KEY, value });
  },
};
