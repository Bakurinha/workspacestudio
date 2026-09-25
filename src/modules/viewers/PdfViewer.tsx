import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Eraser,
  Highlighter,
  ImagePlus,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  ScanText,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { clearPdfEdits, commitPdfEdit, redoPdfEdit, undoPdfEdit } from '../../services/pdfEditService';
import {
  persistPdfOcrResult,
  recognizePdfPage,
  updatePdfOcrText,
  updatePdfOcrWord,
  type PdfOcrLanguageMode,
} from '../../services/pdfOcrService';
import type {
  DocumentRecord,
  PdfColor,
  PdfEditOperation,
  PdfOcrResult,
  PdfOcrWord,
  PdfPoint,
} from '../../types/document';
import { activePdfEdits } from './pdfExport';
import './pdfEditor.css';

GlobalWorkerOptions.workerSrc = pdfWorker;

type PdfTool = 'select' | 'text' | 'highlight' | 'whiteout' | 'draw';

interface PdfViewerProps {
  document: DocumentRecord;
  readOnly: boolean;
  onDocumentChange: (document: DocumentRecord) => void;
}

interface DraftRectangle {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

const MIN_DRAWING_DISTANCE = 0.0018;
const MAX_DRAWING_POINTS = 900;
const MIN_RECTANGLE_SIZE = 0.003;

export function PdfViewer({ document, readOnly, onDocumentChange }: PdfViewerProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [error, setError] = useState<string>();
  const [tool, setTool] = useState<PdfTool>('select');
  const [text, setText] = useState('Texto');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#1d2433');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [ocrLanguage, setOcrLanguage] = useState<PdfOcrLanguageMode>('por');
  const [ocrBusyPage, setOcrBusyPage] = useState<number>();
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrError, setOcrError] = useState<{ pageIndex: number; message: string }>();

  const activeEdits = useMemo(() => activePdfEdits(document), [document]);
  const deletedPages = useMemo(
    () => new Set(activeEdits.filter((edit) => edit.type === 'delete-page').map((edit) => edit.pageIndex)),
    [activeEdits],
  );
  const visiblePages = pdf
    ? Array.from({ length: pdf.numPages }, (_, pageIndex) => pageIndex).filter((pageIndex) => !deletedPages.has(pageIndex))
    : [];

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | undefined;
    setError(undefined);

    void (async () => {
      try {
        loadingTask = getDocument({ data: await document.originalBlob.arrayBuffer() });
        const loaded = await loadingTask.promise;
        if (!cancelled) setPdf(loaded);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Falha ao renderizar PDF.');
      }
    })();

