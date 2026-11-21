const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const REQUEST_TIMEOUT = 30000;

const MONTHS_PT = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };

function parseDatePT(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return null;

  const numeric = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (numeric) {
    const date = new Date(parseInt(numeric[3], 10), parseInt(numeric[2], 10) - 1, parseInt(numeric[1], 10));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const named = value.match(/(\d{1,2})(?:[ºª])?\s+(?:de\s+)?([A-Za-zçãõ]+)\s+(\d{4})/i);
  if (!named) return null;
  const month = MONTHS_PT[named[2].toLowerCase().slice(0, 3)];
  if (month == null) return null;
  const date = new Date(parseInt(named[3], 10), month, parseInt(named[1], 10));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimePT(text) {
  const match = String(text || '').match(/(\d{1,2})[:h](\d{2})/i);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function withTime(date, text) {
  if (!date) return null;
  const time = parseTimePT(text);
  if (!time) return date;
  const dated = new Date(date);
  dated.setHours(time.hour, time.minute, 0, 0);
  return dated;
}

function parseDistances(text) {
  const matches = String(text || '').match(/\d+(?:[.,]\d+)?\s*(?:km|k)\b/gi);
  return matches ? [...new Set(matches.map((value) => value.replace(/\s+/g, '').replace(',', '.').toUpperCase()))] : [];
}

function toAbsoluteUrl(base, href) {
  if (!href) return '';
  try { return new URL(href, base).href; } catch (_) { return ''; }
}

const EXCLUDE_KEYWORDS = [
  'mtb', 'mountain bike', 'triatlo', 'triatlon', 'aquabike', 'duatlo',
  'ciclismo', 'bmx', 'velocross', 'skate', 'patins',
];

function isRunningEvent(title) {
  const t = (title || '').toLowerCase();
  return !EXCLUDE_KEYWORDS.some((k) => t.includes(k));
}

const runningLifeScrape = async () => {
  const BASE_URL = 'https://running.life';
  const CALENDAR_URL = `${BASE_URL}/calendario-corridas/brasil`;

  const { data } = await axios.get(CALENDAR_URL, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: REQUEST_TIMEOUT,
  });
  const $ = cheerio.load(data);
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  $('.card, .event-card, .corrida-card, article').each((_, card) => {
    const $card = $(card);
    const title = $card.find('h2, h3, .title, .nome').first().text().replace(/\s+/g, ' ').trim();
    if (!title || !/corrida|run|maratona|meia|trail|stadium|obst/i.test(title)) return;

    const location = $card.find('.local, .cidade, .endereco, .location, .place').first().text().replace(/\s+/g, ' ').trim();
    if (!location || /brasil|sp|são paulo/i.test(location)) return;

    const dateText = $card.find('.data, .date, .quando').first().text().replace(/\s+/g, ' ').trim();
    const date = withTime(parseDatePT(dateText), dateText);
    if (!date || date < today) return;

    const link = $card.find('a[href]').first().attr('href') || '';
    const distances = parseDistances($card.find('.distancia, .distancias, .percurso').text());

    events.push({
      title, date, dateText, distances,
      link: toAbsoluteUrl(BASE_URL, link),
      organizer: 'Running Life', source: 'running.life',
      city: location, hasTime: true,
    });
  });

  return events;
};

const esportividadeIntlScrape = async () => {
  const BASE_URL = 'https://esportividade.com.br';
  const events = [];
  const seen = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let page = 1; page <= 18; page += 1) {
    const url = page === 1 ? `${BASE_URL}/agenda/` : `${BASE_URL}/agenda/page/${page}/`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: REQUEST_TIMEOUT });
    const $ = cheerio.load(data);
    let found = 0;

    $('article.resultado_busca_post').each((_, card) => {
      const $card = $(card);
      const title = $card.find('.titulo a').text().replace(/\s+/g, ' ').trim();
      const location = $card.find('#infos p').text().replace(/\s+/g, ' ').trim();
      const modality = $card.find('.modalidade').text().replace(/\s+/g, ' ').trim();
      if (!title || !/corrida/i.test(modality)) return;
      if (/trein|bate-papo|kids|infantil|virtual|online/i.test(title)) return;

      if (/São Paulo\s*-\s*(Centro|Zona (Norte|Sul|Leste|Oeste)|Todas as Regiões)/i.test(location)) return;

      const dateText = $card.find('.agenda .dia').text().replace(/\s+/g, ' ').trim();
      const date = withTime(parseDatePT(dateText), dateText);
      if (!date || date < today) return;

      const href = $card.find('.titulo a').attr('href') || '';
      const link = toAbsoluteUrl(BASE_URL, href);
      const key = `${title}|${date.getTime()}`;
      if (seen.has(key)) return;
      seen.add(key);
      found += 1;

      events.push({
        title, date, dateText, distances: [], link,
        organizer: 'Esportividade', source: 'esportividade.com.br', city: location, hasTime: true,
      });
    });

    if (!found && page > 1) break;
    if (page < 18) await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const corrida360Scrape = async () => {
  const BASE_URL = 'https://corrida360.com.br';
  const URL = `${BASE_URL}/corridas`;

  const { data } = await axios.get(URL, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: REQUEST_TIMEOUT,
  });
  const $ = cheerio.load(data);
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  $('.corrida-item, .event-item, .card, article').each((_, item) => {
    const $item = $(item);
    const title = $item.find('h2, h3, .title, .nome').first().text().replace(/\s+/g, ' ').trim();
    if (!title || !/corrida|run|maratona|meia|trail|stadium|obst/i.test(title)) return;

    const location = $item.find('.local, .cidade, .endereco, .location').first().text().replace(/\s+/g, ' ').trim();
    if (!location || /brasil|sp|são paulo/i.test(location)) return;

    const dateText = $item.find('.data, .date, .quando').first().text().replace(/\s+/g, ' ').trim();
    const date = withTime(parseDatePT(dateText), dateText);
    if (!date || date < today) return;

    const link = $item.find('a[href]').first().attr('href') || '';
    const distances = parseDistances($item.find('.distancia, .distancias').text());

    events.push({
      title, date, dateText, distances,
      link: toAbsoluteUrl(BASE_URL, link),
      organizer: 'Corrida360', source: 'corrida360.com.br',
      city: location, hasTime: true,
    });
  });

  return events;
};

const SCRAPERS_INTL = [
  { scrape: runningLifeScrape, SOURCE_NAME: 'running.life' },
  { scrape: esportividadeIntlScrape, SOURCE_NAME: 'esportividade.com.br' },
  { scrape: corrida360Scrape, SOURCE_NAME: 'corrida360.com.br' },
];

async function scrapeAllInternational() {
  const results = await Promise.all(
    SCRAPERS_INTL.map(async (s) => {
      try {
        const events = await s.scrape();
        return { source: s.SOURCE_NAME, events, error: null };
      } catch (err) {
        return { source: s.SOURCE_NAME, events: [], error: err.message };
      }
    })
  );
  return results;
}

module.exports = { scrapeAllInternational, SCRAPERS_INTL, runningLifeScrape, esportividadeIntlScrape, corrida360Scrape };