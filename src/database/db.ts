import Dexie, { type EntityTable } from 'dexie';
import type { AppSettings, ColumnRule, DocumentRecord, HistoryAction } from '../types/document';

export interface SettingRecord {
  key: string;
  value: AppSettings;
}

/**
 * Banco local principal da aplicação.
 * Regra arquitetural: nenhum componente React acessa IndexedDB diretamente;
 * todo acesso deve passar por repositories/services.
 */
class WorkspaceDatabase extends Dexie {
  documents!: EntityTable<DocumentRecord, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;
  rules!: EntityTable<ColumnRule, 'id'>;
  history!: EntityTable<HistoryAction, 'id'>;

  constructor() {
    super('workspace-studio');

    // v1: schema inicial. Próximas mudanças de schema devem criar uma nova versão
    // e uma migration explícita, preservando os dados existentes.
    this.version(1).stores({
      documents: '&id, name, kind, importedAt, updatedAt',
      settings: '&key',
      rules: '&id, name, type, updatedAt',
      history: '++id, documentId, sequence, [documentId+sequence]',
    });
  }
}

export const db = new WorkspaceDatabase();
