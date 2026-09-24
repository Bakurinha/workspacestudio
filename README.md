# Workspace Studio

**Versão atual:** `0.4.0`

Workspace documental local-first para importar, visualizar, editar e exportar planilhas e documentos sem alterar o arquivo original. O projeto foi iniciado para estudo e uso próprio, com arquitetura preparada para evolução comercial futura.

## O que já funciona

- Biblioteca de arquivos persistida em **IndexedDB**.
- Arquivo original armazenado como `Blob` e tratado como imutável.
- Modo **Leitura** por padrão.
- Importação e edição de `XLSX`, `XLSM` e `CSV`.
- Exportação de uma nova cópia da planilha editada.
- Múltiplas abas, edição de células, adição de registros/colunas e histórico com desfazer/refazer.
- Motor de regras para colunas com tokens como `{SEQ:4}`, `{ROW}` e `{COLUMN:Marca}`.
- Regras limitadas a **faixas de linhas**, evitando aplicar uma transformação à coluna inteira sem necessidade.
- Seleção da faixa diretamente na matriz: clique em uma célula e use **Shift+clique** em outra da mesma coluna; o painel de regras recebe automaticamente coluna, linha inicial e linha final.
- Clique no cabeçalho de uma coluna para selecionar todos os registros daquela coluna.
- Sequências começam na primeira linha da faixa selecionada, sem depender da posição absoluta no topo da planilha.
- Presets de prefixo, sufixo, maiúsculas, minúsculas, trim e localizar/substituir.
- Biblioteca de regras persistida no IndexedDB.
- **Edição básica de PDF** com texto, marca-texto, cobertura branca, desenho livre, imagens, rotação e exclusão de páginas.
- Seleção precisa por arraste para **Destacar** e **Cobrir**.
- Desenho livre com amostragem de pontos e atualização visual limitada por frame para evitar travamento.
- Histórico próprio de edição PDF com desfazer/refazer e limpeza das alterações.
- Exportação do PDF editado para uma nova cópia usando `pdf-lib`.
- **OCR local por página** com Português, Inglês e Português + Inglês usando Tesseract.js.
- Ação **Executar OCR** visível abaixo de cada página, sem depender de hover.
- Worker/core/modelo do Tesseract configurados explicitamente para hospedagem estática e mensagens de erro mais claras.
- Resultado OCR persistido junto ao documento no IndexedDB, com confiança estimada.
- Texto OCR exibido em **textarea editável**, com copiar e salvar correção.
- Correções humanas do OCR persistidas no IndexedDB sem alterar o `originalBlob`.
- Layout PDF responsivo com largura estável, sem depender de `min-content`/`fit-content` durante o carregamento assíncrono do canvas.
- Visualização de PDF com PDF.js.
- Visualização de DOCX com `docx-preview`.
- Visualização de TXT, JSON, Markdown e XML como texto.
- Detecção básica de fontes declaradas em PDF e DOCX.
- Temas Sistema, Claro, Escuro e Personalizado RGB.
- Layout responsivo para desktop, tablet e celular.
- Manifest de PWA e configuração Capacitor para Android.
- CI e deploy do GitHub Pages via GitHub Actions.

## Filosofia de dados

```text
Arquivo original (Blob imutável)
        ↓
Parser / visualizador
        ↓
Modelo interno + operações de edição + OCR
        ↓
Histórico / regras
        ↓
Nova cópia exportada
```

A aplicação **não usa `localStorage` ou `sessionStorage`**. Os dados persistentes controlados pela aplicação ficam no IndexedDB através de uma camada de repositórios.

> A versão atual não cria service worker de cache offline. Isso é intencional para manter a persistência da aplicação controlada pelo IndexedDB nesta fase.

## Planilhas e regras por faixa

Abra uma planilha e clique em **Editar**.

Para aplicar uma regra somente em parte da coluna:

1. Clique na primeira célula da faixa.
2. Segure **Shift** e clique na última célula da mesma coluna.
3. A faixa selecionada fica destacada na matriz.
4. Abra **Regras**.
5. O painel já recebe a coluna, a linha inicial e a linha final.
6. Confira a prévia e aplique.

Também é possível alterar manualmente **Linha inicial** e **Linha final** no painel.

Exemplo: para alterar somente as linhas 4 a 20 da coluna `Serial`, selecione essa faixa ou informe `4` e `20`. O cabeçalho não faz parte das linhas transformáveis.

Para um modelo como:

```text
ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA
```

a sequência `{SEQ:4}` começa em `0001` na primeira linha da faixa escolhida, mesmo que ela esteja no meio da planilha.

## Editor PDF

Abra um PDF e clique em **Editar**. A barra oferece:

- **Texto**: insere texto na posição clicada.
- **Destacar**: clique, arraste e solte para marcar uma área.
- **Cobrir**: cria uma área branca opaca do tamanho selecionado.
- **Desenhar**: traço livre com cor e espessura configuráveis.
- **Imagem**: adiciona PNG ou JPEG.
- **Rotação**: gira uma página em passos de 90° na exportação.
- **Excluir página**: remove uma página, mantendo pelo menos uma.
- **Desfazer/Refazer** e **Limpar edições**.