    return () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [document.id, document.originalBlob]);

  useEffect(() => {
    if (readOnly) setTool('select');
  }, [readOnly]);

  async function addOperation(operation: PdfEditOperation) {
    onDocumentChange(await commitPdfEdit(document, operation));
  }

  async function handleUndo() {
    onDocumentChange(await undoPdfEdit(document));
  }

  async function handleRedo() {
    onDocumentChange(await redoPdfEdit(document));
  }

  async function handleClear() {
    onDocumentChange(await clearPdfEdits(document));
  }

  async function handleOcrPage(pageIndex: number) {
    if (!pdf || ocrBusyPage !== undefined) return;

    setOcrBusyPage(pageIndex);
    setOcrProgress(0);
    setOcrStatus('Preparando página');
    setOcrError(undefined);

    try {
      const page = await pdf.getPage(pageIndex + 1);
      const result = await recognizePdfPage(page, ocrLanguage, ({ progress, status }) => {
        setOcrProgress(Math.max(0, Math.min(1, progress)));
        setOcrStatus(status);
      });
      onDocumentChange(await persistPdfOcrResult(document, result));
    } catch (reason) {
      setOcrError({
        pageIndex,
        message: reason instanceof Error ? reason.message : 'Falha durante o OCR.',
      });
    } finally {
      setOcrBusyPage(undefined);
      setOcrProgress(0);
      setOcrStatus('');
    }
  }

  async function handleOcrTextSave(pageIndex: number, nextText: string) {
    onDocumentChange(await updatePdfOcrText(document, pageIndex, nextText));
  }

  async function handleOcrWordApply(pageIndex: number, wordIndex: number, nextText: string) {
    if (readOnly) throw new Error('Ative o modo Editar para substituir texto visualmente no PDF.');
    const result = document.pdfOcr?.find((item) => item.pageIndex === pageIndex);
    const word = result?.words?.[wordIndex];
    if (!word) throw new Error('Palavra OCR não encontrada. Execute o OCR novamente nesta página.');

    const visualEdit: PdfEditOperation = {
      id: crypto.randomUUID(),
      type: 'ocr-replace',
      pageIndex,
      createdAt: new Date().toISOString(),
      xRatio: Math.max(0, word.xRatio - 0.0015),
      yRatio: Math.max(0, word.yRatio - 0.0015),
      widthRatio: Math.min(1 - word.xRatio, word.widthRatio + 0.003),
      heightRatio: Math.min(1 - word.yRatio, word.heightRatio + 0.003),
      text: nextText,
      color: { r: 20, g: 20, b: 20 },
    };

    // Primeiro registramos a alteração visual no histórico do PDF e só então
    // sincronizamos a representação textual OCR usando o documento já atualizado.
    const withVisualEdit = await commitPdfEdit(document, visualEdit);
    onDocumentChange(await updatePdfOcrWord(withVisualEdit, pageIndex, wordIndex, nextText));
  }

  if (error) return <div className="error-panel">{error}</div>;

  const cursor = document.pdfEditCursor ?? document.pdfEdits?.length ?? 0;
  const editCount = document.pdfEdits?.length ?? 0;

  return (
    <div className="pdf-editor">
      <div className="pdf-ocr-strip">
        <div className="pdf-ocr-title"><ScanText size={16} /><strong>OCR local</strong></div>
        <label>
          Idioma
          <select value={ocrLanguage} disabled={ocrBusyPage !== undefined} onChange={(event) => setOcrLanguage(event.target.value as PdfOcrLanguageMode)}>
            <option value="por">Português</option>
            <option value="eng">Inglês</option>
            <option value="por-eng">Português + Inglês</option>
          </select>
        </label>
        <span>Após o OCR, o modo Leitura ganha texto selecionável sobre a página e o Ctrl+F pode localizar palavras reconhecidas. No modo Editar, use “Editar texto na página”.</span>
      </div>

      {!readOnly && (
        <div className="pdf-editor-toolbar" aria-label="Ferramentas de edição PDF">
          <div className="tool-group">
            <ToolButton active={tool === 'select'} icon={<MousePointer2 size={16} />} label="Selecionar" onClick={() => setTool('select')} />
            <ToolButton active={tool === 'text'} icon={<Type size={16} />} label="Texto" onClick={() => setTool('text')} />
            <ToolButton active={tool === 'highlight'} icon={<Highlighter size={16} />} label="Destacar" onClick={() => setTool('highlight')} />
            <ToolButton active={tool === 'whiteout'} icon={<Eraser size={16} />} label="Cobrir" onClick={() => setTool('whiteout')} />
            <ToolButton active={tool === 'draw'} icon={<Pencil size={16} />} label="Desenhar" onClick={() => setTool('draw')} />
          </div>

          {tool === 'text' && (
            <div className="tool-group">
              <input className="pdf-inline-input" value={text} onChange={(event) => setText(event.target.value)} aria-label="Texto a inserir" />
              <input className="pdf-inline-input pdf-inline-number" type="number" min="6" max="96" value={fontSize} onChange={(event) => setFontSize(Math.max(6, Math.min(96, Number(event.target.value) || 16)))} aria-label="Tamanho da fonte" />
              <input className="pdf-color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Cor do texto" />
            </div>
          )}

          {tool === 'draw' && (
            <div className="tool-group">
              <input className="pdf-inline-input pdf-inline-number" type="number" min="1" max="12" value={strokeWidth} onChange={(event) => setStrokeWidth(Math.max(1, Math.min(12, Number(event.target.value) || 2)))} aria-label="Espessura do traço" />
              <input className="pdf-color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Cor do traço" />
            </div>
          )}

          <div className="tool-group">
            <button className="pdf-tool" disabled={cursor <= 0} onClick={() => void handleUndo()}><Undo2 size={16} /><span>Desfazer</span></button>
            <button className="pdf-tool" disabled={cursor >= editCount} onClick={() => void handleRedo()}><Redo2 size={16} /><span>Refazer</span></button>
            <button className="pdf-tool" disabled={editCount === 0} onClick={() => void handleClear()}><Trash2 size={16} /><span>Limpar edições</span></button>
          </div>
          <span className="pdf-edit-count">{cursor} alteração(ões) ativa(s)</span>
        </div>
      )}

      {!readOnly && (
        <div className="pdf-editor-hint">
          Texto: clique para inserir. Destacar/Cobrir: arraste a área. Desenhar: mantenha pressionado. OCR: execute e use “Editar texto na página”.
        </div>
      )}

      <div className="pdf-viewer">
        {pdf && visiblePages.map((pageIndex) => (
          <PdfPage
            key={pageIndex}
            pdf={pdf}
            pageIndex={pageIndex}
            edits={activeEdits.filter((edit) => edit.pageIndex === pageIndex)}
            ocrResult={document.pdfOcr?.find((result) => result.pageIndex === pageIndex)}
            ocrBusy={ocrBusyPage === pageIndex}
            ocrDisabled={ocrBusyPage !== undefined && ocrBusyPage !== pageIndex}
            ocrProgress={ocrBusyPage === pageIndex ? ocrProgress : 0}
            ocrStatus={ocrBusyPage === pageIndex ? ocrStatus : ''}
            ocrError={ocrError?.pageIndex === pageIndex ? ocrError.message : undefined}
            readOnly={readOnly}
            tool={tool}
            text={text}
            fontSize={fontSize}
            color={hexToPdfColor(color)}
            strokeWidth={strokeWidth}
            canDelete={visiblePages.length > 1}
            onAdd={addOperation}
            onOcr={() => handleOcrPage(pageIndex)}
            onOcrTextSave={(nextText) => handleOcrTextSave(pageIndex, nextText)}
            onOcrWordApply={(wordIndex, nextText) => handleOcrWordApply(pageIndex, wordIndex, nextText)}
          />
        ))}
      </div>
    </div>
  );
}

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  edits: PdfEditOperation[];
  ocrResult?: PdfOcrResult;
  ocrBusy: boolean;
  ocrDisabled: boolean;
  ocrProgress: number;
  ocrStatus: string;
  ocrError?: string;
  readOnly: boolean;
  tool: PdfTool;
  text: string;
  fontSize: number;
  color: PdfColor;
  strokeWidth: number;
  canDelete: boolean;
  onAdd: (operation: PdfEditOperation) => Promise<void>;
  onOcr: () => Promise<void>;
  onOcrTextSave: (text: string) => Promise<void>;
  onOcrWordApply: (wordIndex: number, text: string) => Promise<void>;
}

