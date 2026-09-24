import { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { DocumentRecord } from '../../types/document';

GlobalWorkerOptions.workerSrc = pdfWorker;

export function PdfViewer({ document }: { document: DocumentRecord }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();

    void (async () => {
      try {
        const pdf = await getDocument({ data: await document.originalBlob.arrayBuffer() }).promise;
        for (let number = 1; number <= pdf.numPages; number += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(number);
          const baseViewport = page.getViewport({ scale: 1 });
          const maxWidth = Math.max(320, Math.min(container.clientWidth - 32, 1200));
          const scale = Math.max(0.5, Math.min(2, maxWidth / baseViewport.width));
          const viewport = page.getViewport({ scale });
          const canvas = documentGlobal.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = 'pdf-page';
          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Falha ao renderizar PDF.');
      }
    })();

    return () => { cancelled = true; };
  }, [document]);

  return error ? <div className="error-panel">{error}</div> : <div className="pdf-viewer" ref={containerRef} />;
}

// Alias explícito para evitar colisão com a propriedade `document` recebida pelo componente.
const documentGlobal = globalThis.document;
