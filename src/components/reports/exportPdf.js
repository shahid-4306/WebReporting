// Exports a rendered report (the .print-area element) to a multi-page A4 PDF
// using html2canvas + jsPDF. Captures exactly what is on screen, including the
// report header (company, period, account) and the table with totals.

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportReportToPdf(element, fileName) {
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableW = pageW - margin * 2;
  const imgHeight = (canvas.height * usableW) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, usableW, imgHeight);
  heightLeft -= pageH - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, usableW, imgHeight);
    heightLeft -= pageH - margin * 2;
  }

  pdf.save(fileName);
}