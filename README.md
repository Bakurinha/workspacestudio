# Workspace Studio

**Versão atual:** `0.4.1`

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
- Seleção da faixa diretamente na matriz: clique em uma célula e use **Shift+clique** em outra da mesma coluna.
- Clique no cabeçalho de uma coluna para selecionar todos os registros daquela coluna.
- Sequências começam na primeira linha da faixa selecionada.
- Presets de prefixo, sufixo, maiúsculas, minúsculas, trim e localizar/substituir.
- Biblioteca de regras persistida no IndexedDB.
- **Edição básica de PDF** com texto, marca-texto, cobertura branca, desenho livre, imagens, rotação e exclusão de páginas.
- Seleção precisa por arraste para **Destacar** e **Cobrir**.
- Histórico próprio de edição PDF com desfazer/refazer e limpeza das alterações.
- Exportação do PDF editado para uma nova cópia usando `pdf-lib`.
- **OCR local por página** com Português, Inglês e Português + Inglês usando Tesseract.js.
- OCR solicita também `blocks`, mapeando palavras e suas coordenadas na página.
- Modo **Editar texto na página** para clicar diretamente nas palavras reconhecidas pelo OCR.
- Correção visual de uma palavra gera uma operação `ocr-replace`: cobertura branca + novo texto na mesma área.
- Correções visuais entram no histórico do PDF e são aplicadas na exportação sem alterar o original.
- Texto OCR completo continua disponível em textarea para revisão/cópia e persistência no IndexedDB.
- Layout PDF responsivo com largura estável.
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
5. O painel recebe automaticamente a coluna, a linha inicial e a linha final.
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

A v0.4.1 ainda **não reescreve semanticamente o content stream original do PDF**. A edição visual OCR cria uma camada de substituição sobre a área reconhecida. O original continua imutável.

## OCR de PDF e edição visual

O OCR pode ser executado em modo Leitura, mas a substituição visual exige **modo Editar**.

1. Abra o PDF.
2. Escolha Português, Inglês ou Português + Inglês.
3. Clique em **Executar OCR nesta página**.
4. Aguarde o reconhecimento.
5. Clique em **Editar** no documento.
6. Clique em **Editar texto na página** abaixo da página.
7. As palavras reconhecidas recebem caixas discretas.
8. Clique na palavra desejada.
9. Digite o novo valor e clique em **Aplicar no PDF**.
10. Exporte normalmente.

Fluxo:

```text
PDF original
   ↓
PDF.js → canvas ampliado
   ↓
Tesseract.js → texto + blocks/word bounding boxes
   ↓
coordenadas normalizadas 0..1
   ↓
seleção da palavra na própria página
   ↓
operação ocr-replace
   ↓
pdf-lib na exportação
```

O `ocr-replace` cobre a área da palavra original com branco e desenha o texto corrigido dentro da mesma caixa. O tamanho do texto é ajustado para caber na largura disponível. Essa operação pode ser desfeita/refeita junto das demais edições PDF.

O painel **Texto OCR** continua existindo para corrigir a transcrição completa. Editar esse textarea altera a representação textual OCR; já **Editar texto na página** é o caminho para mudança visual no PDF.

Resultados OCR salvos por versões anteriores não possuem coordenadas por palavra. Nesses casos, execute o OCR novamente na página para habilitar a edição direta.

O PDF não é enviado pelo código da aplicação para um serviço remoto de OCR. No primeiro uso, arquivos técnicos da engine e modelos de idioma podem ser baixados.

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
| PDF | Sim | Sim | **Sim (básico + OCR visual)** | **Sim + palavras mapeadas** | **PDF editado** |
| DOCX | Sim | Sim | Ainda não | Ainda não | Original |
| TXT/MD/JSON/XML | Sim | Sim | Ainda não | — | Original |

\* Macros VBA não são executadas nem preservadas como funcionalidade editável.

## Limitações conhecidas

- O editor de planilhas ainda não replica todos os recursos do Microsoft Excel.
- A fidelidade de recursos avançados de XLSX depende do suporte do ExcelJS.
- DOCX pode divergir do Word em layouts complexos.
- A substituição OCR é visual e não reescreve semanticamente o content stream original.
- A fonte usada na substituição OCR é Helvetica nesta fase; aparência pode diferir da fonte original.
- Caixas OCR podem ser imprecisas em documentos inclinados, borrados ou com layout muito complexo.
- Imagens adicionadas ao PDF ainda não possuem arraste/redimensionamento interativo.
- O OCR ainda não cria uma camada de texto invisível pesquisável dentro do PDF exportado.
- O primeiro OCR pode exigir conexão para carregar engine/dados de idioma do Tesseract.js.
- `.xls` binário antigo e `.ods` ainda não fazem parte do parser inicial.

## Privacidade

O fluxo principal é local. Arquivos importados não são enviados para servidor pelo código desta versão. No OCR, apenas os arquivos técnicos da engine/modelo podem ser baixados; a imagem da página é processada no navegador por Web Worker.

Qualquer futura integração que envie conteúdo para serviços externos deverá informar claramente os dados enviados e exigir ação/consentimento adequado.

## Versionamento

O projeto utiliza Semantic Versioning (`MAJOR.MINOR.PATCH`). Toda atualização deve ser documentada no `CHANGELOG.md` e refletida no README quando alterar capacidades ou uso.

## Licença

Nenhuma licença pública de redistribuição foi escolhida nesta fase. Consulte `LICENSE`.
