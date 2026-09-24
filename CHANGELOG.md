# Changelog

Todas as alterações relevantes deste projeto serão documentadas aqui.

O formato segue a ideia de Keep a Changelog e o versionamento segue Semantic Versioning.

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
