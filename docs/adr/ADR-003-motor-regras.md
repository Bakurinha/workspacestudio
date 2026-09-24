# ADR-003 — Motor de regras desacoplado da planilha visual

**Status:** Aceito  
**Data:** 2026-09-24

## Contexto

As automações por coluna devem futuramente funcionar em diferentes fontes tabulares.

## Decisão

O motor recebe estruturas do domínio e gera alterações, sem depender de React ou IndexedDB.

## Consequências

- Testes unitários simples.
- Reutilização futura em formulários/APIs.
- Interface apenas configura e apresenta regras.
