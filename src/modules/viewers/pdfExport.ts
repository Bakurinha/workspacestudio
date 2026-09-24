import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { DocumentRecord, PdfColor, PdfEditOperation } from '../../types/document';

function toPdfColor(color: PdfColor) {
  return rgb(color.r / 255, color.g / 255, color.b / 255);
}

function clampRatio(value: number) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Gera uma nova cópia do PDF aplicando apenas as operações ativas.
 * O Blob original nunca é alterado; cada exportação parte novamente da origem.
 */
export async function exportPdfDocument(document: DocumentRecord): Promise<Blob> {
  const bytes = await document.originalBlob.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const edits = document.pdfEdits ?? [];
  const cursor = document.pdfEditCursor ?? edits.length;
  const activeEdits = edits.slice(0, cursor);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const deletedPages = new Set(
    activeEdits.filter((edit) => edit.type === 'delete-page').map((edit) => edit.pageIndex),
  );

  if (deletedPages.size >= pdf.getPageCount()) {
    throw new Error('O PDF precisa manter pelo menos uma página.');
  }

  for (const edit of activeEdits) {
    if (edit.type === 'delete-page') continue;
    if (edit.pageIndex < 0 || edit.pageIndex >= pdf.getPageCount()) continue;
    const page = pdf.getPage(edit.pageIndex);
    if (deletedPages.has(edit.pageIndex)) continue;
    const { width, height } = page.getSize();

    if (edit.type === 'rotate') {
      const current = page.getRotation().angle;
      const next = ((current + edit.degrees) % 360 + 360) % 360;
      page.setRotation(degrees(next));
      continue;
    }

    if (edit.type === 'text') {
      page.drawText(edit.text, {
        x: clampRatio(edit.xRatio) * width,
        y: height - clampRatio(edit.yRatio) * height - edit.size,
        size: edit.size,
        font,
        color: toPdfColor(edit.color),
      });
      continue;
    }

    if (edit.type === 'ocr-replace') {
      const x = clampRatio(edit.xRatio) * width;
      const boxWidth = Math.max(4, clampRatio(edit.widthRatio) * width);
      const boxHeight = Math.max(4, clampRatio(edit.heightRatio) * height);
      const y = height - clampRatio(edit.yRatio) * height - boxHeight;

      // A correção OCR funciona como uma operação composta: cobre a palavra
      // reconhecida e redesenha a versão corrigida dentro da mesma caixa.
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        opacity: 1,
        borderWidth: 0,
      });

      let size = Math.max(5, Math.min(72, boxHeight * 0.78));
      const textWidth = font.widthOfTextAtSize(edit.text, size);
      if (textWidth > boxWidth * 0.98 && textWidth > 0) {
        size *= (boxWidth * 0.98) / textWidth;
      }

      page.drawText(edit.text, {
        x: x + Math.max(0.5, boxWidth * 0.01),
        y: y + Math.max(0.5, (boxHeight - size) * 0.45),
        size: Math.max(4, size),
        font,
        color: toPdfColor(edit.color),
      });
      continue;
    }

    if (edit.type === 'rectangle') {
      const rectWidth = Math.max(4, clampRatio(edit.widthRatio) * width);
      const rectHeight = Math.max(4, clampRatio(edit.heightRatio) * height);
      page.drawRectangle({
        x: clampRatio(edit.xRatio) * width,
        y: height - clampRatio(edit.yRatio) * height - rectHeight,
        width: rectWidth,
        height: rectHeight,
        color: toPdfColor(edit.color),
        opacity: edit.opacity,
        borderWidth: 0,
      });
      continue;
    }

    if (edit.type === 'drawing') {
      for (let index = 1; index < edit.points.length; index += 1) {
        const before = edit.points[index - 1];
        const after = edit.points[index];
        if (!before || !after) continue;
        page.drawLine({
          start: { x: before.xRatio * width, y: height - before.yRatio * height },
          end: { x: after.xRatio * width, y: height - after.yRatio * height },
          thickness: edit.width,
          color: toPdfColor(edit.color),
        });
      }
      continue;
    }

    if (edit.type === 'image') {
      const imageBytes = await edit.imageBlob.arrayBuffer();
      const image = edit.mimeType === 'image/png'
        ? await pdf.embedPng(imageBytes)
        : await pdf.embedJpg(imageBytes);
      const imageWidth = Math.max(12, edit.widthRatio * width);
      const imageHeight = Math.max(12, edit.heightRatio * height);
      page.drawImage(image, {
        x: edit.xRatio * width,
        y: height - edit.yRatio * height - imageHeight,
        width: imageWidth,
        height: imageHeight,
      });
    }
  }

  [...deletedPages]
    .sort((a, b) => b - a)
    .forEach((pageIndex) => pdf.removePage(pageIndex));

  const output = await pdf.save();
  return new Blob([output as unknown as BlobPart], { type: 'application/pdf' });
}

export function activePdfEdits(document: DocumentRecord): PdfEditOperation[] {
  const edits = document.pdfEdits ?? [];
  return edits.slice(0, document.pdfEditCursor ?? edits.length);
}