function PdfPage({
  pdf,
  pageIndex,
  edits,
  ocrResult,
  ocrBusy,
  ocrDisabled,
  ocrProgress,
  ocrStatus,
  ocrError,
  readOnly,
  tool,
  text,
  fontSize,
  color,
  strokeWidth,
  canDelete,
  onAdd,
  onOcr,
  onOcrTextSave,
  onOcrWordApply,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftPointsRef = useRef<PdfPoint[]>([]);
  const draftFrameRef = useRef<number | undefined>(undefined);
  const rectangleStartRef = useRef<PdfPoint | undefined>(undefined);
  const [draftPoints, setDraftPoints] = useState<PdfPoint[]>([]);
  const [draftRectangle, setDraftRectangle] = useState<DraftRectangle>();
  const [ocrEditMode, setOcrEditMode] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>();
  const [wordDraft, setWordDraft] = useState('');
  const [wordSaving, setWordSaving] = useState(false);
  const [wordError, setWordError] = useState<string>();

  const rotation = edits
    .filter((edit): edit is Extract<PdfEditOperation, { type: 'rotate' }> => edit.type === 'rotate')
    .reduce((sum, edit) => sum + edit.degrees, 0);

  const selectedWord = selectedWordIndex === undefined ? undefined : ocrResult?.words?.[selectedWordIndex];

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;

    void (async () => {
      try {
        const page = await pdf.getPage(pageIndex + 1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch (reason) {
        if (!cancelled && !(reason instanceof Error && reason.name === 'RenderingCancelledException')) throw reason;
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageIndex]);

  useEffect(() => () => {
    if (draftFrameRef.current !== undefined) cancelAnimationFrame(draftFrameRef.current);
  }, []);

  useEffect(() => {
    if (readOnly) {
      setOcrEditMode(false);
      setSelectedWordIndex(undefined);
      setWordDraft('');
    }
  }, [readOnly]);

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): PdfPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      xRatio: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))),
      yRatio: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))),
    };
  }

  function baseOperation() {
    return { id: crypto.randomUUID(), pageIndex, createdAt: new Date().toISOString() };
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (ocrEditMode || readOnly || tool !== 'text' || !text.trim()) return;
    const point = pointFromEvent(event);
    void onAdd({ ...baseOperation(), type: 'text', ...point, text, size: fontSize, color });
  }

  function scheduleDraftRender() {
    if (draftFrameRef.current !== undefined) return;
    draftFrameRef.current = requestAnimationFrame(() => {
      setDraftPoints([...draftPointsRef.current]);
      draftFrameRef.current = undefined;
    });
  }

  function appendDrawingPoint(point: PdfPoint, force = false) {
    const points = draftPointsRef.current;
    const previous = points[points.length - 1];
    if (!force && previous) {
      const distance = Math.hypot(point.xRatio - previous.xRatio, point.yRatio - previous.yRatio);
      if (distance < MIN_DRAWING_DISTANCE) return;
    }

    let next = [...points, point];
    if (next.length > MAX_DRAWING_POINTS) next = next.filter((_, index) => index % 2 === 0);
    draftPointsRef.current = next;
    scheduleDraftRender();
  }

  function rectangleFromPoints(start: PdfPoint, end: PdfPoint): DraftRectangle {
    return {
      xRatio: Math.min(start.xRatio, end.xRatio),
      yRatio: Math.min(start.yRatio, end.yRatio),
      widthRatio: Math.abs(end.xRatio - start.xRatio),
      heightRatio: Math.abs(end.yRatio - start.yRatio),
    };
  }

  function resetInteraction() {
    if (draftFrameRef.current !== undefined) {
      cancelAnimationFrame(draftFrameRef.current);
      draftFrameRef.current = undefined;
    }
    draftPointsRef.current = [];
    rectangleStartRef.current = undefined;
    setDraftPoints([]);
    setDraftRectangle(undefined);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (ocrEditMode || readOnly || !['draw', 'highlight', 'whiteout'].includes(tool)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);

    if (tool === 'draw') {
      draftPointsRef.current = [point];
      setDraftPoints([point]);
      return;
    }

    rectangleStartRef.current = point;
    setDraftRectangle({ ...point, widthRatio: 0, heightRatio: 0 });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (readOnly || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const point = pointFromEvent(event);

    if (tool === 'draw') {
      appendDrawingPoint(point);
      return;
    }

    if ((tool === 'highlight' || tool === 'whiteout') && rectangleStartRef.current) {
      setDraftRectangle(rectangleFromPoints(rectangleStartRef.current, point));
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (readOnly || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const point = pointFromEvent(event);

    if (tool === 'draw') {
      appendDrawingPoint(point, true);
      const points = draftPointsRef.current;
      if (points.length > 1) void onAdd({ ...baseOperation(), type: 'drawing', points, width: strokeWidth, color });
    } else if ((tool === 'highlight' || tool === 'whiteout') && rectangleStartRef.current) {
      const rectangle = rectangleFromPoints(rectangleStartRef.current, point);
      if (rectangle.widthRatio >= MIN_RECTANGLE_SIZE && rectangle.heightRatio >= MIN_RECTANGLE_SIZE) {
        void onAdd({
          ...baseOperation(),
          type: 'rectangle',
          purpose: tool === 'highlight' ? 'highlight' : 'whiteout',
          ...rectangle,
          color: tool === 'highlight' ? { r: 255, g: 225, b: 0 } : { r: 255, g: 255, b: 255 },
          opacity: tool === 'highlight' ? 0.35 : 1,
        });
      }
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    resetInteraction();
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resetInteraction();
  }

  async function addImage(file: File) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) return;
    await onAdd({
      ...baseOperation(),
      type: 'image',
      imageBlob: file,
      mimeType: file.type as 'image/png' | 'image/jpeg',
      xRatio: 0.25,
      yRatio: 0.25,
      widthRatio: 0.5,
      heightRatio: 0.3,
    });
  }

  function selectOcrWord(index: number, word: PdfOcrWord) {
    setSelectedWordIndex(index);
    setWordDraft(word.text);
    setWordError(undefined);
  }

  async function applySelectedWord() {
    if (selectedWordIndex === undefined || !wordDraft.trim()) return;
    setWordSaving(true);
    setWordError(undefined);
    try {
      await onOcrWordApply(selectedWordIndex, wordDraft.trim());
      setSelectedWordIndex(undefined);
      setWordDraft('');
    } catch (reason) {
      setWordError(reason instanceof Error ? reason.message : 'Não foi possível aplicar a correção OCR.');
    } finally {
      setWordSaving(false);
    }
  }

  const overlayEdits = edits.filter((edit) => !['rotate', 'delete-page'].includes(edit.type));
  const interacting = !readOnly && !ocrEditMode && ['draw', 'highlight', 'whiteout'].includes(tool);
  const hasMappedWords = (ocrResult?.words?.length ?? 0) > 0;

  return (
    <div className="pdf-page-block">
      <div
        className={`pdf-page-frame ${!readOnly && tool !== 'select' && !ocrEditMode ? 'is-editable' : ''} ${interacting ? 'is-interacting' : ''} ${ocrEditMode ? 'ocr-editing' : ''}`}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <canvas ref={canvasRef} className="pdf-page" />

        <div className="pdf-overlay">
          {overlayEdits.map((edit) => <PdfOverlay key={edit.id} edit={edit} />)}
          {draftPoints.length > 1 && (
            <svg className="pdf-overlay-drawing" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={draftPoints.map((point) => `${point.xRatio * 100},${point.yRatio * 100}`).join(' ')} fill="none" stroke={colorToCss(color)} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {draftRectangle && (
            <span
              className={`pdf-draft-rectangle ${tool === 'highlight' ? 'highlight' : 'whiteout'}`}
              style={{
                left: `${draftRectangle.xRatio * 100}%`,
                top: `${draftRectangle.yRatio * 100}%`,
                width: `${draftRectangle.widthRatio * 100}%`,
                height: `${draftRectangle.heightRatio * 100}%`,
              }}
            />
          )}
        </div>

        {readOnly && ocrResult?.words && (
          <div className="pdf-ocr-select-layer" aria-label={`Camada textual OCR da página ${pageIndex + 1}`}>
            {ocrResult.words.map((word, index) => (
              <span
                key={`select-${word.lineIndex}-${index}-${word.text}`}
                className="pdf-ocr-select-word"
                style={{
                  left: `${word.xRatio * 100}%`,
                  top: `${word.yRatio * 100}%`,
                  width: `${word.widthRatio * 100}%`,
                  height: `${word.heightRatio * 100}%`,
                }}
                title={word.text}
              >
                {word.text}
              </span>
            ))}
          </div>
        )}

        {ocrEditMode && ocrResult?.words && (
          <div className="pdf-ocr-word-layer" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            {ocrResult.words.map((word, index) => (
              <button
                key={`${word.lineIndex}-${index}-${word.text}`}
                className={`pdf-ocr-word ${selectedWordIndex === index ? 'active' : ''}`}
                style={{
                  left: `${word.xRatio * 100}%`,
                  top: `${word.yRatio * 100}%`,
                  width: `${word.widthRatio * 100}%`,
                  height: `${word.heightRatio * 100}%`,
                }}
                title={`${word.text} · confiança ${Math.round(word.confidence)}%`}
                onClick={() => selectOcrWord(index, word)}
              />
            ))}
          </div>
        )}

        {rotation !== 0 && <span className="pdf-rotation-badge">Rotação {((rotation % 360) + 360) % 360}° na exportação</span>}
        <span className="pdf-page-label">Página {pageIndex + 1}</span>

        {!readOnly && !ocrEditMode && (
          <div className="pdf-page-actions" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <button className="pdf-page-action" title="Girar à esquerda" onClick={() => void onAdd({ ...baseOperation(), type: 'rotate', degrees: -90 })}><RotateCcw size={15} /></button>
            <button className="pdf-page-action" title="Girar à direita" onClick={() => void onAdd({ ...baseOperation(), type: 'rotate', degrees: 90 })}><RotateCw size={15} /></button>
            <label className="pdf-page-action" title="Adicionar imagem"><ImagePlus size={15} /><input hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file); event.currentTarget.value = ''; }} /></label>
            <button className="pdf-page-action" disabled={!canDelete} title={canDelete ? 'Excluir página' : 'O PDF precisa manter uma página'} onClick={() => { if (canDelete) void onAdd({ ...baseOperation(), type: 'delete-page' }); }}><Trash2 size={15} /></button>
          </div>
        )}

        {ocrBusy && (
          <div className="pdf-ocr-progress" aria-live="polite">
            <ScanText size={18} />
            <strong>{Math.round(ocrProgress * 100)}%</strong>
            <span>{ocrStatus || 'Executando OCR'}</span>
          </div>
        )}
      </div>

      <div className="pdf-page-ocr-row">
        <div className="pdf-ocr-page-buttons">
          <button className="pdf-ocr-run" disabled={ocrBusy || ocrDisabled} onClick={() => void onOcr()}>
            <ScanText size={15} />
            {ocrBusy ? `OCR ${Math.round(ocrProgress * 100)}%` : ocrResult ? 'Executar OCR novamente' : 'Executar OCR nesta página'}
          </button>
          {!readOnly && hasMappedWords && (
            <button
              className={`pdf-ocr-run ${ocrEditMode ? 'active' : ''}`}
              onClick={() => {
                setOcrEditMode((value) => !value);
                setSelectedWordIndex(undefined);
                setWordDraft('');
              }}
            >
              {ocrEditMode ? <X size={15} /> : <Type size={15} />}
              {ocrEditMode ? 'Sair da edição OCR' : 'Editar texto na página'}
            </button>
          )}
        </div>
        <span>
          {ocrResult
            ? hasMappedWords
              ? readOnly
                ? `${ocrResult.words?.length ?? 0} palavras mapeadas · texto selecionável/CTRL+F ativo`
                : `${ocrResult.words?.length ?? 0} palavras mapeadas · ${ocrResult.text.length} caracteres`
              : 'OCR antigo sem coordenadas. Execute novamente para habilitar edição direta.'
            : 'O OCR reconhece texto e mapeia cada palavra sobre a página.'}
        </span>
      </div>

      {ocrEditMode && (
        <div className="pdf-ocr-edit-help">
          Clique numa palavra destacada na página, altere o texto abaixo e aplique. A correção cria uma cobertura + novo texto no PDF sem alterar o original.
        </div>
      )}

      {ocrEditMode && selectedWord && selectedWordIndex !== undefined && (
        <div className="pdf-ocr-word-editor">
          <div>
            <span className="eyebrow">Palavra selecionada</span>
            <strong>{selectedWord.text}</strong>
          </div>
          <input
            autoFocus
            value={wordDraft}
            onChange={(event) => setWordDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void applySelectedWord();
              if (event.key === 'Escape') setSelectedWordIndex(undefined);
            }}
            aria-label="Novo texto da palavra OCR"
          />
          <button className="button primary small" disabled={wordSaving || !wordDraft.trim()} onClick={() => void applySelectedWord()}>
            <Check size={15} />{wordSaving ? 'Aplicando...' : 'Aplicar no PDF'}
          </button>
          <button className="button small" onClick={() => setSelectedWordIndex(undefined)}><X size={15} />Cancelar</button>
          {wordError && <span className="pdf-ocr-inline-error">{wordError}</span>}
        </div>
      )}

      {ocrError && <div className="pdf-ocr-error">OCR: {ocrError}</div>}
      {ocrResult && <PdfOcrPanel result={ocrResult} onSave={onOcrTextSave} />}
    </div>
  );
}

