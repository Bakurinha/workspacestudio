# Workspace Studio

**Versão atual:** `0.1.1`

Workspace documental local-first para importar, visualizar, editar e exportar dados e documentos sem alterar o arquivo original. O projeto foi iniciado para estudo e uso próprio, com arquitetura preparada para evolução comercial futura.

## O que já funciona

- Biblioteca de arquivos persistida em **IndexedDB**.
- Arquivo original armazenado como `Blob` e tratado como imutável.
- Modo **Leitura** por padrão.
- Importação e edição de `XLSX`, `XLSM` e `CSV`.
- Exportação de uma nova cópia da planilha editada.
- Múltiplas abas de planilha.
- Edição de células.
- Adição de registros e colunas.
- Histórico persistente com **desfazer/refazer**.
- Motor de regras para colunas.
- Regra de serial com tokens como `{SEQ:4}`, `{ROW}` e `{COLUMN:Marca}`.
- Presets: prefixo, sufixo, maiúsculas, minúsculas, trim e localizar/substituir.
- Biblioteca de regras persistida no IndexedDB.
- Visualização de PDF com PDF.js.
- Visualização de DOCX com `docx-preview`.
- Visualização de TXT, JSON, Markdown e XML como texto.
- Detecção básica de fontes declaradas em PDF e DOCX.
- Temas Sistema, Claro, Escuro e Personalizado RGB.
- Layout responsivo para desktop, tablet e celular.
- Manifest de PWA para instalação em navegadores compatíveis.
- Configuração Capacitor pronta para empacotamento Android.

## Filosofia de dados

O arquivo importado nunca é editado diretamente:

```text
Arquivo original (Blob imutável)
        ↓
Parser
        ↓
Modelo interno editável
        ↓
Histórico / regras
        ↓
Nova cópia exportada
```

A aplicação **não usa `localStorage` ou `sessionStorage`**. Os dados persistentes controlados pela aplicação ficam no IndexedDB através de uma camada de repositórios.

> A versão atual não cria service worker de cache offline. Isso é intencional para não persistir dados da aplicação fora do IndexedDB nesta fase. O manifest continua permitindo instalação em navegadores que não exigem service worker para installability.

## Teste rápido

O diretório `examples/` contém `inventario-exemplo.csv`. Importe esse arquivo e aplique o preset **Serial sequencial** para testar o motor sem precisar preparar uma planilha.

## Exemplo de serial dinâmico

Modelo:

```text
ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA
```

Dados:

```text
Marca: DELL
Modelo: P2422H
```

Saída:

```text
ABCY-DELL-P2422H-0001-AABA
ABCY-DELL-P2422H-0002-AABA
ABCY-DELL-P2422H-0003-AABA
```

## Instalação para desenvolvimento

Requisitos:

- Node.js moderno.
- npm.

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Testes:

```bash
npm test
```


## Executando corretamente

Este projeto usa **React + TypeScript + Vite**. O `index.html` da raiz é código-fonte de desenvolvimento e **não deve ser aberto diretamente por duplo clique** (`file://`).

Para desenvolvimento local:

```bash
npm install
npm run dev
```

Para testar o mesmo conteúdo que será publicado:

```bash
npm run build
npm run preview
```

O build pronto para hospedagem fica em `dist/`.

## GitHub Pages

A partir da v0.1.1 o repositório inclui `.github/workflows/deploy-pages.yml`, que gera o build Vite e publica **somente o diretório `dist/`**. Isso evita a tela branca causada por servir arquivos `.tsx` diretamente.

No GitHub, em **Settings → Pages**, configure **Source: GitHub Actions**. Depois de um push na branch `main`, o workflow `Deploy GitHub Pages` fará a publicação.

O Vite usa `base: './'`, permitindo que os assets funcionem tanto em domínio próprio quanto em URLs de projeto como `usuario.github.io/repositorio/`.

## Android / APK

O projeto já contém `capacitor.config.ts` e dependências do Capacitor.

Na primeira preparação do projeto Android:

```bash
npm run android:add
```

Para sincronizar alterações web:

```bash
npm run android:sync
```

Para abrir o projeto Android no Android Studio:

```bash
npm run android:open
```

A assinatura e geração de APK/AAB são realizadas pelo toolchain Android/Android Studio. O diretório `android/` é gerado localmente para evitar manter artefatos nativos desnecessários antes da primeira configuração.

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
├── services/            Casos de uso e histórico
├── styles/              Design tokens e CSS
├── types/               Tipos do domínio
└── utils/               Funções utilitárias
```

Consulte também:

- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `ROADMAP.md`
- `docs/DEVELOPMENT_RULES.md`
- `docs/adr/`
- `docs/releases/0.1.0.md`

## Formatos

| Formato | Importar | Visualizar | Editar | Exportar |
|---|---:|---:|---:|---:|
| XLSX | Sim | Sim | Sim | Sim |
| XLSM | Sim | Sim | Sim* | XLSX |
| CSV | Sim | Sim | Sim | Sim |
| PDF | Sim | Sim | Ainda não | Original |
| DOCX | Sim | Sim | Ainda não | Original |
| TXT/MD/JSON/XML | Sim | Sim | Ainda não | Original |

\* Macros VBA não são executadas nem preservadas como funcionalidade editável. A cópia exportada deve ser validada quando o arquivo original usar recursos avançados do Excel.

## Limitações conhecidas

- O editor de planilhas ainda não replica todos os recursos do Microsoft Excel.
- A fidelidade de recursos avançados de XLSX depende do suporte do ExcelJS.
- DOCX é visualizado via HTML e pode divergir do Word em layouts complexos.
- PDF está em modo leitura nesta versão.
- `.xls` binário antigo e `.ods` ainda não fazem parte do parser inicial.
- A detecção de fontes em PDF é indicativa e inspeciona até 10 páginas durante a importação para reduzir custo de processamento.

## Privacidade

O fluxo principal é local. Arquivos importados não são enviados para servidor pelo código desta versão.

Qualquer futura integração online deverá:

1. ser claramente identificada;
2. explicar quais dados sairão do dispositivo;
3. pedir ação/consentimento adequado;
4. ser documentada no CHANGELOG e README.

## Versionamento

O projeto utiliza Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

Toda atualização deve ser documentada no `CHANGELOG.md` e refletida no README quando alterar capacidades ou uso.

## Licença

Nenhuma licença pública de redistribuição foi escolhida nesta fase. Consulte `LICENSE`.
