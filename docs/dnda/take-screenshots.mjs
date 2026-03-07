/**
 * Screenshot automation for DNDA documentation
 * Takes ~25 screenshots of Mi Director Financiero PTY
 * Pre-populates localStorage with demo data to bypass setup wizard
 * Usage: node take-screenshots.mjs
 */
import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:3000';

// Demo financial data
const DEMO_FINANCIAL = {
  revenue: 180000,
  cogs: 72000,
  opex_rent: 3600,
  opex_payroll: 48000,
  opex_services: 4800,
  opex_marketing: 2400,
  opex_other: 3000,
  opex_insurance: 1200,
  depreciation: 1500,
  amortization: 500,
  interest_expense: 900,
  taxes: 8400,
  cash_balance: 45000,
  monthly_expenses: 12000,
  units_sold: 3600,
  price_per_unit: 50,
  itbms_collected: 12600,
  itbms_paid: 5040,
  fiscal_year: 2026,
  period: "2026"
};

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function takeScreenshot(page, name, label) {
  await delay(2000); // Wait for animations/rendering
  const path = join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${label} → ${name}.png`);
}

async function clickByText(page, text) {
  const clicked = await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, [role="tab"], a, div[class*="cursor-pointer"], span')];
    // Exact match first
    let el = els.find(e => e.textContent?.trim() === t);
    // Then partial match
    if (!el) el = els.find(e => e.textContent?.trim().includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, text);
  if (clicked) await delay(1000);
  return clicked;
}

async function setupLocalStorage(page) {
  await page.evaluate((fin) => {
    // Company setup
    localStorage.setItem("midf_setup_complete", "true");
    localStorage.setItem("midf_welcomed", "true");
    localStorage.setItem("midf_company_name", "Ejemplo Panama S.A.");
    localStorage.setItem("midf_company_rubro", "Comercio Minorista");
    localStorage.setItem("midf_entity_type", "SA");
    localStorage.setItem("midf_ruc", "155709876-2-2024");
    localStorage.setItem("midf_dv", "42");
    localStorage.setItem("midf_incorporation_date", "2024-03-15");
    localStorage.setItem("midf_fiscal_address", "Via España, Edificio Central, Piso 3, Panama City");
    localStorage.setItem("midf_fiscal_regime", "sa_standard");
    localStorage.setItem("midf_has_ruc", "true");

    // Financial data
    localStorage.setItem("midf_financial_2026", JSON.stringify(fin));
    localStorage.setItem("midf_last_financial", JSON.stringify(fin));

    // Executive summary with sample periods
    localStorage.setItem("midf_exec_summary", JSON.stringify({
      "2026-Q1": fin,
      "2026-Q2": { ...fin, revenue: 195000, cogs: 78000 }
    }));

    // Payroll totals
    localStorage.setItem("midf_payroll_totals", JSON.stringify({
      totalGross: 4000,
      totalEmployerCost: 5440,
      totalNet: 3340,
      hiddenCost: 1440,
      planillaCount: 2,
      freelanceCount: 1,
      costoAnual: 65280
    }));

    // Access granted
    sessionStorage.setItem("midf_access_granted", "true");
  }, DEMO_FINANCIAL);
}

async function main() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // Navigate to base URL first to set localStorage
  console.log('Setting up demo data in localStorage...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setupLocalStorage(page);

  // Now navigate to dashboard with data in place
  console.log('Navigating to dashboard...\n');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(4000); // Wait for full render

  // Check if we see the dashboard or still setup wizard
  const pageTitle = await page.evaluate(() => document.title);
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
  console.log(`Page title: ${pageTitle}`);
  console.log(`Body preview: ${bodyText?.substring(0, 100)}...\n`);

  // ==========================================
  // SCREENSHOTS
  // ==========================================

  // FIG 1: Hub Principal
  console.log('[1/25] Hub Principal');
  // Click "Mi Hub" if visible
  await clickByText(page, 'Mi Hub');
  await takeScreenshot(page, 'fig_01_hub', 'Hub Principal');

  // FIG 2: Datos Flash
  console.log('[2/25] Datos Flash');
  let found = await clickByText(page, 'Mis Datos');
  if (!found) await clickByText(page, 'Datos');
  await delay(500);
  await clickByText(page, 'Flash');
  await takeScreenshot(page, 'fig_02_datos_flash', 'Datos Flash');

  // Navigate to Negocio/Finanzas
  console.log('\n--- Mis Finanzas ---');
  found = await clickByText(page, 'Mis Finanzas');
  if (!found) found = await clickByText(page, 'Finanzas');
  if (!found) found = await clickByText(page, 'Negocio');
  await delay(1500);

  // FIG 3: Cascada
  console.log('[3/25] Cascada Financiera');
  await clickByText(page, 'Cascada');
  await takeScreenshot(page, 'fig_03_cascada', 'Cascada Financiera');

  // FIG 4: Mandibulas
  console.log('[4/25] Mandibulas');
  found = await clickByText(page, 'Mandíbulas');
  if (!found) found = await clickByText(page, 'Mandibulas');
  await takeScreenshot(page, 'fig_04_mandibulas', 'Mandibulas de Cocodrilo');

  // FIG 5: Semaforo
  console.log('[5/25] Semaforo');
  found = await clickByText(page, 'Semáforo');
  if (!found) found = await clickByText(page, 'Semaforo');
  await takeScreenshot(page, 'fig_05_semaforo', 'Semaforo Financiero');

  // FIG 6: Equilibrio
  console.log('[6/25] Punto de Equilibrio');
  await clickByText(page, 'Equilibrio');
  await takeScreenshot(page, 'fig_06_equilibrio', 'Punto de Equilibrio');

  // FIG 7: Oxigeno
  console.log('[7/25] Oxigeno Empresarial');
  found = await clickByText(page, 'Oxígeno');
  if (!found) found = await clickByText(page, 'Oxigeno');
  await takeScreenshot(page, 'fig_07_oxigeno', 'Oxigeno Empresarial');

  // FIG 8: Simulador
  console.log('[8/25] Simulador');
  await clickByText(page, 'Simulador');
  await takeScreenshot(page, 'fig_08_simulador', 'Simulador What-If');

  // FIG 9: Lab Precios
  console.log('[9/25] Lab Precios');
  found = await clickByText(page, 'Lab');
  if (!found) found = await clickByText(page, 'Precios');
  await takeScreenshot(page, 'fig_09_lab_precios', 'Laboratorio de Precios');

  // FIG 10: Valoracion
  console.log('[10/25] Valoracion');
  found = await clickByText(page, 'Valoración');
  if (!found) found = await clickByText(page, 'Valoracion');
  await takeScreenshot(page, 'fig_10_valoracion', 'Valoracion Empresarial');

  // FIG 11: Nomina
  console.log('[11/25] Planilla / Nomina');
  found = await clickByText(page, 'Nómina');
  if (!found) found = await clickByText(page, 'Nomina');
  if (!found) found = await clickByText(page, 'Planilla');
  await takeScreenshot(page, 'fig_11_nomina', 'Planilla / Nomina');

  // FIG 12: Tendencias
  console.log('[12/25] Tendencias');
  await clickByText(page, 'Tendencias');
  await takeScreenshot(page, 'fig_12_tendencias', 'Tendencias');

  // FIG 13: Comparativo
  console.log('[13/25] Comparativo');
  await clickByText(page, 'Comparativo');
  await takeScreenshot(page, 'fig_13_comparativo', 'Comparativo');

  // FIG 14: Presupuesto
  console.log('[14/25] Presupuesto');
  await clickByText(page, 'Presupuesto');
  await takeScreenshot(page, 'fig_14_presupuesto', 'Presupuesto');

  // FIG 15: Reportes
  console.log('[15/25] Reportes');
  await clickByText(page, 'Reportes');
  await takeScreenshot(page, 'fig_15_reportes', 'Reportes');

  // --- CONTABILIDAD ---
  console.log('\n--- Mi Contabilidad ---');
  found = await clickByText(page, 'Mis Datos');
  if (!found) await clickByText(page, 'Datos');
  await delay(800);
  await clickByText(page, 'Contabilidad');
  await delay(1500);

  // FIG 16: Plan de Cuentas
  console.log('[16/25] Plan de Cuentas');
  await clickByText(page, 'Plan de Cuentas');
  await takeScreenshot(page, 'fig_16_plan_cuentas', 'Plan de Cuentas');

  // FIG 17: Libro Diario
  console.log('[17/25] Libro Diario');
  await clickByText(page, 'Libro Diario');
  await takeScreenshot(page, 'fig_17_libro_diario', 'Libro Diario');

  // FIG 18: Espejo DGI
  console.log('[18/25] Espejo DGI');
  found = await clickByText(page, 'Mis Datos');
  if (!found) await clickByText(page, 'Datos');
  await delay(800);
  found = await clickByText(page, 'Espejo DGI');
  if (!found) await clickByText(page, 'DGI');
  await delay(1500);
  await takeScreenshot(page, 'fig_18_espejo_dgi', 'Espejo DGI');

  // FIG 19: Mi RRHH
  console.log('[19/25] Mi RRHH');
  found = await clickByText(page, 'Mis Datos');
  if (!found) await clickByText(page, 'Datos');
  await delay(800);
  found = await clickByText(page, 'RRHH');
  if (!found) await clickByText(page, 'Mi RRHH');
  await delay(1500);
  await takeScreenshot(page, 'fig_19_mi_rrhh', 'Mi RRHH');

  // FIG 20: Mi Inventario
  console.log('[20/25] Mi Inventario');
  found = await clickByText(page, 'Mis Datos');
  if (!found) await clickByText(page, 'Datos');
  await delay(800);
  found = await clickByText(page, 'Inventario');
  if (!found) await clickByText(page, 'Mi Inventario');
  await delay(1500);
  await takeScreenshot(page, 'fig_20_mi_inventario', 'Mi Inventario');

  // --- LEGAL ---
  console.log('\n--- Doc Legales ---');
  found = await clickByText(page, 'Doc Legales');
  if (!found) found = await clickByText(page, 'Legales');
  if (!found) found = await clickByText(page, 'Legal');
  await delay(1500);

  // FIG 21: Boveda
  console.log('[21/25] Boveda Legal');
  found = await clickByText(page, 'Bóveda');
  if (!found) found = await clickByText(page, 'Boveda');
  await takeScreenshot(page, 'fig_21_boveda', 'Boveda Legal');

  // FIG 22: Vigilante
  console.log('[22/25] Vigilante Legal');
  await clickByText(page, 'Vigilante');
  await takeScreenshot(page, 'fig_22_vigilante', 'Vigilante Legal');

  // FIG 23: Fabrica de Empresa
  console.log('[23/25] Fabrica de Empresa');
  found = await clickByText(page, 'Fábrica');
  if (!found) found = await clickByText(page, 'Fabrica');
  await takeScreenshot(page, 'fig_23_fabrica', 'Fabrica de Empresa');

  // FIG 24: Mi Asistente
  console.log('\n--- Mi Asistente ---');
  found = await clickByText(page, 'Mi Asistente');
  if (!found) found = await clickByText(page, 'Asistente');
  await delay(2000);
  await takeScreenshot(page, 'fig_24_asistente', 'Mi Asistente IA');

  // FIG 25: Panel de Alertas
  console.log('[25/25] Panel de Alertas');
  // Go back to Hub
  found = await clickByText(page, 'Mi Hub');
  if (!found) await clickByText(page, 'Hub');
  await delay(1500);
  // Try to open alerts sidebar via bell button or alerts toggle
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const alertBtn = btns.find(b => {
      const text = b.textContent || '';
      const ariaLabel = b.getAttribute('aria-label') || '';
      const hasAlertIcon = b.querySelector('[data-lucide="bell"], .lucide-bell');
      return text.includes('Alerta') || ariaLabel.includes('alert') || ariaLabel.includes('Alerta') || hasAlertIcon;
    });
    if (alertBtn) alertBtn.click();
  });
  await delay(1500);
  await takeScreenshot(page, 'fig_25_alertas', 'Panel de Alertas');

  console.log('\n✅ All screenshots taken!');
  console.log(`📁 Saved to: ${SCREENSHOTS_DIR}`);

  await browser.close();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
