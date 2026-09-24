import { db } from '../database/db';
import { documentRepository } from '../database/repositories/documentRepository';
import type { CellChange, CellValue, DocumentRecord, HistoryAction, HistoryPayload, SpreadsheetContent } from '../types/document';

function cloneContent(content: SpreadsheetContent): SpreadsheetContent {
  return {
    activeSheetIndex: content.activeSheetIndex,
    sheets: content.sheets.map((sheet) => ({
      ...sheet,
      headers: [...sheet.headers],
      rows: sheet.rows.map((row) => [...row]),
    })),
  };
}

function applyPayload(content: SpreadsheetContent, payload: HistoryPayload, direction: 'forward' | 'backward'): SpreadsheetContent {
  const next = cloneContent(content);

  if (payload.kind === 'cells') {
    for (const change of payload.changes) {
      const sheet = next.sheets[change.sheetIndex];
      const row = sheet?.rows[change.rowIndex];
      if (!row) continue;
      row[change.columnIndex] = direction === 'forward' ? change.after : change.before;
    }
    return next;
  }

  if (payload.kind === 'row-add') {
    const sheet = next.sheets[payload.sheetIndex];
    if (!sheet) return next;
    if (direction === 'forward') sheet.rows.splice(payload.rowIndex, 0, [...payload.row]);
    else sheet.rows.splice(payload.rowIndex, 1);
    return next;
  }

  const sheet = next.sheets[payload.sheetIndex];
  if (!sheet) return next;
  if (direction === 'forward') {
    sheet.headers.splice(payload.columnIndex, 0, payload.header);
    sheet.rows.forEach((row, rowIndex) => row.splice(payload.columnIndex, 0, payload.values[rowIndex] ?? null));
  } else {
    sheet.headers.splice(payload.columnIndex, 1);
    sheet.rows.forEach((row) => row.splice(payload.columnIndex, 1));
  }
  return next;
}

async function commitPayload(document: DocumentRecord, label: string, payload: HistoryPayload): Promise<DocumentRecord> {
  if (!document.content) return document;
  const nextContent = applyPayload(document.content, payload, 'forward');
  const nextSequence = document.historyCursor + 1;
  const now = new Date().toISOString();

  await db.transaction('rw', db.documents, db.history, async () => {
    // Se o usuário editar após um undo, o ramo de redo deixa de representar o estado atual.
    await db.history
      .where('[documentId+sequence]')
      .between([document.id, nextSequence], [document.id, Number.MAX_SAFE_INTEGER])
      .delete();

    const action: HistoryAction = {
      documentId: document.id,
      sequence: nextSequence,
      label,
      payload,
      createdAt: now,
    };
    await db.history.add(action);
    await db.documents.update(document.id, {
      content: nextContent,
      updatedAt: now,
      historyCursor: nextSequence,
      historySequence: nextSequence,
    });
  });

  return { ...document, content: nextContent, updatedAt: now, historyCursor: nextSequence, historySequence: nextSequence };
}

export async function commitSpreadsheetAction(document: DocumentRecord, label: string, changes: CellChange[]): Promise<DocumentRecord> {
  if (changes.length === 0) return document;
  return commitPayload(document, label, { kind: 'cells', changes });
}

export async function commitAddRow(document: DocumentRecord, sheetIndex: number): Promise<DocumentRecord> {
  const sheet = document.content?.sheets[sheetIndex];
  if (!sheet) return document;
  const row: CellValue[] = sheet.headers.map(() => null);
  return commitPayload(document, 'Adicionar registro', { kind: 'row-add', sheetIndex, rowIndex: sheet.rows.length, row });
}

export async function commitAddColumn(document: DocumentRecord, sheetIndex: number, requestedHeader: string): Promise<DocumentRecord> {
  const sheet = document.content?.sheets[sheetIndex];
  if (!sheet) return document;
  const trimmed = requestedHeader.trim() || `Coluna ${sheet.headers.length + 1}`;
  let header = trimmed;
  let suffix = 2;
  while (sheet.headers.includes(header)) {
    header = `${trimmed} (${suffix})`;
    suffix += 1;
  }
  return commitPayload(document, `Adicionar coluna: ${header}`, {
    kind: 'column-add',
    sheetIndex,
    columnIndex: sheet.headers.length,
    header,
    values: sheet.rows.map(() => null),
  });
}

export async function undo(document: DocumentRecord): Promise<DocumentRecord> {
  if (!document.content || document.historyCursor <= 0) return document;
  const action = await db.history.where('[documentId+sequence]').equals([document.id, document.historyCursor]).first();
  if (!action) return document;

  const nextContent = applyPayload(document.content, action.payload, 'backward');
  const nextCursor = document.historyCursor - 1;
  await documentRepository.updateSpreadsheetContent(document.id, nextContent);
  await documentRepository.updateHistoryState(document.id, nextCursor, document.historySequence);
  return { ...document, content: nextContent, historyCursor: nextCursor };
}

export async function redo(document: DocumentRecord): Promise<DocumentRecord> {
  if (!document.content || document.historyCursor >= document.historySequence) return document;
  const nextCursor = document.historyCursor + 1;
  const action = await db.history.where('[documentId+sequence]').equals([document.id, nextCursor]).first();
  if (!action) return document;

  const nextContent = applyPayload(document.content, action.payload, 'forward');
  await documentRepository.updateSpreadsheetContent(document.id, nextContent);
  await documentRepository.updateHistoryState(document.id, nextCursor, document.historySequence);
  return { ...document, content: nextContent, historyCursor: nextCursor };
}

export async function listHistory(documentId: string): Promise<HistoryAction[]> {
  return db.history.where('documentId').equals(documentId).sortBy('sequence');
}
