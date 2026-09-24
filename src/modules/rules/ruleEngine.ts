import type { CellChange, CellValue, ColumnRule, SpreadsheetSheet } from '../../types/document';

function asText(value: CellValue): string {
  return value === null ? '' : String(value);
}

function renderTemplate(
  template: string,
  sheet: SpreadsheetSheet,
  row: CellValue[],
  rowIndex: number,
  sequenceValue: number,
): string {
  let output = template;

  output = output.replace(/\{SEQ(?::(\d+))?\}/g, (_, width: string | undefined) => {
    const digits = width ? Number(width) : 1;
    return String(sequenceValue).padStart(digits, '0');
  });

  output = output.replace(/\{ROW\}/g, String(rowIndex + 1));

  output = output.replace(/\{COLUMN:([^}]+)\}/g, (_, headerName: string) => {
    const columnIndex = sheet.headers.findIndex(
      (header) => header.toLocaleLowerCase() === headerName.trim().toLocaleLowerCase(),
    );
    return columnIndex >= 0 ? asText(row[columnIndex] ?? null) : '';
  });

  return output;
}

export function applyRuleToValue(
  rule: ColumnRule,
  currentValue: CellValue,
  sheet: SpreadsheetSheet,
  row: CellValue[],
  rowIndex: number,
  sequenceIndex = rowIndex,
): CellValue {
  const current = asText(currentValue);
  switch (rule.type) {
    case 'uppercase':
      return current.toLocaleUpperCase();
    case 'lowercase':
      return current.toLocaleLowerCase();
    case 'trim':
      return current.trim();
    case 'prefix':
      return `${rule.value ?? ''}${current}`;
    case 'suffix':
      return `${current}${rule.value ?? ''}`;
    case 'replace': {
      const search = rule.search ?? '';
      return search ? current.split(search).join(rule.replace ?? '') : current;
    }
    case 'template': {
      const start = rule.sequenceStart ?? 1;
      const step = rule.sequenceStep ?? 1;
      // A sequência começa na primeira linha da faixa, e não no topo da planilha.
      return renderTemplate(rule.template ?? '{SEQ:4}', sheet, row, rowIndex, start + sequenceIndex * step);
    }
  }
}

function normalizeRange(rule: ColumnRule, rowCount: number) {
  if (rowCount === 0) return { startIndex: 0, endIndex: -1 };

  const requestedStart = Number.isFinite(rule.startRow) ? Math.trunc(rule.startRow ?? 1) : 1;
  const requestedEnd = Number.isFinite(rule.endRow) ? Math.trunc(rule.endRow ?? rowCount) : rowCount;
  const startRow = Math.max(1, Math.min(rowCount, requestedStart));
  const endRow = Math.max(startRow, Math.min(rowCount, requestedEnd));

  return { startIndex: startRow - 1, endIndex: endRow - 1 };
}

export function buildRuleChanges(sheet: SpreadsheetSheet, sheetIndex: number, rule: ColumnRule): CellChange[] {
  const columnIndex = sheet.headers.indexOf(rule.targetColumn);
  if (columnIndex < 0) throw new Error(`Coluna não encontrada: ${rule.targetColumn}`);

  const { startIndex, endIndex } = normalizeRange(rule, sheet.rows.length);
  if (endIndex < startIndex) return [];

  const changes: CellChange[] = [];
  for (let rowIndex = startIndex; rowIndex <= endIndex; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const before = row[columnIndex] ?? null;
    const after = applyRuleToValue(rule, before, sheet, row, rowIndex, rowIndex - startIndex);
    if (before === after) continue;
    changes.push({ sheetIndex, rowIndex, columnIndex, before, after });
  }

  return changes;
}
