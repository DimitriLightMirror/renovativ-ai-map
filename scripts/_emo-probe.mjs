// Quick EMOData auth probe — prints ONLY http status + response status + counts.
// Never prints credentials or full payloads.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const user = env.EMO_USER, pass = env.EMO_PASS;
if (!user || !pass) { console.log('MISSING_CREDENTIALS'); process.exit(1); }
const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
const BASE = 'https://emoweb.dk/EMOData/EMOData.svc';

async function probe(name, url) {
  try {
    const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
    const txt = await r.text();
    let summary = '';
    try {
      const j = JSON.parse(txt);
      summary = `status=${j?.ResponseStatus?.Status} n=${j?.SearchResults?.length ?? 'n/a'}`;
      const s = j?.SearchResults?.[0];
      if (s) summary += ` first={lat:${s.Wgs84Latitude},lng:${s.Wgs84Longitude},label:${s.EnergyLabelClassification},yr:${s.YearOfConstruction},id:${s.EntityIdentifier},heat:${s.HeatSupply}}`;
    } catch { summary = `body[0:120]=${txt.slice(0, 120).replace(/\s+/g, ' ')}`; }
    console.log(`${name}: http=${r.status} ${summary}`);
  } catch (e) {
    console.log(`${name}: FETCH_ERROR ${e.message}`);
  }
}

await probe('Ping', `${BASE}/Ping`);
// Small bbox: a single block in Frederiksberg (matches the user's saved sample)
await probe(
  'Area-small',
  `${BASE}/GetEnergyLabelInArea?coordinateX1=55.6845&coordinateY1=12.5530&coordinateX2=55.6825&coordinateY2=12.5560&pageNumber=1&pageSize=100`
);
