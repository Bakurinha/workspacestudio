import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, settingsRepository } from '../database/repositories/settingsRepository';
import type { AppSettings, RGBColor } from '../types/document';

const rgb = (color: RGBColor) => `rgb(${color.r} ${color.g} ${color.b})`;

function applySettings(settings: AppSettings): void {
  const root = document.documentElement;
  root.dataset.theme = settings.themeMode;

  if (settings.themeMode === 'custom') {
    root.style.setProperty('--color-text', rgb(settings.customText));
    root.style.setProperty('--color-bg', rgb(settings.customBackground));
    root.style.setProperty('--color-accent', rgb(settings.customAccent));
  } else {
    root.style.removeProperty('--color-text');
    root.style.removeProperty('--color-bg');
    root.style.removeProperty('--color-accent');
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    settingsRepository.get().then((stored) => {
      setSettings(stored);
      applySettings(stored);
      setReady(true);
    });
  }, []);

  async function update(next: AppSettings): Promise<void> {
    setSettings(next);
    applySettings(next);
    await settingsRepository.save(next);
  }

  return { settings, updateSettings: update, ready };
}
