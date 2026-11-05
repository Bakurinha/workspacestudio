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


## Relato responsável de segurança

Não publique credenciais, dados pessoais, provas de exploração ou detalhes sensíveis em Issues ou PRs públicos.
Se a aba Security oferecer "Report a vulnerability", use esse canal privado. Caso a opção não esteja disponível,
combine primeiro um canal privado com o mantenedor @Bakurinha. Não inclua o achado em comentários públicos.

Informe de forma privada a versão/commit, impacto, reprodução mínima sem dados reais e uma sugestão de correção.
Não teste contra serviços em produção, contas de terceiros ou dados de outras pessoas sem autorização.

Mudanças de segurança passam por branch separada, testes e revisão. Credenciais, acessos, proteção de branches
e merges dependem de autorização do proprietário. Não há prazo de resposta ou suporte de versões antigas garantido.
