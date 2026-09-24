import { describe, expect, it } from 'vitest';
import type { ColumnRule, SpreadsheetSheet } from '../../types/document';
import { buildRuleChanges } from './ruleEngine';

const sheet: SpreadsheetSheet = {
  name: 'Inventário',
  headers: ['Marca', 'Modelo', 'Serial'],
  rows: [
    ['DELL', 'P2422H', null],
    ['DELL', 'P2422H', null],
  ],
};

describe('ruleEngine', () => {
  it('gera serial sequencial com valores de outras colunas', () => {
    const rule: ColumnRule = {
      id: '1',
      name: 'Serial Dell',
      type: 'template',
      targetColumn: 'Serial',
      template: 'ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA',
      sequenceStart: 1,
      sequenceStep: 1,
      createdAt: '',
      updatedAt: '',
    };

    const changes = buildRuleChanges(sheet, 0, rule);
    expect(changes.map((item) => item.after)).toEqual([
      'ABCY-DELL-P2422H-0001-AABA',
      'ABCY-DELL-P2422H-0002-AABA',
    ]);
  });
});
