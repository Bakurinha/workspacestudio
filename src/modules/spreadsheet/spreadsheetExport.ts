import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { DocumentRecord, SpreadsheetContent } from '../../types/document';

/**
 * Atualiza uma cópia do XLSX original quando possível para preservar o máximo
 * de formatação compatível com ExcelJS. O Blob original armazenado nunca é alterado.
 */
export async function exportSpreadsheet(document: DocumentRecord): Promise<Blob> {
  if (!document.content) throw new Error('Documento sem conteúdo de planilha.');

  if (document.extension === 'csv') {
    const sheet = document.content.sheets[document.content.activeSheetIndex] ?? document.content.sheets[0];
    if (!sheet) throw new Error('Nenhuma aba disponível para exportação.');
    const csv = Papa.unparse([sheet.headers, ...sheet.rows]);
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const original = await document.originalBlob.arrayBuffer();
    await workbook.xlsx.load(original as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    // Fallback seguro: se o original não puder ser reaberto, geramos um novo workbook
    // a partir do modelo interno, sem modificar o arquivo armazenado.
  }

  syncWorkbook(workbook, document.content);
  const data = await workbook.xlsx.writeBuffer();
  return new Blob([data as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function syncWorkbook(workbook: ExcelJS.Workbook, content: SpreadsheetContent): void {
  content.sheets.forEach((sheetData, sheetIndex) => {
    const worksheet = workbook.worksheets[sheetIndex] ?? workbook.addWorksheet(sheetData.name);
    worksheet.name = sheetData.name;

    sheetData.headers.forEach((header, columnIndex) => {
      worksheet.getCell(1, columnIndex + 1).value = header;
    });

    sheetData.rows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        worksheet.getCell(rowIndex + 2, columnIndex + 1).value = value;
      });
    });
  });
}
