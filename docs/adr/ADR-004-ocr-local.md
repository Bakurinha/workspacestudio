# ADR-004 — OCR local no navegador

**Status:** Aceito  
**Data:** 2026-09-24  
**Versão relacionada:** 0.3.0

## Contexto

O Workspace Studio precisa reconhecer texto em PDFs digitalizados e documentos sem camada textual, mantendo a regra de privacidade local-first e sem transformar o OCR em um upload silencioso para serviços externos.

O Tesseract.js não processa arquivos PDF diretamente, mas processa imagens/canvas no navegador por Web Worker.

## Decisão

Usar a seguinte arquitetura:

```text
PDF.js → renderização da página → canvas temporário → Tesseract.js → texto OCR
```

O resultado textual será persistido no IndexedDB junto ao `DocumentRecord`.

O PDF original continuará imutável.

## Privacidade

O código da aplicação não envia o PDF ou o canvas para uma API remota de OCR.

A biblioteca Tesseract.js pode baixar engine e dados de idioma necessários para inicializar o worker. Essa necessidade deve ser informada na interface e documentação.

Qualquer futura opção de OCR remoto deverá:

1. ser opcional;
2. informar explicitamente quais dados serão enviados;
3. exigir ação/consentimento do usuário;
4. ser separada visualmente do modo OCR local.

## Consequências positivas

- mantém processamento do conteúdo no dispositivo;
- funciona com PDFs digitalizados;
- permite Português/Inglês e expansão para outros idiomas;
- resultado pode alimentar busca, indexação e futura camada textual pesquisável;
- evita dependência obrigatória de backend.

## Consequências negativas

- OCR consome CPU e memória do dispositivo;
- primeiro uso pode ser mais lento devido ao carregamento da engine/modelos;
- qualidade depende fortemente da imagem de origem;
- páginas precisam ser rasterizadas antes do reconhecimento;
- OCR de documentos grandes deve ser controlado para evitar processamento excessivo simultâneo.

## Alternativas consideradas

### Serviço remoto de OCR

Rejeitado como padrão por privacidade e dependência de backend/rede.

### OCR de todas as páginas automaticamente na importação

Rejeitado nesta fase por custo de CPU, memória e tempo. O usuário inicia o OCR por página explicitamente.

### Tesseract.js recebendo o PDF diretamente

Não aplicável: a biblioteca trabalha com imagens/canvas, não com PDF como entrada direta.
