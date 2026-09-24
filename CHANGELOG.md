# Changelog

Todas as alterações relevantes deste projeto serão documentadas aqui.

O formato segue a ideia de Keep a Changelog e o versionamento segue Semantic Versioning.

## [0.4.1] - 2026-09-24

### Adicionado
- OCR passa a solicitar explicitamente `blocks` ao Tesseract.js para obter palavras e bounding boxes.
- Novo tipo `PdfOcrWord` com texto, confiança, linha e coordenadas normalizadas.
- Modo **Editar texto na página** após executar OCR.
- Camada interativa sobre o PDF com caixas discretas para cada palavra reconhecida.
- Editor de palavra selecionada com ação **Aplicar no PDF**.
- Nova operação PDF `ocr-replace`, que cobre a área da palavra original e desenha a correção visual dentro da mesma caixa.
- Ajuste automático do tamanho do texto corrigido para caber na largura reconhecida.
- Teste unitário para normalização das bounding boxes OCR.

### Alterado
- O painel de OCR textual passa a se chamar **Texto OCR**, deixando explícito que ele edita a transcrição e não o desenho da página.
- Correções diretas de palavras atualizam também a representação textual OCR armazenada no IndexedDB.
- Resultados OCR antigos, sem coordenadas por palavra, solicitam nova execução do OCR para habilitar edição direta.
- Versão do projeto atualizada para `0.4.1`.

### Corrigido
- Removida a ambiguidade em que “OCR editável” parecia significar alteração visual do PDF, quando anteriormente apenas a transcrição podia ser editada.
- A edição OCR agora possui um caminho visual concreto dentro da própria página, sem exigir selecionar manualmente a área com Cobrir + Texto.

### Limitações
- A substituição continua sendo uma camada visual; o content stream original não é reescrito semanticamente.
- A fonte de substituição na exportação é Helvetica nesta versão.
- Bounding boxes dependem da qualidade do reconhecimento e podem ser imprecisas em documentos inclinados, borrados ou complexos.

## [0.4.0] - 2026-09-24

### Adicionado
- Seleção vertical de faixa diretamente na matriz da planilha.
- Clique em uma célula define o início; `Shift+clique` em outra célula da mesma coluna define o fim da faixa.
- Clique no cabeçalho seleciona todos os registros daquela coluna.
- Destaque visual da faixa selecionada e resumo com coluna/linhas escolhidas.
- Campos **Linha inicial** e **Linha final** no painel de regras.
- O painel de regras recebe automaticamente a coluna e a faixa selecionadas na matriz.
- Texto reconhecido pelo OCR agora é exibido em `textarea` editável.
- Botão **Salvar correção** para persistir ajustes humanos sobre o texto OCR no IndexedDB.
- Campo `editedAt` nos resultados OCR para identificar correções manuais.
- Botão **Executar OCR nesta página** visível abaixo de cada página, sem depender de hover.

### Alterado
- O motor de regras passa a aplicar transformações somente entre `startRow` e `endRow` quando informados.
- Sequências `{SEQ:n}` reiniciam a partir de `sequenceStart` na primeira linha da faixa, em vez de usar o índice absoluto da planilha.
- A prévia de regras passa a indicar a linha afetada.
- Worker, core e dados de idioma do Tesseract.js passam a usar caminhos explícitos, reduzindo problemas de resolução de assets em bundlers/hospedagem estática.
- OCR passa a informar etapas de carregamento/renderização e erros mais úteis.
- Preservação de espaços entre palavras habilitada no Tesseract.
- Versão do projeto atualizada para `0.4.0`.

### Corrigido
- Regras de coluna deixaram de obrigatoriamente começar no primeiro registro da planilha.
- Evitado que uma regra pensada para parte de uma coluna altere registros acima ou abaixo da faixa desejada.
- A ação de OCR deixou de ficar escondida somente nos controles flutuantes da página.

### Testes
- Adicionados testes para aplicação de regras em faixa parcial.
- Validado que a sequência começa novamente na primeira linha selecionada.
- Validado que faixas acima do limite são restringidas ao número real de registros.

### Observações
- O cabeçalho da planilha é mantido fora das transformações porque o modelo interno separa `headers` de `rows`.
- Editar o texto OCR corrige a camada textual reconhecida e não altera visualmente o conteúdo já desenhado na página PDF.

## [0.3.2] - 2026-09-24

### Corrigido
- Corrigido o colapso visual das páginas PDF que reduzia o canvas a poucos pixels e deixava praticamente apenas os selos “Página N” visíveis.
- Removido `width: min-content` do bloco de página e `width: fit-content` do frame, pois o PDF.js define o tamanho do canvas de forma assíncrona e o navegador podia calcular uma largura mínima incorreta antes do primeiro render.
- O visualizador PDF passou a usar coluna flexível com largura máxima responsiva e canvas ocupando 100% do frame.
- O editor PDF deixou de depender de um grid com linhas rígidas e agora usa layout flexível, evitando espaço vazio ou dimensionamento inconsistente quando a barra de edição não está presente no modo Leitura.

