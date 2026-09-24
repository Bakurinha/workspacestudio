import type { PDFPageProxy } from 'pdfjs-dist';
import { createWorker, OEM } from 'tesseract.js';
import { documentRepository } from '../database/repositories/documentRepository';
import type { DocumentRecord, PdfOcrResult } from '../types/document';

export type PdfOcrLanguageMode = 'por' | 'eng' | 'por-eng';

export interface PdfOcrProgress {
  progress: number;
  status: string;
}

/**
 * Converte o modo exibido pela interface nos idiomas aceitos pelo Tesseract.
 * Para OCR bilíngue usamos um array, conforme a API oficial do Tesseract.js.
 */
export function languagesForOcrMode(mode: PdfOcrLanguageMode): string | string[] {
  if (mode === 'por-eng') return ['por', 'eng'];
  return mode;
}

/**
 * Renderiza uma página do PDF em alta resolução e executa OCR no canvas.
 * O conteúdo do documento permanece no navegador; Tesseract.js usa um Web Worker
 * e pode baixar os arquivos de engine/idioma necessários durante a primeira execução.
 */
export async function recognizePdfPage(
  page: PDFPageProxy,
  languageMode: PdfOcrLanguageMode,
  onProgress?: (progress: PdfOcrProgress) => void,
): Promise<PdfOcrResult> {
  const baseViewport = page.getViewport({ scale: 1 });
  const targetWidth = 1800;
  const scale = Math.max(0.8, Math.min(3, targetWidth / Math.max(1, baseViewport.width)));
  const viewport = page.getViewport({ scale });
  const canvas = globalThis.document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Não foi possível preparar a página para OCR.');

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const renderTask = page.render({ canvas, canvasContext: context, viewport });
  await renderTask.promise;

  const languages = languagesForOcrMode(languageMode);
  const worker = await createWorker(languages, OEM.LSTM_ONLY, {
    logger: (message) => {
      if (typeof message.progress === 'number') {
        onProgress?.({ progress: message.progress, status: message.status ?? 'Processando OCR' });
      }
    },
  });

  try {
    const result = await worker.recognize(canvas);
    return {
      pageIndex: page.pageNumber - 1,
      language: Array.isArray(languages) ? languages.join('+') : languages,
      text: result.data.text.trim(),
      confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : 0,
      recognizedAt: new Date().toISOString(),
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Persiste apenas o resultado textual do OCR no registro do documento.
 * Buscamos a versão mais recente antes de salvar para não sobrescrever edições
 * que possam ter ocorrido enquanto o OCR estava processando.
 */
export async function persistPdfOcrResult(documentId: string, result: PdfOcrResult): Promise<DocumentRecord> {
  const latest = await documentRepository.get(documentId);
  if (!latest) throw new Error('Documento não encontrado para salvar o OCR.');

  const pdfOcr = [
    ...(latest.pdfOcr ?? []).filter((item) => item.pageIndex !== result.pageIndex),
    result,
  ].sort((a, b) => a.pageIndex - b.pageIndex);

  const updated: DocumentRecord = {
    ...latest,
    pdfOcr,
    updatedAt: new Date().toISOString(),
  };

  await documentRepository.save(updated);
  return updated;
}
