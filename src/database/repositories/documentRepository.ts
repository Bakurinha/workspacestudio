import { db } from '../db';
import type { DocumentRecord, SpreadsheetContent } from '../../types/document';

export const documentRepository = {
  async save(document: DocumentRecord): Promise<void> {
    await db.documents.put(document);
  },

  async get(id: string): Promise<DocumentRecord | undefined> {
    return db.documents.get(id);
  },

  async listRecent(limit = 20): Promise<DocumentRecord[]> {
    return db.documents.orderBy('updatedAt').reverse().limit(limit).toArray();
  },

  async updateSpreadsheetContent(id: string, content: SpreadsheetContent): Promise<void> {
    await db.documents.update(id, {
      content,
      updatedAt: new Date().toISOString(),
    });
  },

  async updateHistoryState(id: string, historyCursor: number, historySequence: number): Promise<void> {
    await db.documents.update(id, { historyCursor, historySequence, updatedAt: new Date().toISOString() });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.documents, db.history, async () => {
      await db.documents.delete(id);
      await db.history.where('documentId').equals(id).delete();
    });
  },
};
