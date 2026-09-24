# Arquitetura

**Versão:** 0.1.0

## Objetivo

Separar interface, regras de negócio, persistência e formatos de arquivo para permitir que o projeto cresça para web, PWA, Android, desktop e backend sem reescrever o núcleo.

## Camadas

```text
React UI
  ↓
Services / Use Cases
  ↓
Domain / Rules / Parsers
  ↓
Repositories
  ↓
IndexedDB (Dexie)
```

### UI

Responsável por interação e apresentação. Não deve acessar IndexedDB diretamente.

### Services

Coordenam casos de uso, como importação, histórico, undo/redo e futuras sincronizações.

### Domain / Modules

Contém comportamento específico:

- planilhas;
- motor de regras;
- visualizadores;
- futuros módulos PDF/DOCX editáveis.

### Repositories

Encapsulam persistência e impedem acoplamento da UI com IndexedDB.

## Documento

```text
DocumentRecord
├── metadados
├── hash
├── Blob original
├── conteúdo interno editável (quando suportado)
├── metadados detectados
└── posição do histórico
```

## Histórico

A v0.1.0 suporta ações:

- mudanças de células;
- adicionar registro;
- adicionar coluna.

Cada ação recebe sequência crescente. Ao editar depois de um undo, o ramo de redo é descartado.

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

Stores iniciais:

```text
documents
settings
rules
history
```

Toda mudança futura de schema deve criar uma nova versão Dexie e migration explícita.

## PWA

A instalação utiliza `manifest.webmanifest`. Nesta versão não há service worker de cache para evitar persistência controlada fora do IndexedDB.

## Android

Capacitor usa a mesma build web em `dist/`. O diretório nativo pode ser gerado com `npm run android:add`.
