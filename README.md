# Workspace Studio

**Versão atual:** `0.2.0`

Workspace documental local-first para importar, visualizar, editar e exportar dados e documentos sem alterar o arquivo original. O projeto foi iniciado para estudo e uso próprio, com arquitetura preparada para evolução comercial futura.

## O que já funciona

- Biblioteca de arquivos persistida em **IndexedDB**.
- Arquivo original armazenado como `Blob` e tratado como imutável.
- Modo **Leitura** por padrão.
- Importação e edição de `XLSX`, `XLSM` e `CSV`.
- Exportação de uma nova cópia da planilha editada.
- Múltiplas abas, edição de células, adição de registros/colunas e histórico com desfazer/refazer.
- Motor de regras para colunas com tokens como `{SEQ:4}`, `{ROW}` e `{COLUMN:Marca}`.
- Presets de prefixo, sufixo, maiúsculas, minúsculas, trim e localizar/substituir.
- Biblioteca de regras persistida no IndexedDB.
- **Edição básica de PDF** com texto, marca-texto, cobertura branca, desenho livre, imagens, rotação e exclusão de páginas.
- Histórico próprio de edição PDF com desfazer/refazer e limpeza das alterações.
- Exportação do PDF editado para uma nova cópia usando `pdf-lib`.
- Visualização de PDF com PDF.js.
- Visualização de DOCX com `docx-preview`.
- Visualização de TXT, JSON, Markdown e XML como texto.
- Detecção básica de fontes declaradas em PDF e DOCX.
- Temas Sistema, Claro, Escuro e Personalizado RGB.
- Layout responsivo para desktop, tablet e celular.
- Manifest de PWA para instalação em navegadores compatíveis.
- Configuração Capacitor pronta para empacotamento Android.
- CI e deploy do GitHub Pages via GitHub Actions.

## Filosofia de dados

O arquivo importado nunca é editado diretamente:

```text
Arquivo original (Blob imutável)
        ↓
Parser / visualizador
        ↓
Modelo interno + operações de edição
        ↓
Histórico / regras
        ↓
Nova cópia exportada
```

A aplicação **não usa `localStorage` ou `sessionStorage`**. Os dados persistentes controlados pela aplicação ficam no IndexedDB através de uma camada de repositórios.

> A versão atual não cria service worker de cache offline. Isso é intencional para não persistir dados da aplicação fora do IndexedDB nesta fase.

## Editor PDF

Abra um PDF e clique em **Editar**. A barra do editor oferece:

- **Texto:** insere texto na posição clicada, com tamanho e cor configuráveis.
- **Destacar:** cria uma faixa amarela semitransparente.
- **Cobrir:** cria uma área branca opaca, útil para correções visuais antes de inserir um novo texto.
- **Desenhar:** adiciona traço livre com cor e espessura configuráveis.
- **Imagem:** adiciona PNG ou JPEG à página.
- **Rotação:** gira uma página em passos de 90° na exportação.
- **Excluir página:** remove uma página, mantendo obrigatoriamente pelo menos uma.
- **Desfazer/Refazer:** controla o cursor das operações persistidas.
- **Limpar edições:** volta ao estado original sem apagar o arquivo fonte.

As operações são salvas no IndexedDB separadamente do `originalBlob`. O botão **Exportar** gera `nome-editado.pdf` aplicando somente as operações ativas.

### Limite importante do editor PDF

A v0.2.0 ainda **não reescreve semanticamente o texto já existente dentro do content stream do PDF**. Para corrigir visualmente um trecho existente, use **Cobrir** e depois **Texto**. Edição semântica de texto existente, formulários avançados, OCR e reposicionamento/redimensionamento interativo de objetos ficam para versões posteriores.

## Teste rápido de planilhas

O diretório `examples/` contém `inventario-exemplo.csv`. Importe esse arquivo e aplique o preset **Serial sequencial** para testar o motor sem precisar preparar uma planilha.

## Exemplo de serial dinâmico

```text
ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA
```

Com `Marca: DELL` e `Modelo: P2422H`:

```text
ABCY-DELL-P2422H-0001-AABA
ABCY-DELL-P2422H-0002-AABA
ABCY-DELL-P2422H-0003-AABA
```

## Instalação para desenvolvimento

Requisitos: Node.js moderno e npm.

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

O build pronto para hospedagem fica em `dist/`.

## GitHub Pages

A configuração efetiva de deploy está em `.github/workflows/deploy-pages.yml`.

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

O Pages publica **somente o diretório `dist/`**. O Vite usa `base: './'`, permitindo funcionamento em URLs de projeto como `usuario.github.io/repositorio/`.

O repositório também possui `.github/workflows/ci.yml`, que executa testes e build em pushes para `main` e pull requests.

> Ainda não existe `package-lock.json`; os workflows usam `npm install`. Após gerar e validar o lockfile, a instalação deverá migrar para `npm ci`.

## Android / APK

```bash
npm run android:add
npm run android:sync
npm run android:open
```

A assinatura e geração de APK/AAB são realizadas pelo toolchain Android/Android Studio.

## Estrutura

```text
src/
├── app/                 Interface principal
├── components/          Componentes reutilizáveis
├── database/            IndexedDB e repositories
├── hooks/               Hooks de aplicação
├── modules/
│   ├── rules/           Motor de regras
│   ├── spreadsheet/     Planilhas
│   └── viewers/         PDF, DOCX e texto
├── services/            Casos de uso, histórico e edição PDF
├── styles/              Design tokens e CSS
├── types/               Tipos do domínio
└── utils/               Funções utilitárias
```

Consulte também `ARCHITECTURE.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/DEVELOPMENT_RULES.md`, `docs/adr/` e `docs/releases/`.

## Formatos

| Formato | Importar | Visualizar | Editar | Exportar |
|---|---:|---:|---:|---:|
| XLSX | Sim | Sim | Sim | Sim |
| XLSM | Sim | Sim | Sim* | XLSX |
| CSV | Sim | Sim | Sim | Sim |
| PDF | Sim | Sim | **Sim (básico)** | **PDF editado** |
| DOCX | Sim | Sim | Ainda não | Original |
| TXT/MD/JSON/XML | Sim | Sim | Ainda não | Original |

\* Macros VBA não são executadas nem preservadas como funcionalidade editável.

## Limitações conhecidas

- O editor de planilhas ainda não replica todos os recursos do Microsoft Excel.
- A fidelidade de recursos avançados de XLSX depende do suporte do ExcelJS.
- DOCX é visualizado via HTML e pode divergir do Word em layouts complexos.
- O editor PDF trabalha por operações/camadas e ainda não edita semanticamente texto existente.
- Rotação é aplicada no PDF exportado; anotações devem preferencialmente ser feitas antes da rotação da página nesta versão.
- Imagens adicionadas recebem tamanho/posição inicial predefinidos; redimensionamento e arraste interativos ainda serão adicionados.
- `.xls` binário antigo e `.ods` ainda não fazem parte do parser inicial.
- A detecção de fontes em PDF é indicativa e inspeciona até 10 páginas durante a importação.

## Privacidade

O fluxo principal é local. Arquivos importados não são enviados para servidor pelo código desta versão. Qualquer futura integração online deverá informar claramente os dados enviados e exigir ação/consentimento adequado.

## Versionamento

O projeto utiliza Semantic Versioning (`MAJOR.MINOR.PATCH`). Toda atualização deve ser documentada no `CHANGELOG.md` e refletida no README quando alterar capacidades ou uso.

## Licença

Nenhuma licença pública de redistribuição foi escolhida nesta fase. Consulte `LICENSE`.
