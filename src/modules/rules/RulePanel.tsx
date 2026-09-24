import { useEffect, useMemo, useState } from 'react';
import { Play, Save, Sparkles, X } from 'lucide-react';
import { ruleRepository } from '../../database/repositories/ruleRepository';
import type { ColumnRule, SpreadsheetSheet, RuleType } from '../../types/document';
import { buildRuleChanges } from './ruleEngine';

interface RulePanelProps {
  open: boolean;
  sheet: SpreadsheetSheet;
  sheetIndex: number;
  onClose: () => void;
  onApply: (rule: ColumnRule) => Promise<void> | void;
}

const PRESETS: Array<{ label: string; type: RuleType; template?: string }> = [
  { label: 'Serial sequencial', type: 'template', template: 'ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA' },
  { label: 'Adicionar prefixo', type: 'prefix' },
  { label: 'Adicionar sufixo', type: 'suffix' },
  { label: 'MAIÚSCULAS', type: 'uppercase' },
  { label: 'minúsculas', type: 'lowercase' },
  { label: 'Remover espaços externos', type: 'trim' },
  { label: 'Localizar e substituir', type: 'replace' },
];

function newRule(sheet: SpreadsheetSheet): ColumnRule {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Nova regra',
    type: 'template',
    targetColumn: sheet.headers[0] ?? '',
    template: 'ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA',
    sequenceStart: 1,
    sequenceStep: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function RulePanel({ open, sheet, sheetIndex, onClose, onApply }: RulePanelProps) {
  const [rule, setRule] = useState<ColumnRule>(() => newRule(sheet));
  const [savedRules, setSavedRules] = useState<ColumnRule[]>([]);

  useEffect(() => {
    if (open) void ruleRepository.list().then(setSavedRules);
  }, [open]);

  useEffect(() => {
    if (!sheet.headers.includes(rule.targetColumn)) {
      setRule((current) => ({ ...current, targetColumn: sheet.headers[0] ?? '' }));
    }
  }, [sheet.headers, rule.targetColumn]);

  const changes = useMemo(() => {
    try {
      return buildRuleChanges(sheet, sheetIndex, rule);
    } catch {
      return [];
    }
  }, [rule, sheet, sheetIndex]);
  const preview = changes.slice(0, 5);

  if (!open) return null;

  function choosePreset(type: RuleType, template?: string) {
    setRule((current) => ({ ...current, type, template: template ?? current.template }));
  }

  async function saveRule() {
    const updated = { ...rule, updatedAt: new Date().toISOString() };
    await ruleRepository.save(updated);
    setRule(updated);
    setSavedRules(await ruleRepository.list());
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer wide" onMouseDown={(event) => event.stopPropagation()} aria-label="Motor de regras">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Automação</span>
            <h2>Regra de coluna</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        <div className="preset-grid">
          {PRESETS.map((preset) => (
            <button key={preset.label} className={`preset ${rule.type === preset.type ? 'active' : ''}`} onClick={() => choosePreset(preset.type, preset.template)}>
              <Sparkles size={16} /> {preset.label}
            </button>
          ))}
        </div>

        <div className="form-grid two">
          <label className="field">Nome da regra<input value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} /></label>
          <label className="field">Coluna<select value={rule.targetColumn} onChange={(e) => setRule({ ...rule, targetColumn: e.target.value })}>{sheet.headers.map((header) => <option key={header}>{header}</option>)}</select></label>
        </div>

        {rule.type === 'template' && (
          <>
            <label className="field">Modelo<input value={rule.template ?? ''} onChange={(e) => setRule({ ...rule, template: e.target.value })} /></label>
            <p className="help">Tokens: <code>{'{SEQ:4}'}</code>, <code>{'{ROW}'}</code> e <code>{'{COLUMN:Nome}'}</code>.</p>
            <div className="form-grid two">
              <label className="field">Sequência inicial<input type="number" value={rule.sequenceStart ?? 1} onChange={(e) => setRule({ ...rule, sequenceStart: Number(e.target.value) })} /></label>
              <label className="field">Incremento<input type="number" value={rule.sequenceStep ?? 1} onChange={(e) => setRule({ ...rule, sequenceStep: Number(e.target.value) })} /></label>
            </div>
          </>
        )}

        {(rule.type === 'prefix' || rule.type === 'suffix') && <label className="field">Texto<input value={rule.value ?? ''} onChange={(e) => setRule({ ...rule, value: e.target.value })} /></label>}
        {rule.type === 'replace' && <div className="form-grid two"><label className="field">Localizar<input value={rule.search ?? ''} onChange={(e) => setRule({ ...rule, search: e.target.value })} /></label><label className="field">Substituir por<input value={rule.replace ?? ''} onChange={(e) => setRule({ ...rule, replace: e.target.value })} /></label></div>}

        <section className="preview-card">
          <div className="section-title"><strong>Prévia</strong><span>{changes.length} alterações previstas</span></div>
          {preview.length === 0 ? <p className="muted">Nenhuma alteração necessária.</p> : preview.map((change, index) => <div className="preview-row" key={index}><span>{String(change.before ?? '∅')}</span><b>→</b><span>{String(change.after ?? '∅')}</span></div>)}
        </section>

        {savedRules.length > 0 && (
          <label className="field">Regras salvas<select defaultValue="" onChange={(e) => { const found = savedRules.find((item) => item.id === e.target.value); if (found) setRule(found); }}><option value="" disabled>Selecionar...</option>{savedRules.map((saved) => <option key={saved.id} value={saved.id}>{saved.name}</option>)}</select></label>
        )}

        <div className="drawer-actions">
          <button className="button" onClick={() => void saveRule()}><Save size={17} />Salvar regra</button>
          <button className="button primary" disabled={changes.length === 0} onClick={() => void onApply(rule)}><Play size={17} />Aplicar {changes.length} alteração(ões)</button>
        </div>
      </aside>
    </div>
  );
}
