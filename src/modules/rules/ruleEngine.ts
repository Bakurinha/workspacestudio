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
      return renderTemplate(rule.template ?? '{SEQ:4}', sheet, row, rowIndex, start + rowIndex * step);
    }
  }
}

export function buildRuleChanges(sheet: SpreadsheetSheet, sheetIndex: number, rule: ColumnRule): CellChange[] {
  const columnIndex = sheet.headers.indexOf(rule.targetColumn);
  if (columnIndex < 0) throw new Error(`Coluna não encontrada: ${rule.targetColumn}`);

  return sheet.rows.flatMap((row, rowIndex) => {
    const before = row[columnIndex] ?? null;
    const after = applyRuleToValue(rule, before, sheet, row, rowIndex);
    if (before === after) return [];
    return [{ sheetIndex, rowIndex, columnIndex, before, after }];
  });
}
