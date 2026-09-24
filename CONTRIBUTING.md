# Contribuindo

Antes de alterar código, leia `docs/DEVELOPMENT_RULES.md` e `ARCHITECTURE.md`.

## Fluxo mínimo

1. Definir a alteração e o impacto.
2. Implementar em módulo apropriado.
3. Comentar decisões não óbvias.
4. Adicionar/ajustar testes de comportamento crítico.
5. Executar `npm test` e `npm run build`.
6. Atualizar `CHANGELOG.md`.
7. Atualizar `README.md` se capacidades/uso mudaram.
8. Revisar versão SemVer.
9. Registrar ADR quando houver decisão arquitetural relevante.

## Estilo

- TypeScript estrito.
- Evitar `any`.
- Nomes descritivos.
- Funções pequenas.
- UI sem acesso direto ao IndexedDB.
- Sem `localStorage` ou `sessionStorage`.
- Código morto deve ser removido.
