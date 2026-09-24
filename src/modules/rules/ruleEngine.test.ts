import { describe, expect, it } from 'vitest';
import type { ColumnRule, SpreadsheetSheet } from '../../types/document';
import { buildRuleChanges } from './ruleEngine';

const sheet: SpreadsheetSheet = {
  name: 'Inventário',
  headers: ['Marca', 'Modelo', 'Serial'],
  rows: [
    ['DELL', 'P2422H', null],
    ['DELL', 'P2422H', null],
    ['DELL', 'P2422H', null],
    ['DELL', 'P2422H', null],
  ],
};

function serialRule(overrides: Partial<ColumnRule> = {}): ColumnRule {
  return {
    id: '1',
    name: 'Serial Dell',
    type: 'template',
    targetColumn: 'Serial',
    template: 'ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA',
    sequenceStart: 1,
    sequenceStep: 1,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('ruleEngine', () => {
  it('gera serial sequencial com valores de outras colunas', () => {
    const changes = buildRuleChanges(sheet, 0, serialRule());
    expect(changes.map((item) => item.after)).toEqual([
      'ABCY-DELL-P2422H-0001-AABA',
      'ABCY-DELL-P2422H-0002-AABA',
      'ABCY-DELL-P2422H-0003-AABA',
      'ABCY-DELL-P2422H-0004-AABA',
    ]);
  });

  it('aplica somente na faixa escolhida e reinicia a sequência na primeira linha da faixa', () => {
    const changes = buildRuleChanges(sheet, 0, serialRule({ startRow: 2, endRow: 3 }));

    expect(changes.map((item) => item.rowIndex)).toEqual([1, 2]);
    expect(changes.map((item) => item.after)).toEqual([
      'ABCY-DELL-P2422H-0001-AABA',
      'ABCY-DELL-P2422H-0002-AABA',
    ]);
  });

  it('limita uma faixa fora dos limites sem acessar linhas inexistentes', () => {
    const changes = buildRuleChanges(sheet, 0, serialRule({ startRow: 3, endRow: 999 }));
    expect(changes.map((item) => item.rowIndex)).toEqual([2, 3]);
  });
});
