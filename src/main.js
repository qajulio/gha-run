const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { scrapeAll: scrapeSPCapital } = require('./scrapers-sp-capital');
const { scrapeAllInterior } = require('./scrapers-sp-interior');
const { scrapeAllInternational } = require('./scrapers-internacional');
const { generateReport, generateMarkdown, dedupe } = require('./report');

const REPORT_DIR = path.join(__dirname, '..', 'docs');
const REPORT_PATH = path.join(REPORT_DIR, 'index.html');
const MD_PATH = path.join(REPORT_DIR, 'index.md');

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function collectEvents(results, categoryName) {
  const events = [];
  for (const res of results) {
    if (res.error) {
      console.error(`[${categoryName}][${res.source}] erro: ${res.error}`);
    } else {
      console.log(`[${categoryName}][${res.source}] ${res.events.length} evento(s) encontrado(s)`);
    }
    res.events.forEach((e) => events.push(e));
  }
  return events;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== Coletando corridas em 3 categorias ===\n');

  console.log('1/3 - Buscando corridas em São Paulo Capital...');
  const spCapitalResults = await scrapeSPCapital();

  console.log('\n2/3 - Buscando corridas fora de SP capital (Interior/Litoral e Brasil)...');
  const spInteriorResults = await scrapeAllInterior();

  console.log('\n3/3 - Buscando corridas internacionais...');
  const intlResults = await scrapeAllInternational();

  const spCapitalEvents = collectEvents(spCapitalResults, 'SP Capital');
  const spInteriorEvents = collectEvents(spInteriorResults, 'SP Interior');
  const intlEvents = collectEvents(intlResults, 'Internacional');

  const uniqueCapital = dedupe(spCapitalEvents);
  const uniqueInterior = dedupe(spInteriorEvents);
  const uniqueIntl = dedupe(intlEvents);

  uniqueCapital.sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0));
  uniqueInterior.sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0));
  uniqueIntl.sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0));

  console.log('\n=== RESUMO ===');
  console.log(`SP Capital: ${uniqueCapital.length} corrida(s)`);
  console.log(`SP Interior/Litoral: ${uniqueInterior.length} corrida(s)`);
  console.log(`Internacional: ${uniqueIntl.length} corrida(s)`);
  console.log(`Total: ${uniqueCapital.length + uniqueInterior.length + uniqueIntl.length} corrida(s)`);

  const categories = {
    spCapital: uniqueCapital,
    spInterior: uniqueInterior,
    internacional: uniqueIntl,
  };

  const html = generateReport(categories);

  if (dryRun) {
    console.log('\n=== RELATÓRIO GERADO (dry-run) ===');
    console.log(html);
    return;
  }

  ensureReportDir();
  fs.writeFileSync(REPORT_PATH, html, 'utf-8');
  console.log(`\nRelatório HTML salvo em: ${REPORT_PATH}`);

  const md = generateMarkdown(categories);
  fs.writeFileSync(MD_PATH, md, 'utf-8');
  console.log(`Relatório Markdown salvo em: ${MD_PATH}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});