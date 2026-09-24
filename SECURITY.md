# Segurança e privacidade

## Princípios

- Local-first.
- Arquivo original imutável.
- Nenhum upload remoto silencioso.
- Nenhum dado persistente da aplicação em `localStorage` ou `sessionStorage`.
- Operações destrutivas exigem ação explícita.
- Mudanças em massa devem ter preview antes de expansão futura do motor.

## Arquivos não confiáveis

Arquivos importados devem ser tratados como entrada não confiável.

- Não executar macros.
- Não executar scripts presentes em documentos.
- Não injetar conteúdo de documentos diretamente como HTML sem sanitização/renderer especializado.
- Limitar análise pesada para evitar travamentos.

## Dependências

Antes de atualizar dependências:

- verificar licença;
- verificar mudanças incompatíveis;
- testar build/importação/exportação;
- registrar no CHANGELOG quando relevante.
