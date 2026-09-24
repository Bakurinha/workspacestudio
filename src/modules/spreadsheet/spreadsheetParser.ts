import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { CellValue, SpreadsheetContent, SpreadsheetSheet } from '../../types/document';
import { getExtension } from '../../utils/fileType';

function normalizeCellValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) {
      const result = value.result;
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') return result;
    }
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
  }
  return String(value);
}

function uniqueHeaders(rawHeaders: CellValue[], width: number): string[] {
  const counts = new Map<string, number>();
  return Array.from({ length: width }, (_, index) => {
    const raw = rawHeaders[index];
    const base = String(raw ?? '').trim() || `Coluna ${index + 1}`;
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function sheetFromRows(name: string, rows: CellValue[][]): SpreadsheetSheet {
  const width = Math.max(1, ...rows.map((row) => row.length));
  const [firstRow = [], ...dataRows] = rows;
  return {
    name,
    headers: uniqueHeaders(firstRow, width),
    rows: dataRows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null)),
  };
}

async function parseXlsx(file: File): Promise<SpreadsheetContent> {
  const workbook = new ExcelJS.Workbook();
  const data = await file.arrayBuffer();
  await workbook.xlsx.load(data as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheets: SpreadsheetSheet[] = [];

  workbook.eachSheet((worksheet) => {
    const rows: CellValue[][] = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(values.map((value) => normalizeCellValue(value as ExcelJS.CellValue)));
    });
    sheets.push(sheetFromRows(worksheet.name, rows));
  });

  return { sheets, activeSheetIndex: 0 };
}

async function parseCsv(file: File): Promise<SpreadsheetContent> {
  const text = await file.text();
  const parsed = Papa.parse<CellValue[]>(text, { skipEmptyLines: false });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(parsed.errors[0]?.message ?? 'Não foi possível interpretar o CSV.');
  }
  return { sheets: [sheetFromRows('CSV', parsed.data)], activeSheetIndex: 0 };
}

export async function parseSpreadsheet(file: File): Promise<SpreadsheetContent> {
  const extension = getExtension(file.name);
  if (extension === 'csv') return parseCsv(file);
  if (extension === 'xlsx' || extension === 'xlsm') return parseXlsx(file);
  throw new Error(`Formato de planilha ainda não suportado para edição: .${extension}`);
}
