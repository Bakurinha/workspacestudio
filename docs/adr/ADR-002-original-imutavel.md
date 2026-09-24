# ADR-002 — Arquivo original imutável

**Status:** Aceito  
**Data:** 2026-09-24

## Contexto

O projeto precisa permitir edição segura e preservar a originalidade de documentos importados.

## Decisão

O Blob original é armazenado sem alteração. Edições são aplicadas a um modelo interno e exportadas como nova cópia.

## Consequências

- Reduz risco de perda de dados.
- Facilita comparação, undo/redo e auditoria.
- Exportadores precisam reconstruir ou sincronizar cópias.
