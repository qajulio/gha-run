const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const REQUEST_TIMEOUT = 30000;

const SP_INTERIOR_CITIES = [
  'santos', 'campinas', 'jundiaí', 'jundiai', 'sorocaba', 'ribeirão preto', 'ribeirao preto',
  'são josé dos campos', 'sao jose dos campos', 'são josé do rio preto', 'sao jose do rio preto',
  'bauru', 'piracicaba', 'mogi', 'mogi das cruzes', 'diadema', 'são bernardo do campo',
  'sao bernardo do campo', 'santo andré', 'santo andre', 'guarulhos', 'osasco', 'itaquaquecetuba',
  'ferraz de vasconcelos', ' Suzano', 'suzano', 'itaquaquecetuba', 'mogi das cruzes',
  'cotia', 'itapecerica da serra', 'embu', 'embu das artes', 'taboão da serra', 'taboao da serra',
  'carapicuíba', 'carapicuiba', 'barueri', 'itaquaquecetuba', 'suzano', 'poá', 'poa',
  'mogi das cruzes', 'suzano', 'itaquaquecetuba', 'ferraz de vasconcelos', 'itaquaquecetuba',
  'litoral norte', 'litoral sul', 'registro', 'jundiaí', 'jundiai', 'louveira',
  'vinhedo', 'valinhos', 'itatiba', 'bragança paulista', 'braganca paulista',
  'tuiuti', 'pedra bela', 'santo antonio de posse', 'santo antonio do pinhal',
  'monte alegre do sul', 'bom jesus dos perdoes', 'vargem', 'piracaia',
  'bom jesus dos perdoes', 'nazaré paulista', 'nazare paulista', 'vargem',
  'santo antonio do planalto', 'tuiuti', 'pedra bela', 'santo antonio de posse',
  'bom jesus dos perdoes', 'nazaré paulista', 'nazare paulista', 'vargem',
  'itaquaquecetuba', 'suzano', 'poá', 'poa', 'ferraz de vasconcelos',
  'mogi das cruzes', 'guarulhos', 'são miguel paulista', 'sao miguel paulista',
];

const INTERIOR_KEYWORDS = [
  'santos', 'campinas', 'jundiaí', 'jundiai', 'sorocaba', 'ribeirão preto', 'ribeirao preto',
  'são josé dos campos', 'sao jose dos campos', 'são josé do rio preto', 'sao jose do rio preto',
  'bauru', 'piracicaba', 'mogi', 'diadema', 'são bernardo', 'sao bernardo',
  'santo andré', 'santo andre', 'guarulhos', 'osasco', 'itaquaquecetuba',
  'ferraz', 'suzano', 'cotia', 'itapecerica', 'embu', 'taboão', 'taboao',
  'carapicuíba', 'carapicuiba', 'barueri', 'poá', 'poa', 'litoral',
  'registro', 'louveira', 'vinhedo', 'valinhos', 'itatiba', 'bragança',
  'braganca', 'tuiuti', 'pedra bela', 'bom jesus', 'nazaré', 'nazare',
  'vargem', 'piracaia', 'santo antonio', 'monte alegre',
  'rio de janeiro', 'rj', 'niteroi', 'niterói', 'petropolis', 'petrópolis',
  'belo horizonte', 'minas gerais', 'mg', 'uberlandia', 'uberlândia',
  'curitiba', 'paraná', 'pr', 'londrina', 'maringa', 'maringá',
  'porto alegre', 'rio grande do sul', 'rs', 'gramado', 'caxias do sul',
  'salvador', 'bahia', 'ba', 'recife', 'pernambuco', 'pe',
  'fortaleza', 'ceará', 'ce', 'natal', 'rio grande do norte', 'rn',
  'joão pessoa', 'joao pessoa', 'paraíba', 'pb', 'maceió', 'maceio',
  'alagoas', 'al', 'teresina', 'piauí', 'piaui', 'são luis', 'sao luis',
  'maranhão', 'maranhao', 'ma', 'belém', 'belem', 'pará', 'para',
  'manaus', 'amazonas', 'am', 'porto velho', 'rondônia', 'rondonia',
  'rio branco', 'acre', 'ac', 'goiânia', 'goiania', 'goiás', 'goias',
  'go', 'brasilia', 'brasília', 'distrito federal', 'df',
  'vitoria', 'vitória', 'espírito santo', 'espirito santo', 'es',
  'florianópolis', 'florianopolis', 'santa catarina', 'sc',
];

