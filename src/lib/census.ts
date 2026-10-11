// Neighbourhood demographics from the US Census Bureau's American Community Survey
// (5-year estimates), for the census tract containing a point or for a radius around it.
// Keyless: tracts are found with the FCC block API (single tract) or the Census TIGERweb
// service (radius), and the tables are read from Esri's public ACS layers.

export type Share = [label: string, count: number];
export interface Demographics {
  area: string;
  tracts: number;
  population: number;
  medianIncome: string | null;
  tenure: Share[];
  housing: Share[];
  income: Share[];
  employment: Share[];
  household: Share[];
  age: Share[];
  education: Share[];
  commute: Share[];
}

const ACS = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services';
type Row = Record<string, number | string | null>;

const TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query';
export const RADII = [1, 3, 5];
const TABLES = ['ACS_Total_Population_Boundaries', 'ACS_Household_Income_Distribution_Boundaries', 'ACS_Median_Income_by_Race_and_Age_Selp_Emp_Boundaries', 'ACS_Housing_Units_in_Structure_Boundaries', 'ACS_Housing_Tenure_by_Heating_Fuel_Boundaries', 'ACS_Educational_Attainment_Boundaries', 'ACS_Employment_Status_Boundaries', 'ACS_Household_Size_Boundaries', 'ACS_Means_of_Transportation_to_Work_Boundaries'];

// One table for a set of tracts, summed with each tract's weight (1 for a single tract).
async function table(name: string, weights: Map<string, number>): Promise<Row> {
  const ids = [...weights.keys()];
  const chunks: string[][] = [];
  // The layers return at most 50 rows per request.
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  const pages = await Promise.all(
    chunks.map(async (chunk) => {
      // Filtering on GEOID is indexed and fast; a spatial query on these layers takes close to a minute.
      const body = new URLSearchParams({ where: `GEOID IN (${chunk.map((g) => `'${g}'`).join(',')})`, outFields: '*', returnGeometry: 'false', f: 'json' });
      const data = await (await fetch(`${ACS}/${name}/FeatureServer/2/query`, { method: 'POST', body })).json();
      return (data.features ?? []).map((f: { attributes: Row }) => f.attributes) as Row[];
    }),
  );
  const rows = pages.flat();
  if (!rows.length) throw new Error('No census data for this area.');
  if (rows.length === 1 && weights.get(String(rows[0].GEOID)) === 1) return rows[0];
  const sum: Row = {};
  for (const row of rows) {
    const w = weights.get(String(row.GEOID)) ?? 0;
    for (const [k, val] of Object.entries(row)) if (typeof val === 'number') sum[k] = (Number(sum[k]) || 0) + val * w;
  }
  return sum;
}

type Ring = [number, number][];
function inside(rings: Ring[], x: number, y: number) {
  let hit = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  return hit;
}

