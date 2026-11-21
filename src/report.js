const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado', 'segunda'];

function formatDate(date, showTime) {
  if (!date || Number.isNaN(date.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(showTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(date));
}

function dedupe(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const key = `${String(e.title || '').toLowerCase().replace(/\s+/g, ' ').replace(/\b(20\d{2})\b/g, '').trim()}|${e.date ? new Date(e.date).getTime() : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function groupByDateAndCity(events) {
  const grouped = {};
  for (const e of events) {
    const dateKey = e.date ? e.date.toISOString().slice(0, 10) : 'sem-data';
    const city = e.city || 'São Paulo';
    if (!grouped[dateKey]) grouped[dateKey] = { date: e.date, cities: {} };
    if (!grouped[dateKey].cities[city]) grouped[dateKey].cities[city] = [];
    grouped[dateKey].cities[city].push(e);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === 'sem-data') return 1;
    if (b === 'sem-data') return -1;
    return grouped[a].date.getTime() - grouped[b].date.getTime();
  });
  return sortedDates.map((dateKey) => ({
    date: grouped[dateKey].date,
    dateKey,
    cities: grouped[dateKey].cities,
  }));
}

function formatPrice(price) {
  if (price == null || price === '') return 'A consultar';
  const num = Number(price);
  if (Number.isNaN(num)) return 'A consultar';
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

function formatDateTable(date) {
  if (!date || Number.isNaN(date.getTime())) return 'Data não informada';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}/${get('month')}/${get('day')}`;
}

function siteUrl(event) {
  if (event.link) return event.link;
  return event.source ? `https://${event.source}/` : '-';
}

function sortByDate(events) {
  return [...events].sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0));
}

