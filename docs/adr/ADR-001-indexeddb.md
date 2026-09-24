# ADR-001 — IndexedDB como persistência principal

**Status:** Aceito  
**Data:** 2026-09-24

## Contexto

O aplicativo precisa armazenar arquivos, regras, configurações, histórico e estruturas tabulares localmente sem utilizar `localStorage`.

## Decisão

Utilizar IndexedDB, encapsulado por Dexie e por repositories internos.

## Consequências

- Suporte a Blob e dados estruturados.
- Operações assíncronas.
- Necessidade de migrations versionadas.
- UI permanece desacoplada da tecnologia de persistência.
