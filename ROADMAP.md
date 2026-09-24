# Roadmap

O roadmap é orientativo. Funcionalidades somente são consideradas entregues quando atendem às regras de conclusão do projeto.

## 0.1.x — estabilização do núcleo

- Melhorar debounce/commit de edição de células.
- Testes de importação/exportação.
- Testes do histórico estrutural.
- Detecção automática de padrões de serial.
- Validação de duplicados.
- Filtros, ordenação e busca de planilha.

## 0.2.0 — PDF básico — entregue

- Texto sobreposto.
- Marca-texto.
- Cobertura visual para correções.
- Desenho livre.
- Imagens PNG/JPEG.
- Rotação de páginas.
- Exclusão de páginas.
- Histórico com desfazer/refazer.
- Exportação de nova cópia preservando o original.

## 0.3.x — estabilização PDF + OCR — entregue

- Correção do travamento durante desenho livre.
- Amostragem/compactação de pontos de desenho.
- Seleção por arraste para Destacar e Cobrir.
- Prévia visual da seleção de retângulo.
- OCR local por página com Tesseract.js.
- Português, Inglês e Português + Inglês.
- Progresso do reconhecimento.
- Persistência do resultado OCR no IndexedDB.
- Estabilização do layout PDF e da persistência OCR.

## 0.4.0 — faixa de regras + OCR editável — entregue

- Seleção vertical de faixa diretamente na matriz da planilha.
- Clique + `Shift+clique` para definir linha inicial/final na mesma coluna.
- Seleção de toda a coluna pelo cabeçalho.
- Destaque visual da faixa escolhida.
- Linha inicial/final configuráveis manualmente no painel de regras.
- Regras aplicadas somente à faixa selecionada.
- Sequencial reiniciado na primeira linha da faixa.
- Ação de OCR visível por página.
- Texto OCR editável e correções persistidas no IndexedDB.
- Caminhos explícitos da engine/modelos do Tesseract para hospedagem estática.

Próximas evoluções do OCR/PDF: coordenadas por palavra, camada textual pesquisável, seleção/movimentação de objetos, redimensionamento, reordenação de páginas, formulários e edição semântica avançada.

## 0.5.0 — planilha avançada

- Tipos de coluna.
- Validação de dados.
- Fórmulas internas selecionadas.
- Congelamento visual.
- Seleção múltipla de áreas/colunas.
- Edição em massa por seleção multidimensional.
- Regras condicionais.
- Formulário automático baseado nas colunas.
- Visualização em cards para mobile.

## 0.6.0 — workspace e comparação

- Projetos/pastas virtuais.
- Busca universal.
- Comparação entre planilhas.
- Metadados avançados.
- Exportação/importação da biblioteca de regras.

## 0.7.0 — DOCX

- Camada editável de texto e estilos.
- Fontes, parágrafos, listas e tabelas.
- Exportação DOCX validada.
- Comparação de alterações.

## 0.8.0 — PDF avançado

- Seleção e movimentação de objetos adicionados.
- Redimensionamento de objetos.
- Reordenação de páginas.
- Formulários PDF.
- Comentários e formas.
- Criação opcional de camada textual pesquisável a partir do OCR.
- Avaliação de edição semântica do texto existente.

## 0.9.0 — formatos

- ODS.
- XLS legado através de parser isolado, se tecnicamente/licenciamento viável.
- Importação JSON estruturada.
- XML tabular.

## 0.10.0 — instalação e integração

- Pipeline Android/APK/AAB.
- Desktop com Capacitor/Electron/Tauri após avaliação.
- File handlers PWA quando suportado.

## 0.11.0 — sincronização opcional

- Abstração de API.
- Backend opcional.
- Login.
- Sincronização.
- Permissões.

Nenhuma integração remota poderá enviar documentos silenciosamente.
