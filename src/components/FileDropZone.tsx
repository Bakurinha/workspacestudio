import { useRef, useState, type DragEvent } from 'react';
import { FilePlus2, UploadCloud } from 'lucide-react';

interface FileDropZoneProps {
  disabled?: boolean;
  onFile: (file: File) => Promise<void> | void;
}

export function FileDropZone({ disabled, onFile }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) await onFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div
      className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <UploadCloud size={42} strokeWidth={1.5} />
      <div>
        <strong>Arraste um arquivo para começar</strong>
        <p>XLSX, XLSM, CSV, PDF, DOCX, TXT, JSON, Markdown e XML.</p>
      </div>
      <button className="button primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <FilePlus2 size={18} />
        Selecionar arquivo
      </button>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".xlsx,.xlsm,.csv,.pdf,.docx,.txt,.json,.md,.xml"
        onChange={(event) => void handleFiles(event.target.files)}
      />
    </div>
  );
}
