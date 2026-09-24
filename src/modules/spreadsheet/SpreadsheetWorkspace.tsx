import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CellChange, CellValue, DocumentRecord, SpreadsheetSelection } from '../../types/document';
import './spreadsheetSelection.css';

interface SpreadsheetWorkspaceProps {
  document: DocumentRecord;
  readOnly: boolean;
  selection?: SpreadsheetSelection;
  onSelectionChange: (selection?: SpreadsheetSelection) => void;
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

function cellIsSelected(selection: SpreadsheetSelection | undefined, sheetIndex: number, rowIndex: number, columnIndex: number) {
  if (!selection || selection.sheetIndex !== sheetIndex || selection.columnIndex !== columnIndex) return false;
  const start = Math.min(selection.startRowIndex, selection.endRowIndex);
  const end = Math.max(selection.startRowIndex, selection.endRowIndex);
  return rowIndex >= start && rowIndex <= end;
}

export function SpreadsheetWorkspace({
  document,
  readOnly,
  selection,
  onSelectionChange,
  onCellChange,
  onSheetChange,
  onAddRow,
  onAddColumn,
}: SpreadsheetWorkspaceProps) {
  const content = document.content;
  const [page, setPage] = useState(0);
  if (!content) return <div className="empty-state">Planilha sem conteúdo interpretável.</div>;

  const sheetIndex = content.activeSheetIndex;
  const sheet = content.sheets[sheetIndex];
  if (!sheet) return <div className="empty-state">Nenhuma aba encontrada.</div>;

  // Aliases validados evitam que callbacks assíncronas percam o narrowing do TypeScript.
  const currentSheetIndex = sheetIndex;
  const currentSheet = sheet;
  const pageCount = Math.max(1, Math.ceil(currentSheet.rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = useMemo(() => currentSheet.rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE), [currentSheet.rows, safePage]);

  function selectCell(rowIndex: number, columnIndex: number, extend: boolean) {
    if (readOnly) return;

    if (extend && selection?.sheetIndex === currentSheetIndex && selection.columnIndex === columnIndex) {
      onSelectionChange({
        ...selection,
        endRowIndex: rowIndex,
      });
      return;
    }

    onSelectionChange({
      sheetIndex: currentSheetIndex,
      columnIndex,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex,
    });
  }

  function selectColumn(columnIndex: number) {
    if (readOnly || currentSheet.rows.length === 0) return;
    onSelectionChange({
      sheetIndex: currentSheetIndex,
      columnIndex,
      startRowIndex: 0,
      endRowIndex: currentSheet.rows.length - 1,
    });
  }

  const selectionSummary = selection?.sheetIndex === currentSheetIndex
    ? `${currentSheet.headers[selection.columnIndex] ?? `Coluna ${selection.columnIndex + 1}`} · linhas ${Math.min(selection.startRowIndex, selection.endRowIndex) + 1}–${Math.max(selection.startRowIndex, selection.endRowIndex) + 1}`
    : undefined;

  return (
    <div className="spreadsheet-workspace">
      <div className="sheet-tabs" role="tablist">
        {content.sheets.map((item, index) => (
          <button key={`${item.name}-${index}`} className={index === currentSheetIndex ? 'active' : ''} onClick={() => { setPage(0); onSelectionChange(undefined); onSheetChange(index); }}>
            {item.name}
          </button>
        ))}
      </div>

      {!readOnly && (
        <div className="grid-actions">
          <button className="button small" onClick={() => void onAddRow()}><Plus size={15} />Registro</button>
          <button className="button small" onClick={() => void onAddColumn()}><Plus size={15} />Coluna</button>
          <span className="grid-selection-hint">
            {selectionSummary ? `Seleção: ${selectionSummary}` : 'Selecione uma célula; Shift+clique em outra da mesma coluna para marcar a faixa.'}
          </span>
        </div>
      )}

      <div className="grid-scroll">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="row-number">#</th>
              {currentSheet.headers.map((header, columnIndex) => (
                <th
                  key={header}
                  className={selection?.sheetIndex === currentSheetIndex && selection.columnIndex === columnIndex ? 'range-column' : ''}
                  onClick={() => selectColumn(columnIndex)}
                  title={readOnly ? undefined : 'Clique para selecionar toda a coluna de dados'}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, visibleRowIndex) => {
              const rowIndex = safePage * PAGE_SIZE + visibleRowIndex;
              return (
                <tr key={rowIndex}>
                  <th className="row-number">{rowIndex + 1}</th>
                  {currentSheet.headers.map((_, columnIndex) => {
                    const value = row[columnIndex] ?? null;
                    const selected = cellIsSelected(selection, currentSheetIndex, rowIndex, columnIndex);
                    return (
                      <td
                        key={columnIndex}
                        className={selected ? 'range-selected' : ''}
                        onMouseDown={(event) => selectCell(rowIndex, columnIndex, event.shiftKey)}
                      >
                        {readOnly ? <span className="cell-read">{valueForInput(value)}</span> : (
                          <EditableCell
                            value={value}
                            onCommit={(next) => {
                              void onCellChange({
                                sheetIndex: currentSheetIndex,
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
        <span>{currentSheet.rows.length} registros · página {safePage + 1} de {pageCount}</span>
        <div><button className="button small" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Anterior</button><button className="button small" disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Próxima</button></div>
      </div>
    </div>
  );
}
