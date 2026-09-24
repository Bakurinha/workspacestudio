import type { DocumentKind } from '../types/document';

const spreadsheetExtensions = new Set(['xlsx', 'xlsm', 'csv']);
const textExtensions = new Set(['txt', 'md', 'json', 'xml']);

export function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export function detectDocumentKind(file: File): DocumentKind {
  const extension = getExtension(file.name);
  if (spreadsheetExtensions.has(extension)) return 'spreadsheet';
  if (extension === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (extension === 'docx') return 'docx';
  if (textExtensions.has(extension) || file.type.startsWith('text/')) return 'text';
  return 'unknown';
}
