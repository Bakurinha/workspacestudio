import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { DocumentRecord } from '../../types/document';
import { exportPdfDocument } from './pdfExport';

async function createDocument(): Promise<DocumentRecord> {
  const source = await PDFDocument.create();
  source.addPage([300, 300]);
  const bytes = await source.save();

  return {
    id: 'pdf-test',
    name: 'teste.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    kind: 'pdf',
    size: bytes.byteLength,
    sha256: 'test',
    importedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    originalBlob: new Blob([bytes], { type: 'application/pdf' }),
    metadata: { pageCount: 1 },
    historyCursor: 0,
    historySequence: 0,
    pdfEdits: [
      {
        id: 'edit-1',
        type: 'text',
        pageIndex: 0,
        createdAt: new Date(0).toISOString(),
        xRatio: 0.1,
        yRatio: 0.1,
        text: 'Workspace Studio',
        size: 14,
        color: { r: 0, g: 0, b: 0 },
      },
    ],
    pdfEditCursor: 1,
  };
}

describe('exportPdfDocument', () => {
  it('gera um PDF válido sem alterar o Blob original', async () => {
    const document = await createDocument();
    const originalSize = document.originalBlob.size;
    const result = await exportPdfDocument(document);
    const parsed = await PDFDocument.load(await result.arrayBuffer());

    expect(parsed.getPageCount()).toBe(1);
    expect(result.type).toBe('application/pdf');
    expect(document.originalBlob.size).toBe(originalSize);
    expect(result.size).toBeGreaterThan(0);
  });
});
