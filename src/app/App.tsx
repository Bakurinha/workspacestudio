import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  BookOpen,
  FilePlus2,
  History,
  Menu,
  MoonStar,
  Redo2,
  Save,
  Settings,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import { FileDropZone } from '../components/FileDropZone';
import { FileList } from '../components/FileList';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { documentRepository } from '../database/repositories/documentRepository';
import { useAppSettings } from '../hooks/useAppSettings';
import { RulePanel } from '../modules/rules/RulePanel';
import { buildRuleChanges } from '../modules/rules/ruleEngine';
import { SpreadsheetWorkspace } from '../modules/spreadsheet/SpreadsheetWorkspace';
import { exportSpreadsheet } from '../modules/spreadsheet/spreadsheetExport';
import { DocxViewer } from '../modules/viewers/DocxViewer';
import { exportPdfDocument } from '../modules/viewers/pdfExport';
import { PdfViewer } from '../modules/viewers/PdfViewer';
import { TextViewer } from '../modules/viewers/TextViewer';
import { importFile } from '../services/fileImportService';
import { commitAddColumn, commitAddRow, commitSpreadsheetAction, listHistory, redo, undo } from '../services/historyService';
import type { ColumnRule, DocumentRecord, HistoryAction, SpreadsheetSelection } from '../types/document';
import { downloadBlob } from '../utils/download';

const APP_VERSION = '0.4.0';

