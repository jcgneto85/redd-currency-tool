function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseClpNumber(raw) {
  if (!raw) return NaN;
  const s = raw.trim();
  // BCCh Spanish style: 41.194,55. Also tolerate 41,194.55.
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s)) {
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(s)) {
    return Number(s.replace(/,/g, ''));
  }
  return Number(s.replace(',', '.'));
}

async function getText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; REDD-Currency-Converter/1.1)',
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return cleanText(await response.text());
}

function parseIndicators(text) {
  // Official BCCh daily indicators page: "Unidad de fomento (UF) 41.194,55"
  const m = text.match(/Unidad\s+de\s+fomento\s*\(UF\)[\s\S]{0,120}?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2})/i);
  if (!m) return null;
  const value = parseClpNumber(m[1]);
  return Number.isFinite(value) ? value : null;
}

function parseBde(text) {
  // BDE series page contains recent observations, e.g. "21-oct-2026 41.194,55".
  const matches = [...text.matchAll(/(\d{1,2})[-.\s](ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*[-.\s](\d{4})[\s\S]{0,40}?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2})/gi)];
  if (!matches.length) return null;

  const monthMap = {ene:1,jan:1,feb:2,mar:3,abr:4,apr:4,may:5,jun:6,jul:7,ago:8,aug:8,sep:9,oct:10,nov:11,dic:12,dec:12};
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const parsed = matches.map(m => {
    const month = monthMap[m[2].slice(0,3).toLowerCase()];
    const ts = Date.UTC(Number(m[3]), month - 1, Number(m[1]));
    return { ts, date: `${m[3]}-${String(month).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`, value: parseClpNumber(m[4]) };
  }).filter(x => Number.isFinite(x.value) && x.ts <= todayUtc).sort((a,b) => b.ts-a.ts);
  return parsed[0] || null;
}

export default async function handler(req, res) {
  const indicatorsUrl = 'https://si3.bcentral.cl/indicadoressiete/secure/indicadoresdiarios.aspx';
  const bdeUrl = 'https://si3.bcentral.cl/Bdemovil/BDE/Series/MOV_ID_IR1';

  try {
    try {
      const text = await getText(indicatorsUrl);
      const ufClp = parseIndicators(text);
      if (Number.isFinite(ufClp)) {
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
        return res.status(200).json({ ufClp, date: null, source: indicatorsUrl, sourceType: 'BCCh daily indicators' });
      }
    } catch (_) {}

    try {
      const text = await getText(bdeUrl);
      const row = parseBde(text);
      if (row && Number.isFinite(row.value)) {
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
        return res.status(200).json({ ufClp: row.value, date: row.date, source: bdeUrl, sourceType: 'BCCh BDE series F073.UFF.PRE.Z.D' });
      }
    } catch (_) {}

    return res.status(502).json({ error: 'UF value could not be read from BCCh official daily indicators or BDE series' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not load UF from BCCh' });
  }
}
