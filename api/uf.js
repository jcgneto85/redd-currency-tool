export default async function handler(req, res) {
  const sourceUrl = 'https://www.bcentral.cl/en/inicio';

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; REDD-Currency-Converter/1.0)'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `BCCh returned HTTP ${response.status}` });
    }

    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ');

    // The BCCh homepage presents the indicator as "UF $41.194,55".
    const ufMatch = text.match(/\bUF\b[\s\S]{0,180}?\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2})/i);
    if (!ufMatch) {
      return res.status(502).json({ error: 'UF value was not found on the BCCh homepage' });
    }

    const ufClp = Number(ufMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(ufClp)) {
      return res.status(502).json({ error: 'UF value returned by BCCh could not be parsed' });
    }

    const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{1,2}),\s+([0-9]{4})\b/i);
    let date = null;
    if (dateMatch) {
      const months = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
      };
      date = `${dateMatch[3]}-${months[dateMatch[1].toLowerCase()]}-${String(dateMatch[2]).padStart(2, '0')}`;
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ ufClp, date, source: sourceUrl });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not load UF from BCCh' });
  }
}
