import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { createRequire } from 'node:module';

// These consumers use UUID v4. Guard the scoped security override with real consumers.
describe('patched UUID dependency compatibility', () => {
  it('round-trips a workbook containing conditional formatting', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data');
    sheet.addRows([['Code', 'Value'], ['00123', 42]]);
    sheet.addConditionalFormatting({ ref: 'B2', rules: [{ type: 'dataBar', priority: 1,
      cfvo: [{ type: 'min' }, { type: 'max' }],
      gradient: false }] });
    const bytes = await workbook.xlsx.writeBuffer();
    const copy = new ExcelJS.Workbook();
    await copy.xlsx.load(bytes);
    expect(copy.getWorksheet('Data')?.getCell('A2').value).toBe('00123');
    expect(copy.getWorksheet('Data')?.getCell('B2').value).toBe(42);
  });
  it('keeps the Capacitor Xcode project ID generator working', () => {
    const require = createRequire(import.meta.url);
    const project = require('xcode').project('unused.pbxproj');
    project.hash = { project: { objects: {} } };
    expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
  });
});
