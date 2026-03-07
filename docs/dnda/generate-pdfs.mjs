/**
 * PDF generation for DNDA documents using Puppeteer
 * Replaces wkhtmltopdf - generates Letter-size PDFs with zero margins
 * Usage: node generate-pdfs.mjs
 */
import puppeteer from 'puppeteer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const documents = [
  {
    html: 'DNDA_MemoriaDescriptiva.html',
    pdf: 'DNDA_MemoriaDescriptiva_MiDirectorFinancieroPTY.pdf',
    label: 'Memoria Descriptiva'
  },
  {
    html: 'DNDA_CodigoFuente_MiDirectorFinancieroPTY.html',
    pdf: 'DNDA_CodigoFuente_MiDirectorFinancieroPTY.pdf',
    label: 'Codigo Fuente'
  },
  {
    html: 'DNDA_ManualDeUso_MiDirectorFinancieroPTY.html',
    pdf: 'DNDA_ManualDeUso_MiDirectorFinancieroPTY.pdf',
    label: 'Manual de Uso'
  }
];

async function main() {
  console.log('Launching browser for PDF generation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  for (const doc of documents) {
    console.log(`\nGenerating: ${doc.label}...`);
    const page = await browser.newPage();

    const htmlPath = join(__dirname, doc.html);
    const pdfPath = join(__dirname, doc.pdf);

    // Navigate to the local HTML file
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for images to load
    await new Promise(r => setTimeout(r, 2000));

    // Generate PDF with Letter size and zero margins (as user requested)
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true
    });

    console.log(`  ✓ ${doc.pdf}`);
    await page.close();
  }

  await browser.close();
  console.log('\n✅ All 3 PDFs generated successfully!');
  console.log(`📁 Location: ${__dirname}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