function PdfOcrPanel({ result, onSave }: { result: PdfOcrResult; onSave: (text: string) => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(result.text);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  useEffect(() => {
    setDraft(result.text);
  }, [result.text]);

  async function copyText() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function saveText() {
    if (draft === result.text) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      await onSave(draft);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar a correção OCR.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="pdf-ocr-result">
      <summary>
        <span><ScanText size={15} />Texto OCR · confiança {Math.round(result.confidence)}% · {result.language.toUpperCase()}</span>
        <span>{draft ? `${draft.length} caracteres` : 'sem texto detectado'}{result.editedAt ? ' · editado' : ''}</span>
      </summary>
      <div className="pdf-ocr-result-body">
        <div className="pdf-ocr-result-actions">
          <button className="pdf-ocr-copy" disabled={!draft} onClick={() => void copyText()}><Copy size={14} />{copied ? 'Copiado' : 'Copiar texto'}</button>
          <button className="pdf-ocr-copy" disabled={saving || draft === result.text} onClick={() => void saveText()}><Save size={14} />{saving ? 'Salvando...' : saved ? 'Salvo' : 'Salvar texto OCR'}</button>
        </div>
        <textarea
          className="pdf-ocr-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="O texto reconhecido aparecerá aqui para correção."
          aria-label="Texto reconhecido pelo OCR"
        />
        {saveError && <p className="pdf-ocr-inline-error">{saveError}</p>}
        <p className="pdf-ocr-note">Este campo edita a transcrição OCR. No modo Leitura, as palavras mapeadas também formam uma camada selecionável sobre a página. Para trocar visualmente uma palavra, ative o modo Editar e use “Editar texto na página”.</p>
      </div>
    </details>
  );
}

function PdfOverlay({ edit }: { edit: PdfEditOperation }) {
  if (edit.type === 'text') {
    return <span className="pdf-overlay-text" style={{ left: `${edit.xRatio * 100}%`, top: `${edit.yRatio * 100}%`, fontSize: `${edit.size}px`, color: colorToCss(edit.color) }}>{edit.text}</span>;
  }

  if (edit.type === 'ocr-replace') {
    return (
      <span
        className="pdf-overlay-ocr-replace"
        style={{
          left: `${edit.xRatio * 100}%`,
          top: `${edit.yRatio * 100}%`,
          width: `${edit.widthRatio * 100}%`,
          height: `${edit.heightRatio * 100}%`,
          color: colorToCss(edit.color),
          fontSize: `${Math.max(7, Math.min(30, edit.heightRatio * 720))}px`,
        }}
      >
        {edit.text}
      </span>
    );
  }

  if (edit.type === 'rectangle') {
    return <span className="pdf-overlay-rect" style={{ left: `${edit.xRatio * 100}%`, top: `${edit.yRatio * 100}%`, width: `${edit.widthRatio * 100}%`, height: `${edit.heightRatio * 100}%`, background: colorToCss(edit.color), opacity: edit.opacity }} />;
  }

  if (edit.type === 'drawing') {
    return (
      <svg className="pdf-overlay-drawing" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={edit.points.map((point) => `${point.xRatio * 100},${point.yRatio * 100}`).join(' ')} fill="none" stroke={colorToCss(edit.color)} strokeWidth={edit.width} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  if (edit.type === 'image') return <PdfImageOverlay edit={edit} />;
  return null;
}

function PdfImageOverlay({ edit }: { edit: Extract<PdfEditOperation, { type: 'image' }> }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(edit.imageBlob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [edit.imageBlob]);

  return <img className="pdf-overlay-image" src={url} alt="Imagem adicionada ao PDF" style={{ left: `${edit.xRatio * 100}%`, top: `${edit.yRatio * 100}%`, width: `${edit.widthRatio * 100}%`, height: `${edit.heightRatio * 100}%` }} />;
}

function ToolButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`pdf-tool ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function hexToPdfColor(hex: string): PdfColor {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function colorToCss(color: PdfColor) {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}
