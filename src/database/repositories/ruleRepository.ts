import { db } from '../db';
import type { ColumnRule } from '../../types/document';

export const ruleRepository = {
  async list(): Promise<ColumnRule[]> {
    return db.rules.orderBy('updatedAt').reverse().toArray();
  },

  async save(rule: ColumnRule): Promise<void> {
    await db.rules.put(rule);
  },

  async delete(id: string): Promise<void> {
    await db.rules.delete(id);
  },
};