// Tracts touching the circle, each weighted by the share of its area inside it. Census
// figures are published per tract, so this assumes people are spread evenly within one.
async function tractsWithin(lat: number, lng: number, miles: number): Promise<Map<string, number>> {
  const q = new URLSearchParams({ geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', distance: String(miles), units: 'esriSRUnit_StatuteMile', outFields: 'GEOID', returnGeometry: 'true', outSR: '4326', maxAllowableOffset: '0.0003', geometryPrecision: '5', f: 'json' });
  const data = await (await fetch(`${TIGER}?${q}`)).json();
  const features: { attributes: { GEOID: string }; geometry?: { rings: Ring[] } }[] = data.features ?? [];
  if (!features.length) throw new Error('This location is outside US census coverage.');
  const milesPerLng = 69.17 * Math.cos((lat * Math.PI) / 180);
  const near = (x: number, y: number) => Math.hypot((x - lng) * milesPerLng, (y - lat) * 69.05) <= miles;
  const weights = new Map<string, number>();
  const STEPS = 40;
  for (const f of features) {
    const rings = f.geometry?.rings ?? [];
    const xs = rings.flat().map((p) => p[0]);
    const ys = rings.flat().map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let land = 0;
    let both = 0;
    for (let i = 0; i < STEPS; i++)
      for (let j = 0; j < STEPS; j++) {
        const x = x0 + ((i + 0.5) / STEPS) * (x1 - x0);
        const y = y0 + ((j + 0.5) / STEPS) * (y1 - y0);
        if (!inside(rings, x, y)) continue;
        land++;
        if (near(x, y)) both++;
      }
    if (both) weights.set(f.attributes.GEOID, both / land);
  }
  if (!weights.size) throw new Error('No census tracts overlap this radius.');
  return weights;
}

// Median of a bracketed distribution, by linear interpolation inside the median bracket.
const INCOME_EDGES = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100, 125, 150, 200].map((k) => k * 1000);
function bracketMedian(counts: number[]): string | null {
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return null;
  let seen = 0;
  for (let i = 0; i < counts.length; i++) {
    if (seen + counts[i] >= total / 2) {
      if (i === counts.length - 1) return '$200,000 or more';
      const at = INCOME_EDGES[i] + ((total / 2 - seen) / counts[i]) * (INCOME_EDGES[i + 1] - INCOME_EDGES[i]);
      return `about $${(Math.round(at / 1000) * 1000).toLocaleString()}`;
    }
    seen += counts[i];
  }
  return null;
}

const cache = new Map<string, Demographics>();

// `radius` is in miles; 0 means the single census tract containing the point.
export async function loadDemographics(lat: number, lng: number, radius = 0): Promise<Demographics> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`;
  if (cache.has(key)) return cache.get(key)!;
  let weights: Map<string, number>;
  let place = '';
  if (radius) weights = await tractsWithin(lat, lng, radius);
  else {
    const fcc = await (await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&censusYear=2020&format=json`)).json();
    const geoid: string | undefined = fcc.Block?.FIPS?.slice(0, 11);
    if (!geoid) throw new Error('This location is outside US census coverage.');
    weights = new Map([[geoid, 1]]);
    place = `, ${fcc.County?.name ?? ''}, ${fcc.State?.code ?? ''}`;
  }

  const [pop, inc, med, units, tenure, edu, emp, size, commute] = await Promise.all(TABLES.map((t) => table(t, weights)));
  const n = (row: Row, key: string) => Math.round(Number(row[key]) || 0);
  const v = (row: Row, prefix: string, ...ids: number[]) => ids.reduce((s, i) => s + n(row, `${prefix}_${String(i).padStart(3, '0')}E`), 0);
  // B01001 lists males in 003-025 and females 24 rows later.
  const age = (...ids: number[]) => v(pop, 'B01001', ...ids, ...ids.map((i) => i + 24));

  const d: Demographics = {
    area: radius ? `a ${radius}-mile radius` : `${pop.NAME ?? 'Census tract'}${place}`,
    tracts: weights.size,
    population: v(pop, 'B01001', 1),
    medianIncome: radius ? bracketMedian(Array.from({ length: 16 }, (_, i) => v(inc, 'B19001', i + 2))) : n(med, 'B19049_001E') > 0 ? `$${n(med, 'B19049_001E').toLocaleString()}` : null,
    tenure: [['Owner occupied', v(tenure, 'B25117', 2)], ['Renter occupied', v(tenure, 'B25117', 12)]],
    housing: [['Single detached', v(units, 'B25024', 2)], ['Single attached', v(units, 'B25024', 3)], ['2–4 units', v(units, 'B25024', 4, 5)], ['5–19 units', v(units, 'B25024', 6, 7)], ['20+ units', v(units, 'B25024', 8, 9)], ['Mobile home / other', v(units, 'B25024', 10, 11)]],
    income: [['Under $25K', v(inc, 'B19001', 2, 3, 4, 5)], ['$25K–$50K', v(inc, 'B19001', 6, 7, 8, 9, 10)], ['$50K–$75K', v(inc, 'B19001', 11, 12)], ['$75K–$100K', v(inc, 'B19001', 13)], ['$100K–$150K', v(inc, 'B19001', 14, 15)], ['$150K–$200K', v(inc, 'B19001', 16)], ['$200K or more', v(inc, 'B19001', 17)]],
    employment: [['Employed', v(emp, 'B23025', 4)], ['Unemployed', v(emp, 'B23025', 5)]],
    household: [['1 person', n(size, 'B25009_calc_num1pE')], ['2 people', n(size, 'B25009_calc_num2pE')], ['3 people', n(size, 'B25009_calc_num3pE')], ['4 people', n(size, 'B25009_calc_num4pE')], ['5 people', n(size, 'B25009_calc_num5pE')], ['6 or more', n(size, 'B25009_calc_num6pE') + n(size, 'B25009_calc_numGE7pE')]],
    age: [['0–9', age(3, 4)], ['10–19', age(5, 6, 7)], ['20–29', age(8, 9, 10, 11)], ['30–39', age(12, 13)], ['40–49', age(14, 15)], ['50–59', age(16, 17)], ['60–69', age(18, 19, 20, 21)], ['70–79', age(22, 23)], ['80+', age(24, 25)]],
    education: [['Did not finish high school', n(edu, 'B15002_calc_numLTHSE')], ['High school', n(edu, 'B15002_calc_numHSE')], ['Some college, no degree', n(edu, 'B15002_calc_numSomeCollE')], ["Associate's degree", n(edu, 'B15002_calc_numAAE')], ["Bachelor's degree or higher", n(edu, 'B15002_calc_numGEBAE')]],
    commute: [['Drive alone', v(commute, 'B08301', 3)], ['Carpool', v(commute, 'B08301', 4)], ['Public transit', v(commute, 'B08301', 10)], ['Walk or bike', v(commute, 'B08301', 18, 19)], ['Work from home', v(commute, 'B08301', 21)], ['Other', v(commute, 'B08301', 16, 17, 20)]],
  };
  cache.set(key, d);
  return d;
}
