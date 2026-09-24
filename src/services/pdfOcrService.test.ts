import { describe, expect, it } from 'vitest';
import { languagesForOcrMode, normalizeOcrWords } from './pdfOcrService';

describe('languagesForOcrMode', () => {
  it('mapeia modos simples e bilíngue sem ambiguidade', () => {
    expect(languagesForOcrMode('por')).toBe('por');
    expect(languagesForOcrMode('eng')).toBe('eng');
    expect(languagesForOcrMode('por-eng')).toEqual(['por', 'eng']);
  });
});

describe('normalizeOcrWords', () => {
  it('converte bounding boxes em razões estáveis da página', () => {
    const words = normalizeOcrWords([
      {
        paragraphs: [
          {
            lines: [
              {
                words: [
                  { text: 'Eletricidade', confidence: 96, bbox: { x0: 100, y0: 200, x1: 300, y1: 260 } },
                ],
              },
            ],
          },
        ],
      },
    ], 1000, 2000);

    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({
      text: 'Eletricidade',
      confidence: 96,
      lineIndex: 0,
      xRatio: 0.1,
      yRatio: 0.1,
      widthRatio: 0.2,
      heightRatio: 0.03,
    });
  });
});
