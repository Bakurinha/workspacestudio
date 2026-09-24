import { FileSpreadsheet, FileText, FileType2, Files, Trash2 } from 'lucide-react';
import type { DocumentKind, DocumentRecord } from '../types/document';

interface FileListProps {
  documents: DocumentRecord[];
  activeId?: string;
  onSelect: (document: DocumentRecord) => void;
  onDelete: (document: DocumentRecord) => void;
}

function iconFor(kind: DocumentKind) {
  if (kind === 'spreadsheet') return <FileSpreadsheet size={18} />;
  if (kind === 'pdf' || kind === 'docx') return <FileText size={18} />;
  if (kind === 'text') return <FileType2 size={18} />;
  return <Files size={18} />;
}

export function FileList({ documents, activeId, onSelect, onDelete }: FileListProps) {
  if (documents.length === 0) {
    return <p className="muted sidebar-empty">Nenhum arquivo importado ainda.</p>;
  }

  return (
    <div className="file-list">
      {documents.map((document) => (
        <div className={`file-list-row ${activeId === document.id ? 'active' : ''}`} key={document.id}>
          <button className="file-list-main" onClick={() => onSelect(document)} title={document.name}>
            {iconFor(document.kind)}
            <span>
              <strong>{document.name}</strong>
              <small>{document.kind} · {(document.size / 1024).toFixed(1)} KB</small>
            </span>
          </button>
          <button className="icon-button danger-ghost" onClick={() => onDelete(document)} aria-label={`Excluir ${document.name}`}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
