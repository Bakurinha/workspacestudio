# Arquitetura

**Versão:** 0.4.1

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
- seleção de faixas tabulares;
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
├── resultados OCR por página + palavras mapeadas
├── metadados detectados
└── posições de histórico/cursores
```

Campos opcionais permitem que documentos importados por versões anteriores continuem válidos.

## Planilhas e seleção de faixa

O modelo interno mantém cabeçalhos separados dos dados:

```text
SpreadsheetSheet
├── headers[]
└── rows[][]
```

Por isso o motor de regras trabalha somente sobre `rows` e não sobre o cabeçalho importado.

A seleção visual é estado de interface (`SpreadsheetSelection`) e contém:

```text
sheetIndex
columnIndex
startRowIndex
endRowIndex
```

A UI converte essa seleção para `targetColumn`, `startRow` e `endRow` ao abrir o painel de regras. O motor continua independente da tabela: ele recebe somente a `SpreadsheetSheet` e a `ColumnRule`.

```text
Matriz / seleção
      ↓
SpreadsheetSelection
      ↓
RulePanel
      ↓
ColumnRule(startRow/endRow)
      ↓
ruleEngine
      ↓
CellChange[]
      ↓
historyService / IndexedDB
```

As linhas persistidas na regra usam base 1 para serem compreensíveis na interface. O engine normaliza para índices base 0 internamente e limita a faixa ao número real de registros.

Para templates sequenciais, o contador é relativo à faixa. Assim, `{SEQ:4}` com `sequenceStart = 1` gera `0001` na primeira linha selecionada, mesmo que ela esteja no meio da planilha.

## Histórico de planilha

Ações atualmente suportadas:

- mudanças de células;
- adicionar registro;
- adicionar coluna;
- aplicação em massa de regras, registrada como conjunto de mudanças de células.

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

Operações incluem texto, retângulo, desenho, imagem, rotação, exclusão de página e substituição visual originada do OCR (`ocr-replace`).

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
text + blocks
   ↓
PdfOcrResult + PdfOcrWord[]
   ↓
Service
   ↓
Repository
   ↓
IndexedDB
```

O Tesseract.js não processa o PDF diretamente. O serviço recebe uma `PDFPageProxy`, renderiza um canvas temporário e envia somente esse objeto local para o worker da biblioteca.

Para hospedagem estática, os caminhos do worker, core e dados de idioma são configurados explicitamente. O código da aplicação não envia o documento para um serviço remoto de OCR; a engine e os modelos de idioma podem ser baixados durante a inicialização.

Desde a v0.4.1, o OCR solicita explicitamente o formato `blocks`. Cada palavra é convertida em `PdfOcrWord` com:

```text
text
confidence
lineIndex
xRatio
yRatio
widthRatio
heightRatio
```

As coordenadas são normalizadas em `0..1`, por isso continuam válidas independentemente do zoom visual da página.

### Edição direta por OCR

```text
PdfOcrWord
   ↓
camada interativa sobre PDF.js
   ↓
usuário seleciona palavra
   ↓
novo texto
   ↓
PdfEditOperation(type = ocr-replace)
   ↓
history / IndexedDB
   ↓
pdf-lib na exportação
```

`ocr-replace` é uma substituição visual composta. Na exportação, o sistema cobre a bounding box original com branco e redesenha o texto corrigido dentro da mesma área, ajustando o tamanho para caber.

A alteração também atualiza a palavra correspondente em `PdfOcrResult.words` e recompõe a transcrição OCR por linhas. Isso mantém sincronizadas a camada textual e a edição visual.

Importante: isso ainda não reescreve semanticamente o content stream original. O original permanece imutável e a correção é uma camada aplicada sobre ele.

## Motor de regras

O motor é independente do componente visual da tabela. Ele recebe uma `SpreadsheetSheet` e uma `ColumnRule` e produz uma lista de alterações (`CellChange[]`).

A regra pode conter faixa opcional:

```text
targetColumn
startRow?
endRow?
```

Na ausência da faixa, mantém-se compatibilidade com regras antigas e toda a coluna de dados é processada.

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

A adição de campos opcionais dentro de `DocumentRecord`/`ColumnRule`, como `pdfEdits`, `pdfOcr`, `words`, `startRow` e `endRow`, não altera os indexes/object stores do Dexie. Alterações futuras em schema/indexes deverão criar uma nova versão Dexie e migration explícita.

## PWA

A instalação utiliza `manifest.webmanifest`. Nesta versão não há service worker de cache para evitar persistência controlada fora do IndexedDB.

## Android

Capacitor usa a mesma build web em `dist/`. O diretório nativo pode ser gerado com `npm run android:add`.
