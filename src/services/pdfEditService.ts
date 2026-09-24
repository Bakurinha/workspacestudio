import { documentRepository } from '../database/repositories/documentRepository';
import type { DocumentRecord, PdfEditOperation } from '../types/document';

function getCursor(document: DocumentRecord): number {
  return document.pdfEditCursor ?? document.pdfEdits?.length ?? 0;
}

/**
 * Adiciona uma operação PDF sem tocar no Blob original.
 * Caso o usuário tenha desfeito ações, novas operações descartam apenas o ramo futuro.
 */
export async function commitPdfEdit(
  document: DocumentRecord,
  operation: PdfEditOperation,
): Promise<DocumentRecord> {
  const cursor = getCursor(document);
  const pdfEdits = [...(document.pdfEdits ?? []).slice(0, cursor), operation];
  const pdfEditCursor = pdfEdits.length;
  const updatedAt = new Date().toISOString();

  await documentRepository.updatePdfEdits(document.id, pdfEdits, pdfEditCursor);
  return { ...document, pdfEdits, pdfEditCursor, updatedAt };
}

export async function undoPdfEdit(document: DocumentRecord): Promise<DocumentRecord> {
  const pdfEditCursor = Math.max(0, getCursor(document) - 1);
  const pdfEdits = document.pdfEdits ?? [];
  const updatedAt = new Date().toISOString();
  await documentRepository.updatePdfEdits(document.id, pdfEdits, pdfEditCursor);
  return { ...document, pdfEdits, pdfEditCursor, updatedAt };
}

export async function redoPdfEdit(document: DocumentRecord): Promise<DocumentRecord> {
  const pdfEdits = document.pdfEdits ?? [];
  const pdfEditCursor = Math.min(pdfEdits.length, getCursor(document) + 1);
  const updatedAt = new Date().toISOString();
  await documentRepository.updatePdfEdits(document.id, pdfEdits, pdfEditCursor);
  return { ...document, pdfEdits, pdfEditCursor, updatedAt };
}

export async function clearPdfEdits(document: DocumentRecord): Promise<DocumentRecord> {
  const pdfEdits: PdfEditOperation[] = [];
  const pdfEditCursor = 0;
  const updatedAt = new Date().toISOString();
  await documentRepository.updatePdfEdits(document.id, pdfEdits, pdfEditCursor);
  return { ...document, pdfEdits, pdfEditCursor, updatedAt };
}
