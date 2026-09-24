import type { PDFPageProxy } from 'pdfjs-dist';
import { createWorker, OEM } from 'tesseract.js';
import { documentRepository } from '../database/repositories/documentRepository';
import type { DocumentRecord, PdfOcrResult } from '../types/document';

export type PdfOcrLanguageMode = 'por' | 'eng' | 'por-eng';

export interface PdfOcrProgress {
  progress: number;
  status: string;
}

const TESSERACT_WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js';
const TESSERACT_CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0';
const TESSERACT_LANGUAGE_PATH = 'https://tessdata.projectnaptha.com/4.0.0';

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
 * Os caminhos do worker/core são explícitos porque bundlers podem mover o entrypoint
 * interno do Tesseract.js e quebrar a descoberta automática em hospedagens estáticas.
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

  onProgress?.({ progress: 0.04, status: 'Renderizando página' });
  const renderTask = page.render({ canvas, canvasContext: context, viewport });
  await renderTask.promise;

  const languages = languagesForOcrMode(languageMode);
  let workerError: unknown;

  onProgress?.({ progress: 0.08, status: 'Carregando engine OCR' });
  const worker = await createWorker(languages, OEM.LSTM_ONLY, {
    workerPath: TESSERACT_WORKER_PATH,
    corePath: TESSERACT_CORE_PATH,
    langPath: TESSERACT_LANGUAGE_PATH,
    logger: (message) => {
      if (typeof message.progress === 'number') {
        onProgress?.({ progress: Math.max(0.08, message.progress), status: message.status ?? 'Processando OCR' });
      }
    },
    errorHandler: (error) => {
      workerError = error;
    },
  });

  try {
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const result = await worker.recognize(canvas);
    if (workerError) throw workerError;

    return {
      pageIndex: page.pageNumber - 1,
      language: Array.isArray(languages) ? languages.join('+') : languages,
      text: result.data.text.trim(),
      confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : 0,
      recognizedAt: new Date().toISOString(),
    };
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : String(reason ?? 'erro desconhecido');
    throw new Error(`OCR não pôde ser executado. Verifique a conexão no primeiro uso e tente novamente. Detalhe: ${detail}`);
  } finally {
    await worker.terminate();
  }
}

/**
 * Persiste o OCR sem buscar novamente o DocumentRecord no IndexedDB.
 * Isso preserva a mesma referência de originalBlob usada pelo PDF.js e evita
 * destruir/recarregar o documento visual após cada reconhecimento.
 */
export async function persistPdfOcrResult(document: DocumentRecord, result: PdfOcrResult): Promise<DocumentRecord> {
  const pdfOcr = [
    ...(document.pdfOcr ?? []).filter((item) => item.pageIndex !== result.pageIndex),
    result,
  ].sort((a, b) => a.pageIndex - b.pageIndex);
  const updatedAt = new Date().toISOString();

  await documentRepository.updatePdfOcr(document.id, pdfOcr, updatedAt);

  return {
    ...document,
    pdfOcr,
    updatedAt,
  };
}

/**
 * Salva correções humanas sobre o texto reconhecido. A correção altera somente
 * a camada textual de OCR; o conteúdo visual original do PDF continua imutável.
 */
export async function updatePdfOcrText(document: DocumentRecord, pageIndex: number, text: string): Promise<DocumentRecord> {
  const current = document.pdfOcr?.find((item) => item.pageIndex === pageIndex);
  if (!current) throw new Error('Execute o OCR desta página antes de editar o texto reconhecido.');

  const edited: PdfOcrResult = {
    ...current,
    text,
    editedAt: new Date().toISOString(),
  };

  return persistPdfOcrResult(document, edited);
}