### Alterado
- Páginas PDF usam largura máxima de 940 px no desktop, 840 px em telas intermediárias e 100% no mobile.
- Adicionado comentário técnico no CSS explicando a causa do bug para evitar reintrodução futura de `min-content` no dimensionamento das páginas.
- Versão do projeto atualizada para `0.3.2`.

### Documentação
- README atualizado com o novo comportamento responsivo do visualizador PDF.
- Adicionada nota de release `docs/releases/0.3.2.md`.

## [0.3.1] - 2026-09-24

### Corrigido
- OCR não substitui mais o `DocumentRecord` aberto por uma cópia relida do IndexedDB após o reconhecimento.
- Persistência de OCR passa a atualizar somente `pdfOcr` e `updatedAt`, preservando a mesma referência de `originalBlob` usada pelo PDF.js.
- Evitada a destruição/recriação desnecessária do visualizador PDF após cada OCR, que podia deixar o canvas instável ou invisível.
- Controles flutuantes das páginas deixaram de ficar permanentemente visíveis em desktop, reduzindo o efeito de “chuva de ícones” em PDFs com várias páginas.

### Alterado
- Em desktop, as ações de página aparecem ao passar o cursor ou ao focar um controle.
- Em dispositivos sem hover, os controles continuam visíveis para manter acessibilidade por toque.
- Texto de orientação do OCR atualizado para explicar onde encontrar a ação por página.
- Versão do projeto atualizada para `0.3.1`.

### Documentação
- README atualizado com o comportamento de estabilidade do OCR e a nova apresentação dos controles.
- Adicionada nota de release `docs/releases/0.3.1.md`.

## [0.3.0] - 2026-09-24

### Adicionado
- OCR local por página em PDFs usando Tesseract.js 7.
- Seleção de idioma para OCR: Português, Inglês e Português + Inglês.
- Renderização em canvas de maior resolução antes do OCR para melhorar reconhecimento.
- Progresso visual do OCR por página.
- Persistência do texto OCR, idioma, confiança estimada e data no IndexedDB junto ao documento.
- Painel de resultado OCR com texto copiável.
- Teste unitário para o mapeamento de idiomas do OCR.

### Corrigido
- Ferramenta **Desenhar** deixou de criar atualização React a cada movimento do ponteiro, reduzindo drasticamente risco de travamento em traços longos.
- Pontos de desenho agora são amostrados e compactados quando necessário para limitar crescimento excessivo da operação.
- Renderização do rascunho de desenho passa a ser limitada por `requestAnimationFrame`.
- Ferramentas **Cobrir** e **Destacar** deixaram de criar retângulos de tamanho fixo e agora usam seleção exata por clique + arraste + soltura.
- Adicionada prévia visual da área de Cobrir/Destacar durante o arraste.
- Interações por ponteiro passaram a tratar cancelamento e captura de ponteiro de forma explícita.

### Alterado
- OCR fica disponível também no modo Leitura, sem exigir habilitar a edição do documento.
- README passa a documentar o fluxo PDF.js → canvas → Tesseract.js → IndexedDB.
- Versão do projeto atualizada para `0.3.0`.

### Privacidade
- O PDF não é enviado pelo código da aplicação para serviço de OCR.
- Tesseract.js processa o canvas no navegador por Web Worker.
- Engine e modelos de idioma podem ser baixados pela biblioteca no primeiro uso; isso é informado explicitamente na interface e documentação.

### Limitações conhecidas
- OCR é executado por página e ainda não cria uma camada textual pesquisável dentro do PDF exportado.
- Qualidade do OCR depende da resolução, orientação, contraste e qualidade da digitalização.
- Edição semântica do texto original do PDF continua fora do escopo desta versão.

## [0.2.0] - 2026-09-24

### Adicionado
- Editor básico de PDF integrado ao modo de edição.
- Inserção de texto com tamanho e cor configuráveis.
- Destaque/marca-texto por retângulo semitransparente.
- Ferramenta **Cobrir** para correção visual de conteúdo existente antes de inserir novo texto.
- Desenho livre com cor e espessura configuráveis.
- Inserção de imagens PNG/JPEG.
- Rotação de páginas em passos de 90°.
- Exclusão de páginas com proteção para impedir PDF sem páginas.
- Histórico próprio de PDF com desfazer/refazer e limpeza das alterações.
- Persistência das operações de PDF no IndexedDB sem alterar o Blob original.
- Exportador de PDF editado baseado em `pdf-lib`.
- Teste unitário para validar geração de PDF editado sem alteração do original.
- Estilos responsivos dedicados ao editor PDF.

