import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Response } from "express";

export async function sendExcel(res: Response, filename: string, rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");
  sheet.columns = Object.keys(rows[0] ?? { message: "No data" }).map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 4, 16)
  }));
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

export function sendPdf(res: Response, title: string, rows: Record<string, unknown>[]) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title.toLowerCase().replace(/\s+/g, "-")}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();
  rows.forEach((row, index) => {
    doc.fontSize(11).text(`${index + 1}. ${Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(" | ")}`);
    doc.moveDown(0.4);
  });
  doc.end();
}
