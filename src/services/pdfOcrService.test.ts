import { describe, expect, it } from 'vitest';
import { languagesForOcrMode } from './pdfOcrService';

describe('languagesForOcrMode', () => {
  it('mapeia modos simples e bilíngue sem ambiguidade', () => {
    expect(languagesForOcrMode('por')).toBe('por');
    expect(languagesForOcrMode('eng')).toBe('eng');
    expect(languagesForOcrMode('por-eng')).toEqual(['por', 'eng']);
  });
});