### Alterado
- Botão Exportar agora gera `nome-editado.pdf` quando o documento ativo é PDF.
- `DocumentRecord` ganhou suporte a operações e cursor de edição PDF.
- Repository de documentos ganhou persistência específica para operações PDF.
- Interface passa a exibir ferramentas PDF apenas quando o usuário sai do modo Leitura.
- Versão do projeto atualizada para `0.2.0`.

### Decisões
- Edições PDF são armazenadas como operações separadas e reaplicadas sobre o original no momento da exportação.
- O arquivo original continua imutável.
- Componentes React continuam sem acesso direto ao IndexedDB; persistência passa por service/repository.
- Edição semântica do texto original do PDF não é simulada: a v0.2.0 usa cobertura visual + novo texto quando necessário.

### Limitações conhecidas
- Texto já existente no content stream do PDF ainda não pode ser reescrito semanticamente.
- Rotação é aplicada na exportação; recomenda-se anotar antes de rotacionar nesta versão.
- Imagens possuem posição e tamanho iniciais predefinidos; arrastar/redimensionar ainda não foi implementado.
- Assinatura criptográfica, OCR, formulários avançados e edição estrutural do conteúdo ficam para etapas futuras.

## [0.1.2] - 2026-09-24

### Corrigido
- Restaurados na branch `main` os workflows `.github/workflows/deploy-pages.yml` e `.github/workflows/ci.yml`, que estavam documentados na v0.1.1 mas não haviam sido enviados ao repositório.
- Restaurado o `.gitignore` previsto pela estrutura do projeto.
- O GitHub Pages passa a receber somente o build `dist/` gerado pelo Vite, evitando servir arquivos `.tsx` diretamente.
- O workflow de Pages executa testes e build antes do deploy e tenta configurar/habilitar Pages automaticamente quando permitido.

### Alterado
- CI configurada para validar testes e build em pushes para `main` e pull requests.
- Versão do projeto alinhada para `0.1.2` no código e documentação.

### Documentação
- Adicionada a etapa `docs/releases/0.1.2.md` com causa, correção, validação e impacto.
- README atualizado para reflet que a restauração efetiva dos workflows ocorreu na v0.1.2.

### Observação
- Como ainda não existe `package-lock.json`, os workflows usam `npm install`. A migração para `npm ci` fica prevista após geração e validação do lockfile.

## [0.1.1] - 2026-09-24

### Corrigido
- Corrigida a configuração de caminhos do Vite para publicação em subdiretórios como GitHub Pages.
- Adicionado workflow dedicado de deploy para GitHub Pages, publicando o build `dist/` em vez do código-fonte TSX.
- Manifest e ícone passam a usar caminhos relativos compatíveis com GitHub Pages.
- Adicionada mensagem de inicialização/falha no HTML para evitar uma página completamente branca quando o JavaScript não é carregado corretamente.

### Documentação
- README agora diferencia claramente execução por Vite, build de produção e publicação no GitHub Pages.

## [0.1.0] - 2026-09-24

### Adicionado
- Estrutura inicial React + TypeScript + Vite.
- Persistência com IndexedDB/Dexie.
- Biblioteca local de documentos.
- Preservação do arquivo original como Blob imutável.
- Hash SHA-256 local para identificação do arquivo.
- Importação de XLSX, XLSM e CSV.
- Modelo interno de planilha com múltiplas abas.
- Edição de células com confirmação ao sair da célula/pressionar Enter, evitando histórico por tecla.
- Adição de linhas e colunas com histórico.
- Exportação de planilhas para nova cópia.
- Histórico persistente de alterações com undo/redo.
- Motor de regras para colunas.
- Template com tokens `{SEQ:n}`, `{ROW}` e `{COLUMN:Nome}`.
- Presets de prefixo, sufixo, caixa alta, caixa baixa, trim e substituição.
- Biblioteca de regras persistida no IndexedDB.
- Visualizador de PDF com PDF.js.
- Visualizador de DOCX com docx-preview.
- Visualizador de arquivos textuais.
- Detecção básica de fontes em PDF e DOCX.
- Temas claro, escuro, sistema e RGB personalizado.
- Layout responsivo.
- Diálogos internos consistentes para adicionar colunas e confirmar exclusões.
- CSV de exemplo para validar o gerador de serial.
- Workflow de CI para testes e build no GitHub Actions.
- Web App Manifest para instalação PWA.
- Configuração inicial Capacitor para Android.
- Teste unitário inicial do motor de regras.
- Documentação de arquitetura, regras, segurança, contribuição e roadmap.

### Decisões
- Nenhum uso de `localStorage` ou `sessionStorage`.
- Nenhum service worker de cache nesta versão para manter a persistência controlada da aplicação exclusivamente no IndexedDB.
- Arquivos originais não são modificados.
- Componentes React não acessam IndexedDB diretamente.

### Limitações conhecidas
- PDF e DOCX ainda estão em modo leitura.
- `.xls` e `.ods` ainda não possuem parser.
- Recursos avançados de Excel podem não ter fidelidade total na exportação.