function eventRowValues(e) {
  const dist = (e.distances && e.distances.length) ? e.distances.join(', ') : '-';
  return [
    formatDateTable(e.date),
    e.title || '-',
    dist,
    e.city || '-',
    e.organizer || '-',
    e.status || '-',
    siteUrl(e),
  ];
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeMd(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateStamp(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}/${MONTHS_EN[Number(get('month')) - 1]}/${get('day')}`;
}

function formatTimeStamp(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function buildTable(events) {
  if (!events.length) {
    return '<p>Nenhuma corrida encontrada.</p>';
  }
  const rows = sortByDate(events).map((e) => {
    const [date, name, dist, local, org, obs, site] = eventRowValues(e);
    return `<tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(dist)}</td>
          <td>${escapeHtml(local)}</td>
          <td>${escapeHtml(org)}</td>
          <td>${escapeHtml(obs)}</td>
          <td><a href="${escapeHtml(site)}">${escapeHtml(site)}</a></td>
        </tr>`;
  }).join('\n');
  return `<table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
  <thead>
    <tr>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">DATA</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">NOME</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">DISTANCIAS</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">LOCAL</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">ORGANIZACAO</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">OBSERVACAO</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">SITE</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

function buildTableWithFooter(events, footerText) {
  if (!events.length) {
    return `<p>Nenhuma corrida encontrada.</p><p style="color:#555;font-size:12px;">${footerText}</p>`;
  }
  const rows = sortByDate(events).map((e) => {
    const [date, name, dist, local, org, obs, site] = eventRowValues(e);
    return `<tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(dist)}</td>
          <td>${escapeHtml(local)}</td>
          <td>${escapeHtml(org)}</td>
          <td>${escapeHtml(obs)}</td>
          <td><a href="${escapeHtml(site)}">${escapeHtml(site)}</a></td>
        </tr>`;
  }).join('\n');
  return `<table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
  <thead>
    <tr>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">DATA</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">NOME</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">DISTANCIAS</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">LOCAL</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">ORGANIZACAO</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">OBSERVACAO</th>
      <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">SITE</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
<p style="color:#555;font-size:12px;">${footerText}</p>`;
}

function generateReport(categories) {
  const now = new Date();
  const dateStamp = formatTimeStamp(now);
  const sections = [];

  const categoryConfig = [
    { key: 'spCapital', title: 'Corridas em São Paulo - Capital (SP)', color: '#1976D2', icon: '🏙️' },
    { key: 'spInterior', title: 'Corridas fora de São Paulo-SP — Interior/Litoral e Brasil', color: '#388E3C', icon: '🏖️' },
    { key: 'internacional', title: 'Corridas Internacionais', color: '#F57C00', icon: '🌍' },
  ];

  for (const cat of categoryConfig) {
    const events = categories[cat.key] || [];
    const unique = dedupe(events);
    const tableHtml = buildTableWithFooter(unique,
      `By GitHub Actions — ${cat.title} — ${unique.length} evento(s)`);

    sections.push(`
<div class="category-section">
  <h2 style="color:${cat.color}; border-left: 4px solid ${cat.color}; padding-left: 12px; margin-top: 32px;">
    ${cat.icon} ${cat.title} (${formatDateStamp(now)})
  </h2>
  ${tableHtml}
</div>`);
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Corridas - SP Capital, Interior/Litoral & Internacional</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 1100px; margin: 40px auto; padding: 0 20px; color: #333; background: #fafafa; }
  h1 { color: #222; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
  h2 { margin-top: 32px; }
  .meta { color: #777; font-size: 13px; margin-bottom: 20px; }
  table { background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  .empty { text-align: center; padding: 40px; color: #999; }
  .category-section { margin-bottom: 40px; }
  footer { margin-top: 30px; color: #aaa; font-size: 12px; text-align: center; }
</style>
</head>
<body>
<h1>🏃 Corridas — SP Capital, Interior/Litoral & Internacional (${formatDateStamp(now)})</h1>
<p class="meta">Gerado em: ${dateStamp} (horário de São Paulo — UTC-3)</p>
${sections.join('\n')}
<footer>Automatização — Corridas SP - by Julio Mishima CTAI</footer>
</body>
</html>`;
}

function generateMarkdown(categories) {
  const now = new Date();
  const dateStamp = formatTimeStamp(now);
  const lines = [];
  lines.push(`# Corridas — SP Capital, Interior/Litoral & Internacional (${formatDateStamp(now)})`);
  lines.push('');
  lines.push(`Gerado em: ${dateStamp} (horário de São Paulo — UTC-3)`);
  lines.push('');

  const categoryConfig = [
    { key: 'spCapital', title: 'Corridas em São Paulo - Capital (SP)' },
    { key: 'spInterior', title: 'Corridas em São Paulo - Interior/Litoral (SP)' },
    { key: 'internacional', title: 'Corridas Internacionais' },
  ];

  for (const cat of categoryConfig) {
    const events = categories[cat.key] || [];
    const unique = dedupe(events);

    lines.push(`## ${cat.title} (${formatDateStamp(now)})`);
    lines.push('');

    if (!unique.length) {
      lines.push('Nenhuma corrida encontrada.');
      lines.push('');
      continue;
    }

    lines.push('| DATA | NOME | DISTANCIAS | LOCAL | ORGANIZACAO | OBSERVACAO | SITE |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const e of sortByDate(unique)) {
      const [date, name, dist, local, org, obs, site] = eventRowValues(e);
      lines.push(`| ${escapeMd(date)} | ${escapeMd(name)} | ${escapeMd(dist)} | ${escapeMd(local)} | ${escapeMd(org)} | ${escapeMd(obs)} | ${escapeMd(site)} |`);
    }
    lines.push('');
  }

  lines.push('_Via GitHub Actions — Corridas SP - by Julio Mishima CTAI._');
  return lines.join('\n');
}

module.exports = { generateReport, generateMarkdown, buildTable, buildTableWithFooter, dedupe, formatDate, escapeHtml, groupByDateAndCity, formatPrice, formatDateStamp };