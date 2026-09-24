import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import type { DocumentRecord } from '../../types/document';

export function DocxViewer({ document }: { document: DocumentRecord }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.replaceChildren();
    setError(undefined);

    void renderAsync(document.originalBlob, container, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      useBase64URL: true,
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Não foi possível renderizar o DOCX.');
    });
  }, [document]);

  return error ? <div className="error-panel">{error}</div> : <div className="docx-viewer" ref={ref} />;
}