As operações ficam separadas do `originalBlob`. O botão **Exportar** gera `nome-editado.pdf`.

### Limite importante do editor PDF

A v0.4.0 ainda **não reescreve semanticamente o texto já existente no content stream do PDF**. Para corrigir visualmente um trecho existente, use **Cobrir** e depois **Texto**.

## OCR de PDF

O OCR funciona também em **Modo Leitura**.

1. Abra o PDF.
2. Escolha Português, Inglês ou Português + Inglês.
3. Clique em **Executar OCR nesta página** abaixo da página desejada.
4. Aguarde o progresso.
5. O texto reconhecido aparece em um campo editável.
6. Corrija o texto, se necessário, e clique em **Salvar correção**.

Fluxo:

```text
PDF original
   ↓
PDF.js
   ↓
Canvas em alta resolução
   ↓
Tesseract.js / Web Worker
   ↓
Texto OCR editável
   ↓
IndexedDB
```

O PDF não é enviado pelo código da aplicação para um serviço de OCR. No primeiro uso, os arquivos técnicos da engine e os modelos de idioma podem ser baixados. A v0.4.0 explicita os caminhos do worker/core/modelos para reduzir problemas em bundlers e hospedagens estáticas.

**Editar o texto OCR corrige a camada textual reconhecida; isso ainda não altera visualmente a página.** Para mudar o visual do PDF, use as ferramentas do editor. Uma futura etapa poderá usar coordenadas por palavra para criar seleção e camada pesquisável diretamente sobre a página.

## Instalação para desenvolvimento

```bash
npm install
npm run dev
```

Build e testes:

```bash
npm test
npm run build
npm run preview
```

O build de produção fica em `dist/`.

## GitHub Pages

`.github/workflows/deploy-pages.yml` executa:

```text
push em main
   ↓
testes
   ↓
Vite build
   ↓
dist/
   ↓
GitHub Pages
```

O repositório também possui `.github/workflows/ci.yml` para validar testes e build.

## Android / APK

```bash
npm run android:add
npm run android:sync
npm run android:open
```

## Estrutura

```text
src/
├── app/                 Interface principal
├── components/          Componentes reutilizáveis
├── database/            IndexedDB e repositories
├── hooks/               Hooks de aplicação
├── modules/
│   ├── rules/           Motor de regras
│   ├── spreadsheet/     Planilhas e seleção de faixa
│   └── viewers/         PDF, DOCX e texto
├── services/            Casos de uso, histórico, edição PDF e OCR
├── styles/              Design tokens e CSS
├── types/               Tipos do domínio
└── utils/               Funções utilitárias
```

Consulte também `ARCHITECTURE.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/DEVELOPMENT_RULES.md`, `docs/adr/` e `docs/releases/`.

## Formatos

| Formato | Importar | Visualizar | Editar | OCR | Exportar |
|---|---:|---:|---:|---:|---:|
| XLSX | Sim | Sim | Sim | — | Sim |
| XLSM | Sim | Sim | Sim* | — | XLSX |
| CSV | Sim | Sim | Sim | — | Sim |
| PDF | Sim | Sim | **Sim (básico)** | **Sim + texto editável** | **PDF editado** |
| DOCX | Sim | Sim | Ainda não | Ainda não | Original |
| TXT/MD/JSON/XML | Sim | Sim | Ainda não | — | Original |

\* Macros VBA não são executadas nem preservadas como funcionalidade editável.

## Limitações conhecidas

- O editor de planilhas ainda não replica todos os recursos do Microsoft Excel.
- A fidelidade de recursos avançados de XLSX depende do suporte do ExcelJS.
- DOCX pode divergir do Word em layouts complexos.
- O editor PDF trabalha por operações/camadas e ainda não edita semanticamente texto existente.
- Imagens adicionadas ao PDF ainda não possuem arraste/redimensionamento interativo.
- O OCR trabalha por página e ainda não cria uma camada textual pesquisável dentro do PDF exportado.
- O primeiro OCR pode exigir conexão para carregar engine/dados de idioma do Tesseract.js.
- `.xls` binário antigo e `.ods` ainda não fazem parte do parser inicial.

## Privacidade

O fluxo principal é local. Arquivos importados não são enviados para servidor pelo código desta versão. No OCR, apenas os arquivos técnicos da engine/modelo podem ser baixados; a imagem da página é processada no navegador por Web Worker.

Qualquer futura integração que envie conteúdo para serviços externos deverá informar claramente os dados enviados e exigir ação/consentimento adequado.

## Versionamento

O projeto utiliza Semantic Versioning (`MAJOR.MINOR.PATCH`). Toda atualização deve ser documentada no `CHANGELOG.md` e refletida no README quando alterar capacidades ou uso.

## Licença

Nenhuma licença pública de redistribuição foi escolhida nesta fase. Consulte `LICENSE`.
