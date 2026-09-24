import JSZip from 'jszip';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { DocumentMetadata, DocumentRecord } from '../types/document';
import { documentRepository } from '../database/repositories/documentRepository';
import { parseSpreadsheet } from '../modules/spreadsheet/spreadsheetParser';
import { detectDocumentKind, getExtension } from '../utils/fileType';
import { sha256 } from '../utils/hash';

GlobalWorkerOptions.workerSrc = pdfWorker;

async function inspectPdf(file: File): Promise<DocumentMetadata> {
  const task = getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  const fonts = new Set<string>();

  // A inspeção de fontes é deliberadamente limitada a algumas páginas para evitar
  // travar a UI em PDFs muito grandes. O viewer continua exibindo o arquivo completo.
  const pagesToInspect = Math.min(pdf.numPages, 10);
  for (let pageNumber = 1; pageNumber <= pagesToInspect; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();
    Object.values(text.styles as Record<string, { fontFamily?: string }>).forEach((style) => {
      if (style.fontFamily) fonts.add(style.fontFamily);
    });
  }

  return { pageCount: pdf.numPages, fonts: [...fonts].sort() };
}

async function inspectDocx(file: File): Promise<DocumentMetadata> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const candidates = ['word/styles.xml', 'word/document.xml'];
  const fonts = new Set<string>();
  const fontPattern = /w:(?:ascii|hAnsi|eastAsia|cs)="([^"]+)"/g;

  for (const path of candidates) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async('text');
    for (const match of xml.matchAll(fontPattern)) {
      if (match[1]) fonts.add(match[1]);
    }
  }
  return { fonts: [...fonts].sort() };
}

export async function importFile(file: File): Promise<DocumentRecord> {
  const kind = detectDocumentKind(file);
  const now = new Date().toISOString();
  let metadata: DocumentMetadata = {};
  let content: DocumentRecord['content'];

  if (kind === 'spreadsheet') {
    content = await parseSpreadsheet(file);
    metadata.sheetCount = content.sheets.length;
  } else if (kind === 'pdf') {
    metadata = await inspectPdf(file);
  } else if (kind === 'docx') {
    metadata = await inspectDocx(file);
  } else if (kind === 'unknown') {
    metadata.warnings = ['Formato armazenado, mas ainda sem editor/visualizador especializado.'];
  }

  const document: DocumentRecord = {
    id: crypto.randomUUID(),
    name: file.name,
    extension: getExtension(file.name),
    mimeType: file.type || 'application/octet-stream',
    kind,
    size: file.size,
    sha256: await sha256(file),
    importedAt: now,
    updatedAt: now,
    originalBlob: file,
    content,
    metadata,
    historyCursor: 0,
    historySequence: 0,
  };

  await documentRepository.save(document);
  return document;
}