function isSaoPauloCapital(text) {
  const value = String(text || '').toLowerCase();
  return /são paulo\s*(?:,|-|\||•|\s)\s*sp\b/.test(value) ||
    /sao paulo\s*(?:,|-|\||•|\s)\s*sp\b/.test(value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

function isInteriorOrLitoral(text) {
  const value = String(text || '').toLowerCase();
  if (isSaoPauloCapital(value)) return false;
  return INTERIOR_KEYWORDS.some((kw) => value.includes(kw));
}

function isBrasilForaSP(text) {
  const value = String(text || '').toLowerCase();
  const brasilStates = ['rj', 'mg', 'pr', 'rs', 'ba', 'pe', 'ce', 'rn', 'pb', 'al', 'pi', 'ma', 'pa', 'am', 'ro', 'ac', 'go', 'df', 'es', 'sc'];
  const brasilCities = ['rio de janeiro', 'niteroi', 'niterói', 'petropolis', 'petrópolis',
    'belo horizonte', 'uberlandia', 'uberlândia', 'curitiba', 'londrina', 'maringa', 'maringá',
    'porto alegre', 'gramado', 'caxias do sul', 'salvador', 'recife', 'fortaleza', 'natal',
    'joao pessoa', 'joão pessoa', 'maceio', 'maceió', 'teresina', 'sao luis', 'são luis',
    'belem', 'belém', 'manaus', 'porto velho', 'rio branco', 'goiania', 'Goiânia',
    'brasilia', 'brasília', 'vitoria', 'vitória', 'florianopolis', 'Florianópolis'];
  if (brasilCities.some((c) => value.includes(c))) return true;
  if (brasilStates.some((s) => value.includes(`, ${s}`) || value.includes(`| ${s}`) || value.includes(`- ${s}`))) return true;
  return isInteriorOrLitoral(value);
}

const iguanaScrapeInterior = async () => {
  const BASE_URL = 'https://iguanasports.com.br';
  const CALENDAR_URL = `${BASE_URL}/blogs/calendario-corridas-de-rua`;

  const MONTHS_PT = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };

  function parseDateText(text) {
    const m = String(text || '').trim().match(/(\d{1,2})\s+([A-Za-zç]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const month = MONTHS_PT[m[2].toLowerCase().slice(0, 3)];
    if (month == null) return null;
    return new Date(parseInt(m[3], 10), month, parseInt(m[1], 10), parseInt(m[4], 10), parseInt(m[5], 10));
  }

  const { data } = await axios.get(CALENDAR_URL, { headers: { 'User-Agent': USER_AGENT }, timeout: REQUEST_TIMEOUT });
  const $ = cheerio.load(data);
  const events = [];

  $('.item-article-blog').each((_, item) => {
    const $item = $(item);
    const ts = $item.attr('data-date');
    const card = $item.find('.article-card').first();
    if (!card.length) return;

    const slug = card.attr('data-title') || '';
    const title = (card.find('.article-card__title a .text').text().trim() ||
      card.find('.article-card__title').text().trim() || slug);
    if (!title) return;

    const link = card.find('.article-card__title a').attr('href') || card.attr('data-title');
    const localization = card.attr('data-localization') || card.find('.article-card__pin').text().trim();
    const distancesRaw = card.attr('data-distance') || '';
    const dateText = $item.find('.article-card__running-date .text').text().trim();

    const isSP = /São Paulo\s*\|\s*SP/i.test(localization || '') || /São Paulo\s*\|\s*SP/i.test(localization || '');
    if (!isSP) return;

    const city = localization ? String(localization).split('|')[0].trim() : '';
    if (isSaoPauloCapital(city)) return;
    if (!isBrasilForaSP(city) && !isBrasilForaSP(localization)) return;

    let date = null;
    if (ts) {
      const d = new Date(parseInt(ts, 10) * 1000);
      if (!Number.isNaN(d.getTime())) date = d;
    }
    if (!date) date = parseDateText(dateText);

    const distances = distancesRaw ? distancesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

    events.push({
      title, slug, date, dateText: dateText || '', distances,
      link: link && link.startsWith('http') ? link : link ? `${BASE_URL}${link}` : '',
      organizer: 'Iguana Sports', source: 'iguanasports.com.br', city, hasTime: true,
    });
  });

  return events;
};

const EXCLUDE_KEYWORDS = [
  'mtb', 'mountain bike', 'triatlo', 'triatlon', 'aquabike', 'duatlo',
  'ciclismo', 'bmx', 'velocross', 'skate', 'patins',
];

function isRunningEvent(title) {
  const t = (title || '').toLowerCase();
  return !EXCLUDE_KEYWORDS.some((k) => t.includes(k));
}

function parseDateBR(dateStr, day, month, year) {
  if (day && month && year) {
    const parts = String(month).toLowerCase().slice(0, 3);
    const map = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
    const m = map[parts];
    if (m != null) return new Date(parseInt(year, 10), m, parseInt(day, 10));
  }
  if (dateStr) {
    const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  }
  return null;
}

async function fetchTicketSportsEventsInterior() {
  const API_BASE = 'https://www.ticketsports.com.br';
  const EVENTS_URL = `${API_BASE}/api/events/list`;
  const request = async (params) => {
    const { data } = await axios.get(EVENTS_URL, {
      params,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      timeout: REQUEST_TIMEOUT,
    });
    return Array.isArray(data) ? data : (data && data.data ? data.data : []);
  };

  let list;
  try {
    list = await request({ quantity: '100', atlheteId: '0', term: '', country: 'BR', region: 'SP', city: '', page: '1' });
  } catch (_) {
    list = await request({ country: 'Brasil', state: 'São Paulo', period: '0' });
  }

  return list.filter((ev) => {
    const title = (ev.title || '').trim();
    const address = ev.address || '';
    return title && isRunningEvent(title) && !ev.isVirtualEvent &&
      !/São Paulo\s*,\s*SP/i.test(address) &&
      isBrasilForaSP(address);
  }).map((ev) => {
    const title = (ev.title || '').trim();
    const date = ev.realDate ? new Date(ev.realDate) : parseDateBR(ev.date, ev.day, ev.month, ev.year);
    const addressCity = (ev.address || '').match(/^([^,]+)/);
    const city = addressCity ? addressCity[1].trim() : '';
    return {
      title, date: Number.isNaN(date.getTime()) ? null : date,
      dateText: ev.date || '', distances: [], link: ev.uri || '',
      organizer: (ev.organizer || '').trim(), status: ev.status || '',
      price: ev.price != null ? ev.price : (ev.fullPrice != null ? ev.fullPrice : null),
      fullPrice: ev.fullPrice != null ? ev.fullPrice : null,
      signUpDeadLine: ev.signUpDeadLine || '', city, hasTime: false,
    };
  });
}

let ticketSportsEventsPromiseInterior;
function getTicketSportsEventsInterior() {
  if (!ticketSportsEventsPromiseInterior) ticketSportsEventsPromiseInterior = fetchTicketSportsEventsInterior();
  return ticketSportsEventsPromiseInterior;
}

const ticketsportsScrapeInterior = async () => (await getTicketSportsEventsInterior()).map((event) => ({ ...event, source: 'ticketsports.com.br' }));

const yescomScrapeInterior = async () => {
  const BASE_URL = 'https://www.yescom.com.br';
  const CALENDAR_URLS = [2026, 2027].map((year) => `${BASE_URL}/site/calendarioYescomnovo${year}.html`);
  const events = [];
  const seen = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const url of CALENDAR_URLS) {
    const { data } = await axios.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: REQUEST_TIMEOUT });
    const $ = cheerio.load(data);

    $('.evento-card').each((_, card) => {
      const $card = $(card);
      const $column = $card.closest('.evento-col');
      const title = $card.find('.evento-conteudo > h2').text().replace(/\s+/g, ' ').trim();
      if (!title) return;

      const location = $card.find('.evento-local').text().replace(/\s+/g, ' ').trim();
      const isSP = /•\s*SP\b/i.test(location);
      if (!isSP) return;

      const city = location.replace(/•\s*SP\b/i, '').trim();
      if (isSaoPauloCapital(city) || isSaoPauloCapital(location)) return;
      if (!isBrasilForaSP(city) && !isBrasilForaSP(location)) return;

      const dateText = $card.find('.evento-data').text().replace(/\s+/g, ' ').trim();
      const date = parseDatePT(dateText);
      if (!date || date < today) return;

      const href = $card.find('.evento-botao[href]').attr('href') || '';
      const link = toAbsoluteUrl(BASE_URL, href);
      const statusClass = ($column.attr('class') || '').match(/\b(esgotado|aberto|breve|expo|atencao)\b/i);
      const status = statusClass ? statusClass[1].toLowerCase() : '';
      const key = `${title}|${date.getTime()}`;
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title, date, dateText, distances: [], link,
        organizer: 'Yescom', source: 'yescom.com.br', status, city, hasTime: false,
      });
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const SCRAPERS_INTERIOR = [
  { scrape: iguanaScrapeInterior, SOURCE_NAME: 'iguanasports.com.br' },
  { scrape: ticketsportsScrapeInterior, SOURCE_NAME: 'ticketsports.com.br' },
  { scrape: yescomScrapeInterior, SOURCE_NAME: 'yescom.com.br' },
];

async function scrapeAllInterior() {
  const results = await Promise.all(
    SCRAPERS_INTERIOR.map(async (s) => {
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

function toAbsoluteUrl(base, href) {
  if (!href) return '';
  try { return new URL(href, base).href; } catch (_) { return ''; }
}

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

module.exports = { scrapeAllInterior, SCRAPERS_INTERIOR, iguanaScrapeInterior, ticketsportsScrapeInterior, yescomScrapeInterior };