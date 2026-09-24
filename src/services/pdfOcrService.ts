import type { PDFPageProxy } from 'pdfjs-dist';
import { createWorker, OEM } from 'tesseract.js';
import { documentRepository } from '../database/repositories/documentRepository';
import type { DocumentRecord, PdfOcrResult, PdfOcrWord } from '../types/document';

export type PdfOcrLanguageMode = 'por' | 'eng' | 'por-eng';

export interface PdfOcrProgress {
  progress: number;
  status: string;
}

interface OcrBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface OcrWordLike {
  text: string;
  confidence: number;
  bbox: OcrBbox;
}

interface OcrLineLike {
  words: OcrWordLike[];
}

interface OcrParagraphLike {
  lines: OcrLineLike[];
}

interface OcrBlockLike {
  paragraphs: OcrParagraphLike[];
}

const TESSERACT_WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js';
const TESSERACT_CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0';
const TESSERACT_LANGUAGE_PATH = 'https://tessdata.projectnaptha.com/4.0.0';

/**
 * Converte o modo exibido pela interface nos idiomas aceitos pelo Tesseract.
 */
export function languagesForOcrMode(mode: PdfOcrLanguageMode): string | string[] {
  if (mode === 'por-eng') return ['por', 'eng'];
  return mode;
}

/**
 * Converte os blocos do Tesseract em palavras com coordenadas normalizadas.
 * A normalização permite reutilizar o mesmo mapa independentemente do zoom da página.
 */
export function normalizeOcrWords(
  blocks: OcrBlockLike[] | null | undefined,
  canvasWidth: number,
  canvasHeight: number,
): PdfOcrWord[] {
  if (!blocks || canvasWidth <= 0 || canvasHeight <= 0) return [];

  const words: PdfOcrWord[] = [];
  let lineIndex = 0;

  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = word.text?.trim();
          if (!text) continue;

          const x0 = Math.max(0, Math.min(canvasWidth, word.bbox.x0));
          const y0 = Math.max(0, Math.min(canvasHeight, word.bbox.y0));
          const x1 = Math.max(x0, Math.min(canvasWidth, word.bbox.x1));
          const y1 = Math.max(y0, Math.min(canvasHeight, word.bbox.y1));

          words.push({
            text,
            confidence: Number.isFinite(word.confidence) ? word.confidence : 0,
            lineIndex,
            xRatio: x0 / canvasWidth,
            yRatio: y0 / canvasHeight,
            widthRatio: Math.max(0.001, (x1 - x0) / canvasWidth),
            heightRatio: Math.max(0.001, (y1 - y0) / canvasHeight),
          });
        }
        lineIndex += 1;
      }
    }
  }

  return words;
}

function textFromWords(words: PdfOcrWord[]): string {
  const lines = new Map<number, string[]>();
  for (const word of words) {
    const line = lines.get(word.lineIndex) ?? [];
    line.push(word.text);
    lines.set(word.lineIndex, line);
  }

  return [...lines.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, lineWords]) => lineWords.join(' '))
    .join('\n')
    .trim();
}

/**
 * Renderiza uma página do PDF em alta resolução e executa OCR no canvas.
 * Solicitamos explicitamente `blocks`, pois desde Tesseract.js 6 apenas `text`
 * vem habilitado por padrão. Os blocos contêm palavras e bounding boxes.
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
    const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
    if (workerError) throw workerError;

    const blocks = result.data.blocks as OcrBlockLike[] | null;
    const words = normalizeOcrWords(blocks, canvas.width, canvas.height);

    return {
      pageIndex: page.pageNumber - 1,
      language: Array.isArray(languages) ? languages.join('+') : languages,
      text: result.data.text.trim(),
      confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : 0,
      recognizedAt: new Date().toISOString(),
      words,
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
 * Salva correções humanas sobre o texto reconhecido no painel textual.
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

/**
 * Atualiza uma palavra mapeada e recompõe a camada textual a partir das linhas OCR.
 * A substituição visual no PDF é registrada separadamente pelo editor de PDF.
 */
export async function updatePdfOcrWord(
  document: DocumentRecord,
  pageIndex: number,
  wordIndex: number,
  text: string,
): Promise<DocumentRecord> {
  const current = document.pdfOcr?.find((item) => item.pageIndex === pageIndex);
  if (!current?.words?.[wordIndex]) throw new Error('Palavra OCR não encontrada. Execute o OCR novamente nesta página.');

  const words = current.words.map((word, index) => index === wordIndex ? { ...word, text } : word);
  const edited: PdfOcrResult = {
    ...current,
    words,
    text: textFromWords(words),
    editedAt: new Date().toISOString(),
  };

  return persistPdfOcrResult(document, edited);
}
