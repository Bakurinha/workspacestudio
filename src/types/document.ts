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

/**
 * Seleção vertical usada pelo motor de regras. Mantemos uma coluna por seleção
 * porque as regras atuais transformam uma coluna de cada vez.
 */
export interface SpreadsheetSelection {
  sheetIndex: number;
  columnIndex: number;
  startRowIndex: number;
  endRowIndex: number;
}

export interface DocumentMetadata {
  sheetCount?: number;
  pageCount?: number;
  fonts?: string[];
  warnings?: string[];
}

export interface PdfColor {
  r: number;
  g: number;
  b: number;
}

export interface PdfPoint {
  xRatio: number;
  yRatio: number;
}

export interface PdfOcrResult {
  pageIndex: number;
  language: string;
  text: string;
  confidence: number;
  recognizedAt: string;
  editedAt?: string;
}

interface PdfEditBase {
  id: string;
  pageIndex: number;
  createdAt: string;
}

export type PdfEditOperation =
  | (PdfEditBase & {
      type: 'text';
      xRatio: number;
      yRatio: number;
      text: string;
      size: number;
      color: PdfColor;
    })
  | (PdfEditBase & {
      type: 'rectangle';
      xRatio: number;
      yRatio: number;
      widthRatio: number;
      heightRatio: number;
      color: PdfColor;
      opacity: number;
      purpose: 'highlight' | 'whiteout';
    })
  | (PdfEditBase & {
      type: 'drawing';
      points: PdfPoint[];
      width: number;
      color: PdfColor;
    })
  | (PdfEditBase & {
      type: 'image';
      imageBlob: Blob;
      mimeType: 'image/png' | 'image/jpeg';
      xRatio: number;
      yRatio: number;
      widthRatio: number;
      heightRatio: number;
    })
  | (PdfEditBase & {
      type: 'rotate';
      degrees: 90 | -90;
    })
  | (PdfEditBase & {
      type: 'delete-page';
    });

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
  pdfEdits?: PdfEditOperation[];
  pdfEditCursor?: number;
  pdfOcr?: PdfOcrResult[];
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
  /** Primeira linha de dados da faixa, em base 1. */
  startRow?: number;
  /** Última linha de dados da faixa, em base 1 e inclusiva. */
  endRow?: number;
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
