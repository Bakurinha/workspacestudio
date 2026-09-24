import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CellChange, CellValue, DocumentRecord } from '../../types/document';

interface SpreadsheetWorkspaceProps {
  document: DocumentRecord;
  readOnly: boolean;
  onCellChange: (change: CellChange) => Promise<void> | void;
  onSheetChange: (index: number) => void;
  onAddRow: () => Promise<void> | void;
  onAddColumn: () => Promise<void> | void;
}

const PAGE_SIZE = 100;

function valueForInput(value: CellValue): string {
  return value === null ? '' : String(value);
}

function EditableCell({ value, onCommit }: { value: CellValue; onCommit: (nextValue: string) => void }) {
  const [draft, setDraft] = useState(valueForInput(value));

  useEffect(() => {
    setDraft(valueForInput(value));
  }, [value]);

  function commit() {
    if (draft !== valueForInput(value)) onCommit(draft);
  }

  return (
    <input
      className="cell-input"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(valueForInput(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function SpreadsheetWorkspace({ document, readOnly, onCellChange, onSheetChange, onAddRow, onAddColumn }: SpreadsheetWorkspaceProps) {
  const content = document.content;
  const [page, setPage] = useState(0);
  if (!content) return <div className="empty-state">Planilha sem conteúdo interpretável.</div>;

  const sheet = content.sheets[content.activeSheetIndex];
  if (!sheet) return <div className="empty-state">Nenhuma aba encontrada.</div>;

  const pageCount = Math.max(1, Math.ceil(sheet.rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = useMemo(() => sheet.rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE), [sheet.rows, safePage]);

  return (
    <div className="spreadsheet-workspace">
      <div className="sheet-tabs" role="tablist">
        {content.sheets.map((item, index) => (
          <button key={`${item.name}-${index}`} className={index === content.activeSheetIndex ? 'active' : ''} onClick={() => { setPage(0); onSheetChange(index); }}>
            {item.name}
          </button>
        ))}
      </div>

      {!readOnly && (
        <div className="grid-actions">
          <button className="button small" onClick={() => void onAddRow()}><Plus size={15} />Registro</button>
          <button className="button small" onClick={() => void onAddColumn()}><Plus size={15} />Coluna</button>
        </div>
      )}

      <div className="grid-scroll">
        <table className="data-grid">
          <thead><tr><th className="row-number">#</th>{sheet.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, visibleRowIndex) => {
              const rowIndex = safePage * PAGE_SIZE + visibleRowIndex;
              return (
                <tr key={rowIndex}>
                  <th className="row-number">{rowIndex + 1}</th>
                  {sheet.headers.map((_, columnIndex) => {
                    const value = row[columnIndex] ?? null;
                    return (
                      <td key={columnIndex}>
                        {readOnly ? <span className="cell-read">{valueForInput(value)}</span> : (
                          <EditableCell
                            value={value}
                            onCommit={(next) => {
                              void onCellChange({
                                sheetIndex: content.activeSheetIndex,
                                rowIndex,
                                columnIndex,
                                before: value,
                                after: next,
                              });
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>{sheet.rows.length} registros · página {safePage + 1} de {pageCount}</span>
        <div><button className="button small" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Anterior</button><button className="button small" disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Próxima</button></div>
      </div>
    </div>
  );
}
