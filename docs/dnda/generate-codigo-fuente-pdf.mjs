/**
 * Generate PDF for Codigo Fuente (Primeras y Ultimas paginas)
 * Usage: node generate-codigo-fuente-pdf.mjs
 */
import puppeteer from 'puppeteer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Launching browser for PDF generation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const htmlPath = join(__dirname, 'DNDA_CodigoFuente_PrimerasUltimas.html');
  const pdfPath = join(__dirname, 'DNDA_CodigoFuente_PrimerasUltimas_MiDirectorFinancieroPTY.pdf');

  console.log('Loading HTML...');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    margin: { top: '2cm', bottom: '2.5cm', left: '2cm', right: '2cm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:9px;text-align:center;width:100%;color:#999;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
  });

  console.log(`  ✓ ${pdfPath}`);

  // Copy to Downloads
  const downloadPath = 'C:\\Users\\FranciscoSaraiva\\Downloads\\DNDA_CodigoFuente_PrimerasUltimas_MiDirectorFinancieroPTY.pdf';
  try {
    copyFileSync(pdfPath, downloadPath);
    console.log(`  ✓ Copied to ${downloadPath}`);
  } catch(e) {
    console.log(`  ⚠ Could not copy to Downloads: ${e.message}`);
  }

  await page.close();
  await browser.close();
  console.log('\n✅ PDF generated successfully!');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
