import { X } from 'lucide-react';
import type { AppSettings, RGBColor, ThemeMode } from '../types/document';

interface SettingsDrawerProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onChange: (settings: AppSettings) => void;
}

function ColorEditor({ label, value, onChange }: { label: string; value: RGBColor; onChange: (color: RGBColor) => void }) {
  function set(channel: keyof RGBColor, raw: string) {
    const parsed = Math.max(0, Math.min(255, Number(raw) || 0));
    onChange({ ...value, [channel]: parsed });
  }

  return (
    <fieldset className="rgb-editor">
      <legend>{label}</legend>
      {(['r', 'g', 'b'] as const).map((channel) => (
        <label key={channel}>
          {channel.toUpperCase()}
          <input type="number" min="0" max="255" value={value[channel]} onChange={(e) => set(channel, e.target.value)} />
        </label>
      ))}
      <span className="color-preview" style={{ background: `rgb(${value.r} ${value.g} ${value.b})` }} />
    </fieldset>
  );
}

export function SettingsDrawer({ open, settings, onClose, onChange }: SettingsDrawerProps) {
  if (!open) return null;

  function setThemeMode(themeMode: ThemeMode) {
    onChange({ ...settings, themeMode });
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Configurações de aparência">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Aparência</span>
            <h2>Tema do aplicativo</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar configurações"><X size={20} /></button>
        </div>

        <label className="field">
          Tema
          <select value={settings.themeMode} onChange={(e) => setThemeMode(e.target.value as ThemeMode)}>
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
            <option value="custom">Personalizado RGB</option>
          </select>
        </label>

        {settings.themeMode === 'custom' && (
          <div className="stack">
            <ColorEditor label="Texto" value={settings.customText} onChange={(customText) => onChange({ ...settings, customText })} />
            <ColorEditor label="Fundo" value={settings.customBackground} onChange={(customBackground) => onChange({ ...settings, customBackground })} />
            <ColorEditor label="Destaque" value={settings.customAccent} onChange={(customAccent) => onChange({ ...settings, customAccent })} />
          </div>
        )}

        <div className="notice compact">
          As preferências são persistidas no IndexedDB. O aplicativo não usa <code>localStorage</code> nem <code>sessionStorage</code>.
        </div>
      </aside>
    </div>
  );
}
