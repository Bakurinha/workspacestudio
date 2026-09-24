# Arquitetura

**Versão:** 0.3.0

## Objetivo

Separar interface, regras de negócio, persistência e formatos de arquivo para permitir que o projeto cresça para web, PWA, Android, desktop e backend sem reescrever o núcleo.

## Camadas

```text
React UI
  ↓
Services / Use Cases
  ↓
Domain / Rules / Parsers / Exporters
  ↓
Repositories
  ↓
IndexedDB (Dexie)
```

### UI

Responsável por interação e apresentação. Não deve acessar IndexedDB diretamente.

### Services

Coordenam casos de uso, como importação, histórico, undo/redo, edição PDF, OCR e futuras sincronizações.

### Domain / Modules

Contém comportamento específico:

- planilhas;
- motor de regras;
- visualizadores;
- editor/exportador de PDF;
- visualização DOCX;
- futuras camadas editáveis de DOCX e outros formatos.

### Repositories

Encapsulam persistência e impedem acoplamento da UI com IndexedDB.

## Documento

```text
DocumentRecord
├── metadados
├── hash
├── Blob original imutável
├── conteúdo interno editável (quando suportado)
├── operações PDF
├── resultados OCR por página
├── metadados detectados
└── posições de histórico/cursores
```

Campos opcionais permitem que documentos importados por versões anteriores continuem válidos.

## Histórico de planilha

Ações atualmente suportadas:

- mudanças de células;
- adicionar registro;
- adicionar coluna.

Cada ação recebe sequência crescente. Ao editar depois de um undo, o ramo de redo é descartado.

## Edição PDF

A edição de PDF não altera o `originalBlob`.

```text
originalBlob
   ↓
PDF.js → visualização
   ↓
PdfEditOperation[] → IndexedDB
   ↓
pdf-lib → exportação
   ↓
nova cópia PDF
```

Operações incluem texto, retângulo, desenho, imagem, rotação e exclusão de página.

O desenho livre usa amostragem de pontos e `requestAnimationFrame` para impedir que eventos de ponteiro gerem milhares de atualizações React por segundo.

As ferramentas de retângulo usam coordenadas normalizadas (`0..1`) e seleção por arraste, mantendo o comportamento independente da resolução/tamanho exibido da página.

## OCR de PDF

O OCR é implementado como processamento de imagem no navegador.

```text
PDF original
   ↓
PDF.js
   ↓
canvas temporário em resolução ampliada
   ↓
Tesseract.js / Web Worker
   ↓
PdfOcrResult
   ↓
Service
   ↓
Repository
   ↓
IndexedDB
```

O Tesseract.js não processa o PDF diretamente. O serviço recebe uma `PDFPageProxy`, renderiza um canvas temporário e envia somente esse objeto local para o worker da biblioteca.

O código da aplicação não envia o documento para um serviço remoto de OCR. A engine e os modelos de idioma podem ser baixados pela biblioteca durante a inicialização do worker.

Resultados OCR armazenados:

```text
pageIndex
language
text
confidence
recognizedAt
```

O OCR não altera o arquivo original e, na v0.3.0, também não altera o PDF exportado. Ele cria uma representação textual auxiliar para leitura/cópia e futuras funções de busca/camada pesquisável.

## Motor de regras

O motor é independente do componente visual da tabela. Ele recebe uma `SpreadsheetSheet` e produz uma lista de alterações (`CellChange[]`).

Isso permite futuramente aplicar a mesma lógica em dados vindos de:

- formulários;
- CSV;
- APIs;
- banco remoto;
- outros modelos tabulares.

## Persistência

Banco: `workspace-studio`.

Stores atuais:

```text
documents
settings
rules
history
```

A adição de campos opcionais dentro de `DocumentRecord`, como `pdfEdits` e `pdfOcr`, não altera os indexes/object stores do Dexie. Alterações futuras em schema/indexes deverão criar uma nova versão Dexie e migration explícita.

## PWA

A instalação utiliza `manifest.webmanifest`. Nesta versão não há service worker de cache para evitar persistência controlada fora do IndexedDB.

## Android

Capacitor usa a mesma build web em `dist/`. O diretório nativo pode ser gerado com `npm run android:add`.
