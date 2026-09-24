# Changelog

Todas as alterações relevantes deste projeto serão documentadas aqui.

O formato segue a ideia de Keep a Changelog e o versionamento segue Semantic Versioning.

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
- Histórico próprio de PDF com desfazer, refazer e limpeza das operações.
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
- README atualizado para refletir que a restauração efetiva dos workflows ocorreu na v0.1.2.

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
