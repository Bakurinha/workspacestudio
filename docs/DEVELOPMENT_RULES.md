# Regras obrigatórias de desenvolvimento

**Versão das regras:** 0.1.0

Estas regras valem para funcionalidades, correções, refatorações, design, arquitetura e documentação.

## Versionamento e documentação

1. Usar Semantic Versioning (`MAJOR.MINOR.PATCH`).
2. Toda atualização relevante deve entrar no `CHANGELOG.md`.
3. O `README.md` deve refletir o estado real do aplicativo.
4. Mudanças arquiteturais importantes devem gerar ADR.
5. `ARCHITECTURE.md` deve permanecer coerente com o código.
6. TODOs devem indicar motivo/versão quando possível.

## Código humano e comentado

7. Toda atualização deve revisar/complementar comentários no código afetado.
8. Comentários explicam principalmente **por que** uma decisão existe, não repetem a sintaxe.
9. Comentários desatualizados devem ser corrigidos/removidos.
10. Código deve priorizar leitura humana sobre compactação.
11. Variáveis, funções, componentes e arquivos devem ter nomes descritivos.
12. Evitar funções/componentes gigantes.
13. Evitar lógica duplicada.
14. Evitar valores mágicos; usar constantes quando agregarem significado.
15. TypeScript deve permanecer estrito; `any` só com justificativa técnica explícita.

## Orientação de cada etapa

16. Cada entrega deve explicar: o que foi feito, por que, arquivos alterados, como funciona, como testar, impacto, versão e próxima etapa.
17. Funcionalidades grandes devem ser divididas em mudanças rastreáveis.

## Arquitetura

18. Manter módulos independentes sempre que possível.
19. Separar UI e regras de negócio.
20. Componentes React não acessam IndexedDB diretamente.
21. Persistência passa por repositories/services.
22. Motor de regras não deve depender do componente visual da planilha.
23. Implementações devem considerar futura API/backend sem antecipar complexidade desnecessária.

## Persistência e integridade

24. Persistência controlada pela aplicação utiliza IndexedDB.
25. Não utilizar `localStorage` ou `sessionStorage`.
26. Toda mudança de schema IndexedDB exige nova versão/migration.
27. Arquivo original importado é imutável.
28. Edição acontece no modelo interno/camada de trabalho.
29. Exportação cria um novo arquivo.
30. Documentos abrem em modo leitura por padrão.
31. Conteúdo não pode ser normalizado silenciosamente.
32. Códigos com zeros à esquerda devem ser preservados quando tratados como texto.
33. Identificadores excluídos não devem ser reutilizados automaticamente.

## Histórico e ações em massa

34. Mudanças editáveis devem entrar no histórico quando tecnicamente possível.
35. Undo/redo devem tratar operações em massa como ação única quando apropriado.
36. Operações destrutivas pedem confirmação ou precisam ser claramente reversíveis.
37. Transformações em massa devem exibir quantidade afetada e preview.
38. Detecção automática de padrões apenas sugere; nunca altera sem confirmação.

## Regras reutilizáveis

39. Regras devem poder ser nomeadas e salvas.
40. Regras futuras devem poder ser duplicadas, importadas, exportadas e desativadas.
41. Regras de coluna devem ser independentes do formato Excel sempre que possível.

## Interface

42. Interface deve ser limpa, profissional e consistente.
43. Design deve usar tokens centralizados.
44. Suportar Sistema, Claro, Escuro e Personalizado.
45. Personalização RGB usa valores de 0 a 255.
46. Toda funcionalidade deve ser revisada para celular, tablet, desktop e telas grandes.
47. Mobile pode usar apresentação diferente do desktop.
48. Priorizar contraste, foco visível, teclado, labels e alvos de toque adequados.
49. Estados vazios, loading e erros precisam ser compreensíveis.
50. Recursos incompletos devem ser identificados como Preview/Beta/Experimental ou não expostos como concluídos.

## Performance e formatos

51. Processamento pesado não deve bloquear a UI quando houver alternativa viável (Workers/chunks/virtualização).
52. Arquivos grandes devem evitar cópias desnecessárias em memória.
53. Importação/exportação crítica deve ter teste de ciclo quando possível.
54. Não prometer fidelidade documental de 100% quando a biblioteca/formato não garante.
55. Fontes devem distinguir declarada, incorporada, disponível e substituta.
56. Substituição de fonte não deve acontecer silenciosamente no modo leitura.

## Segurança e dependências

57. Dependências novas exigem avaliação de manutenção, tamanho, licença, segurança e necessidade.
58. Licenças devem ser compatíveis com possível comercialização futura.
59. Nenhum documento pode ser enviado para servidor externo sem necessidade, informação e consentimento apropriado.
60. Funcionalidades online devem ser identificadas claramente.

## Definição de concluído

Uma atualização somente está concluída quando os itens aplicáveis estão atendidos:

```text
Código implementado
+ código comentado
+ código legível
+ testes
+ responsividade
+ tratamento de erros
+ CHANGELOG
+ README quando necessário
+ revisão SemVer
+ orientação da etapa
```

## Ordem de prioridade

**Integridade dos dados → clareza → segurança → usabilidade → manutenção → desempenho → novas funcionalidades.**
