import { useEffect, useState } from 'react';
import type { DocumentRecord } from '../../types/document';

export function TextViewer({ document }: { document: DocumentRecord }) {
  const [text, setText] = useState('Carregando...');
  useEffect(() => { void document.originalBlob.text().then(setText); }, [document]);
  return <pre className="text-viewer">{text}</pre>;
}
