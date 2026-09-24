import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eraser,
  Highlighter,
  ImagePlus,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { clearPdfEdits, commitPdfEdit, redoPdfEdit, undoPdfEdit } from '../../services/pdfEditService';
import type { DocumentRecord, PdfColor, PdfEditOperation, PdfPoint } from '../../types/document';
import { activePdfEdits } from './pdfExport';
import './pdfEditor.css';

GlobalWorkerOptions.workerSrc = pdfWorker;

type PdfTool = 'select' | 'text' | 'highlight' | 'whiteout' | 'draw';

interface PdfViewerProps {
  document: DocumentRecord;
  readOnly: boolean;
  onDocumentChange: (document: DocumentRecord) => void;
}

export function PdfViewer({ document, readOnly, onDocumentChange }: PdfViewerProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [error, setError] = useState<string>();
  const [tool, setTool] = useState<PdfTool>('select');
  const [text, setText] = useState('Texto');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#1d2433');
  const [strokeWidth, setStrokeWidth] = useState(2);

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
    const updated = await commitPdfEdit(document, operation);
    onDocumentChange(updated);
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

  if (error) return <div className="error-panel">{error}</div>;

  const cursor = document.pdfEditCursor ?? document.pdfEdits?.length ?? 0;
  const editCount = document.pdfEdits?.length ?? 0;

  return (
    <div className="pdf-editor">
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
          Clique na página com a ferramenta escolhida. “Cobrir” cria uma área branca para correções visuais; o texto original do PDF não é reescrito semanticamente nesta versão.
        </div>
      )}

      <div className="pdf-viewer">
        {pdf && visiblePages.map((pageIndex) => (
          <PdfPage
            key={pageIndex}
            pdf={pdf}
            pageIndex={pageIndex}
            edits={activeEdits.filter((edit) => edit.pageIndex === pageIndex)}
            readOnly={readOnly}
            tool={tool}
            text={text}
            fontSize={fontSize}
            color={hexToPdfColor(color)}
            strokeWidth={strokeWidth}
            canDelete={visiblePages.length > 1}
            onAdd={addOperation}
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
  readOnly: boolean;
  tool: PdfTool;
  text: string;
  fontSize: number;
  color: PdfColor;
  strokeWidth: number;
  canDelete: boolean;
  onAdd: (operation: PdfEditOperation) => Promise<void>;
}

function PdfPage({ pdf, pageIndex, edits, readOnly, tool, text, fontSize, color, strokeWidth, canDelete, onAdd }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draftPoints, setDraftPoints] = useState<PdfPoint[]>([]);

  const rotation = edits
    .filter((edit): edit is Extract<PdfEditOperation, { type: 'rotate' }> => edit.type === 'rotate')
    .reduce((sum, edit) => sum + edit.degrees, 0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdf, pageIndex]);

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): PdfPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      xRatio: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      yRatio: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function baseOperation() {
    return { id: crypto.randomUUID(), pageIndex, createdAt: new Date().toISOString() };
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (readOnly || tool === 'select' || tool === 'draw') return;
    const point = pointFromEvent(event);

    if (tool === 'text') {
      if (!text.trim()) return;
      void onAdd({ ...baseOperation(), type: 'text', ...point, text, size: fontSize, color });
      return;
    }

    if (tool === 'highlight') {
      void onAdd({
        ...baseOperation(),
        type: 'rectangle',
        purpose: 'highlight',
        ...point,
        widthRatio: 0.24,
        heightRatio: 0.035,
        color: { r: 255, g: 225, b: 0 },
        opacity: 0.35,
      });
      return;
    }

    void onAdd({
      ...baseOperation(),
      type: 'rectangle',
      purpose: 'whiteout',
      ...point,
      widthRatio: 0.24,
      heightRatio: 0.05,
      color: { r: 255, g: 255, b: 255 },
      opacity: 1,
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (readOnly || tool !== 'draw') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftPoints([pointFromEvent(event)]);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (readOnly || tool !== 'draw' || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setDraftPoints((points) => [...points, pointFromEvent(event)]);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (readOnly || tool !== 'draw') return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (draftPoints.length > 1) {
      void onAdd({ ...baseOperation(), type: 'drawing', points: draftPoints, width: strokeWidth, color });
    }
    setDraftPoints([]);
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

  const overlayEdits = edits.filter((edit) => !['rotate', 'delete-page'].includes(edit.type));

  return (
    <div
      className={`pdf-page-frame ${!readOnly && tool !== 'select' ? 'is-editable' : ''} ${tool === 'draw' ? 'is-drawing' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <canvas ref={canvasRef} className="pdf-page" />
      <div className="pdf-overlay">
        {overlayEdits.map((edit) => <PdfOverlay key={edit.id} edit={edit} />)}
        {draftPoints.length > 1 && (
          <svg className="pdf-overlay-drawing" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={draftPoints.map((point) => `${point.xRatio * 100},${point.yRatio * 100}`).join(' ')} fill="none" stroke={colorToCss(color)} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>

      {rotation !== 0 && <span className="pdf-rotation-badge">Rotação {((rotation % 360) + 360) % 360}° na exportação</span>}
      <span className="pdf-page-label">Página {pageIndex + 1}</span>

      {!readOnly && (
        <div className="pdf-page-actions" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
          <button className="pdf-page-action" title="Girar à esquerda" onClick={() => void onAdd({ ...baseOperation(), type: 'rotate', degrees: -90 })}><RotateCcw size={15} /></button>
          <button className="pdf-page-action" title="Girar à direita" onClick={() => void onAdd({ ...baseOperation(), type: 'rotate', degrees: 90 })}><RotateCw size={15} /></button>
          <label className="pdf-page-action" title="Adicionar imagem"><ImagePlus size={15} /><input hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file); event.currentTarget.value = ''; }} /></label>
          <button className="pdf-page-action" disabled={!canDelete} title={canDelete ? 'Excluir página' : 'O PDF precisa manter uma página'} onClick={() => { if (canDelete) void onAdd({ ...baseOperation(), type: 'delete-page' }); }}><Trash2 size={15} /></button>
        </div>
      )}
    </div>
  );
}

function PdfOverlay({ edit }: { edit: PdfEditOperation }) {
  if (edit.type === 'text') {
    return <span className="pdf-overlay-text" style={{ left: `${edit.xRatio * 100}%`, top: `${edit.yRatio * 100}%`, fontSize: `${edit.size}px`, color: colorToCss(edit.color) }}>{edit.text}</span>;
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
