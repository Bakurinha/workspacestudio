export type DocumentKind = 'spreadsheet' | 'pdf' | 'docx' | 'text' | 'unknown';

export type CellValue = string | number | boolean | null;

export interface SpreadsheetSheet {
  name: string;
  headers: string[];
  rows: CellValue[][];
}

export interface SpreadsheetContent {
  sheets: SpreadsheetSheet[];
  activeSheetIndex: number;
}

export interface DocumentMetadata {
  sheetCount?: number;
  pageCount?: number;
  fonts?: string[];
  warnings?: string[];
}

export interface DocumentRecord {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  kind: DocumentKind;
  size: number;
  sha256: string;
  importedAt: string;
  updatedAt: string;
  originalBlob: Blob;
  content?: SpreadsheetContent;
  metadata: DocumentMetadata;
  historyCursor: number;
  historySequence: number;
}

export type ThemeMode = 'system' | 'light' | 'dark' | 'custom';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface AppSettings {
  themeMode: ThemeMode;
  customText: RGBColor;
  customBackground: RGBColor;
  customAccent: RGBColor;
}

export type RuleType =
  | 'template'
  | 'prefix'
  | 'suffix'
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'replace';

export interface ColumnRule {
  id: string;
  name: string;
  type: RuleType;
  targetColumn: string;
  template?: string;
  value?: string;
  search?: string;
  replace?: string;
  sequenceStart?: number;
  sequenceStep?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CellChange {
  sheetIndex: number;
  rowIndex: number;
  columnIndex: number;
  before: CellValue;
  after: CellValue;
}

export type HistoryPayload =
  | { kind: 'cells'; changes: CellChange[] }
  | { kind: 'row-add'; sheetIndex: number; rowIndex: number; row: CellValue[] }
  | { kind: 'column-add'; sheetIndex: number; columnIndex: number; header: string; values: CellValue[] };

export interface HistoryAction {
  id?: number;
  documentId: string;
  sequence: number;
  label: string;
  payload: HistoryPayload;
  createdAt: string;
}