export function App() {
  const { settings, updateSettings } = useAppSettings();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [active, setActive] = useState<DocumentRecord>();
  const [readOnly, setReadOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<DocumentRecord>();
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [columnName, setColumnName] = useState('');
  const [spreadsheetSelection, setSpreadsheetSelection] = useState<SpreadsheetSelection>();

  useEffect(() => { void refreshDocuments(); }, []);

  const activeSheet = useMemo(() => active?.content?.sheets[active.content.activeSheetIndex], [active]);

  async function refreshDocuments(selectId?: string) {
    const list = await documentRepository.listRecent();
    setDocuments(list);
    if (selectId) setActive(list.find((item) => item.id === selectId));
  }

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(undefined), 3500);
  }

  function updateActiveDocument(updated: DocumentRecord) {
    setActive(updated);
    setDocuments((items) => items.map((item) => item.id === updated.id ? updated : item));
  }

  async function handleImport(file: File) {
    setBusy(true);
    try {
      const document = await importFile(file);
      await refreshDocuments(document.id);
      setSpreadsheetSelection(undefined);
      setReadOnly(true);
      notify(`${file.name} importado com o original preservado.`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Falha durante a importação.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!active) return;
    setBusy(true);
    try {
      const base = active.name.replace(/\.[^.]+$/, '');
      if (active.kind === 'spreadsheet') {
        const blob = await exportSpreadsheet(active);
        downloadBlob(blob, `${base}-editado.${active.extension === 'csv' ? 'csv' : 'xlsx'}`);
      } else if (active.kind === 'pdf') {
        const blob = await exportPdfDocument(active);
        downloadBlob(blob, `${base}-editado.pdf`);
      } else {
        downloadBlob(active.originalBlob, active.name);
      }
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Falha ao exportar.');
    } finally {
      setBusy(false);
    }
  }

  async function applyCellChange(change: Parameters<typeof commitSpreadsheetAction>[2][number]) {
    if (!active || readOnly || change.before === change.after) return;
    updateActiveDocument(await commitSpreadsheetAction(active, 'Edição de célula', [change]));
  }

  async function addRow() {
    if (!active?.content || readOnly) return;
    updateActiveDocument(await commitAddRow(active, active.content.activeSheetIndex));
  }

  function requestAddColumn() {
    if (!active?.content || readOnly) return;
    setColumnName(`Coluna ${activeSheet ? activeSheet.headers.length + 1 : 1}`);
    setColumnDialogOpen(true);
  }

  async function confirmAddColumn() {
    if (!active?.content || readOnly) return;
    updateActiveDocument(await commitAddColumn(active, active.content.activeSheetIndex, columnName));
    setColumnDialogOpen(false);
  }

  async function applyRule(rule: ColumnRule) {
    if (!active?.content || !activeSheet || readOnly) return;
    const changes = buildRuleChanges(activeSheet, active.content.activeSheetIndex, rule);
    if (changes.length === 0) {
      notify('A regra não produziria alterações.');
      return;
    }
    updateActiveDocument(await commitSpreadsheetAction(active, `Regra: ${rule.name}`, changes));
    setRulesOpen(false);
    notify(`${changes.length} células alteradas pela regra.`);
  }

  async function handleUndo() {
    if (!active) return;
    updateActiveDocument(await undo(active));
  }

  async function handleRedo() {
    if (!active) return;
    updateActiveDocument(await redo(active));
  }

  async function openHistory() {
    if (!active) return;
    setHistory(await listHistory(active.id));
    setHistoryOpen(true);
  }

  async function confirmDeleteDocument() {
    if (!deleteCandidate) return;
    await documentRepository.delete(deleteCandidate.id);
    if (active?.id === deleteCandidate.id) {
      setActive(undefined);
      setSpreadsheetSelection(undefined);
    }
    setDeleteCandidate(undefined);
    await refreshDocuments();
  }

  function changeSheet(index: number) {
    if (!active?.content) return;
    const updated = { ...active, content: { ...active.content, activeSheetIndex: index } };
    setSpreadsheetSelection(undefined);
    setActive(updated);
    void documentRepository.updateSpreadsheetContent(active.id, updated.content);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-zone">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Abrir arquivos"><Menu size={20} /></button>
          <div className="brand-mark">WS</div>
          <div><strong>Workspace Studio</strong><small>v{APP_VERSION} · local-first</small></div>
        </div>
        <div className="top-actions">
          {active && <span className={`mode-badge ${readOnly ? 'read' : 'edit'}`}>{readOnly ? 'Leitura' : 'Edição'}</span>}
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Configurações"><Settings size={20} /></button>
        </div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head"><div><span className="eyebrow">Biblioteca</span><h2>Arquivos</h2></div><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <label className="button primary full file-button"><FilePlus2 size={17} />Importar<input hidden type="file" accept=".xlsx,.xlsm,.csv,.pdf,.docx,.txt,.json,.md,.xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); }} /></label>
        <FileList documents={documents} activeId={active?.id} onSelect={(document) => { setActive(document); setSpreadsheetSelection(undefined); setReadOnly(true); setSidebarOpen(false); }} onDelete={setDeleteCandidate} />
      </aside>

      <main className="workspace">
        {!active ? (
          <div className="welcome">
            <div className="welcome-copy"><span className="eyebrow">Documentos + dados + automação</span><h1>Trabalhe com arquivos sem perder o original.</h1><p>Importe uma planilha ou documento. A origem fica preservada no IndexedDB e as alterações são controladas por histórico.</p></div>
            <FileDropZone disabled={busy} onFile={handleImport} />
            <div className="feature-strip"><span><Save size={18} />Original imutável</span><span><History size={18} />Histórico</span><span><Sparkles size={18} />Regras de coluna</span><span><MoonStar size={18} />Temas</span></div>
          </div>
        ) : (
          <>
            <div className="document-toolbar">
              <div className="document-title"><span className="eyebrow">{active.kind}</span><h1>{active.name}</h1><p>SHA-256 {active.sha256.slice(0, 12)}… · {new Date(active.updatedAt).toLocaleString('pt-BR')}</p></div>
              <div className="toolbar-actions">
                {active.kind === 'spreadsheet' && <><button className="button" disabled={active.historyCursor <= 0} onClick={() => void handleUndo()}><Undo2 size={17} />Desfazer</button><button className="button" disabled={active.historyCursor >= active.historySequence} onClick={() => void handleRedo()}><Redo2 size={17} />Refazer</button><button className="button" onClick={() => void openHistory()}><History size={17} />Histórico</button><button className="button" disabled={readOnly} onClick={() => setRulesOpen(true)}><Sparkles size={17} />Regras</button></>}
                <button className="button" onClick={() => setReadOnly((value) => !value)}><BookOpen size={17} />{readOnly ? 'Editar' : 'Voltar à leitura'}</button>
                <button className="button primary" disabled={busy} onClick={() => void handleExport()}><ArrowDownToLine size={17} />Exportar</button>
              </div>
            </div>

            {active.metadata.fonts && active.metadata.fonts.length > 0 && <div className="font-banner"><strong>Fontes detectadas:</strong> {active.metadata.fonts.join(', ')}</div>}

            <div className="document-surface">
              {active.kind === 'spreadsheet' && <SpreadsheetWorkspace document={active} readOnly={readOnly} selection={spreadsheetSelection} onSelectionChange={setSpreadsheetSelection} onCellChange={applyCellChange} onSheetChange={changeSheet} onAddRow={addRow} onAddColumn={requestAddColumn} />}
              {active.kind === 'pdf' && <PdfViewer document={active} readOnly={readOnly} onDocumentChange={updateActiveDocument} />}
              {active.kind === 'docx' && <DocxViewer document={active} />}
              {active.kind === 'text' && <TextViewer document={active} />}
              {active.kind === 'unknown' && <div className="empty-state">O arquivo foi preservado no IndexedDB, mas este formato ainda não possui visualizador especializado.</div>}
            </div>
          </>
        )}
      </main>

      {message && <div className="toast">{message}</div>}
      <SettingsDrawer open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onChange={(next) => void updateSettings(next)} />
      {activeSheet && <RulePanel open={rulesOpen} sheet={activeSheet} sheetIndex={active?.content?.activeSheetIndex ?? 0} selection={spreadsheetSelection} onClose={() => setRulesOpen(false)} onApply={applyRule} />}
      {historyOpen && <div className="drawer-backdrop" onMouseDown={() => setHistoryOpen(false)}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><div className="drawer-header"><div><span className="eyebrow">Auditoria</span><h2>Histórico</h2></div><button className="icon-button" onClick={() => setHistoryOpen(false)}><X size={20} /></button></div><div className="history-list">{history.length === 0 ? <p className="muted">Nenhuma alteração registrada.</p> : history.map((item) => <div className={`history-item ${item.sequence > (active?.historyCursor ?? 0) ? 'undone' : ''}`} key={item.id}><strong>#{item.sequence} · {item.label}</strong><span>{item.payload.kind === 'cells' ? `${item.payload.changes.length} célula(s)` : item.payload.kind === 'row-add' ? '1 registro' : '1 coluna'} · {new Date(item.createdAt).toLocaleString('pt-BR')}</span></div>)}</div></aside></div>}
      {columnDialogOpen && (
        <div className="dialog-backdrop" onMouseDown={() => setColumnDialogOpen(false)}>
          <section className="dialog-card" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-column-title">
            <div className="dialog-header"><div><span className="eyebrow">Estrutura</span><h2 id="add-column-title">Adicionar coluna</h2></div><button className="icon-button" onClick={() => setColumnDialogOpen(false)}><X size={18} /></button></div>
            <label className="field">Nome da coluna<input autoFocus value={columnName} onChange={(event) => setColumnName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void confirmAddColumn(); }} /></label>
            <div className="dialog-actions"><button className="button" onClick={() => setColumnDialogOpen(false)}>Cancelar</button><button className="button primary" onClick={() => void confirmAddColumn()}>Adicionar</button></div>
          </section>
        </div>
      )}
      {deleteCandidate && (
        <div className="dialog-backdrop" onMouseDown={() => setDeleteCandidate(undefined)}>
          <section className="dialog-card" onMouseDown={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="dialog-header"><div><span className="eyebrow danger-text">Remoção</span><h2 id="delete-title">Excluir arquivo?</h2></div><button className="icon-button" onClick={() => setDeleteCandidate(undefined)}><X size={18} /></button></div>
            <p className="dialog-copy">“{deleteCandidate.name}” e seu Blob original serão removidos do IndexedDB deste dispositivo.</p>
            <div className="dialog-actions"><button className="button" onClick={() => setDeleteCandidate(undefined)}>Cancelar</button><button className="button danger" onClick={() => void confirmDeleteDocument()}>Excluir</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
