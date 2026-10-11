// Property dataset. The records here are synthetic: generated deterministically
// from a seed so ids, owners and values are stable between sessions. To plug in a
// licensed data source, replace `allProperties()` with a call to that provider and
// map its records onto the `Property` shape.

export interface Loan {
  position: number;
  amount: number;
  date: string;
  rate: number;
  type: string;
  lender: string;
  term: number;
  balance: number;
}
export interface Lien {
  type: string;
  amount: number;
  date: string;
  holder: string;
}
export interface Sale {
  date: string;
  price: number;
  buyer: string;
  seller: string;
  docType: string;
  cash: boolean;
}
export type Occupancy = 'Owner Occupied' | 'Absentee In-State' | 'Absentee Out-of-State';

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  lat: number;
  lng: number;
  apn: string;
  subdivision: string;
  type: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  stories: number;
  garage: number;
  units: number;
  pool: boolean;
  hoa: boolean;
  ownerName: string;
  owner2: string | null;
  ownerType: string;
  occupancy: Occupancy;
  mailAddress: string;
  mailCity: string;
  mailState: string;
  mailZip: string;
  yearsOwned: number;
  ownerAge: number | null;
  propsOwned: number;
  deceased: boolean;
  estValue: number;
  rentEst: number;
  assessed: number;
  taxAmount: number;
  taxDelinquent: boolean;
  taxDelinquentYear: number | null;
  taxDelinquentAmt: number;
  sales: Sale[];
  lastSaleDate: string;
  lastSalePrice: number;
  cashBuyer: boolean;
  flipped: boolean;
  loans: Loan[];
  mortgageBalance: number;
  equity: number;
  equityPct: number;
  ltv: number;
  mlsStatus: string;
  listPrice: number | null;
  listDate: string | null;
  dom: number | null;
  agent: string | null;
  fcStatus: string;
  fcDate: string | null;
  auctionDate: string | null;
  defaultAmt: number | null;
  openingBid: number | null;
  liens: Lien[];
  lienAmount: number;
  bankruptcy: string | null;
  bankruptcyDate: string | null;
  divorceDate: string | null;
  vacant: boolean;
}

export const REF = Date.UTC(2026, 9, 1);
const DAY = 86400000;

interface Cluster {
  city: string;
  zip: string;
  lat: number;
  lng: number;
  f: number;
}
interface Market {
  county: string;
  state: string;
  ppsf: number;
  clusters: Cluster[];
}

const c = (city: string, zip: string, lat: number, lng: number, f = 1): Cluster => ({ city, zip, lat, lng, f });

export const MARKETS: Market[] = [
  {
    county: 'Maricopa', state: 'AZ', ppsf: 290,
    clusters: [c('Phoenix', '85008', 33.463, -111.985, 0.85), c('Phoenix', '85016', 33.505, -112.03, 1.25), c('Scottsdale', '85251', 33.494, -111.92, 1.5), c('Tempe', '85281', 33.427, -111.93, 1.05), c('Mesa', '85201', 33.433, -111.85, 0.85), c('Chandler', '85224', 33.32, -111.875, 1.05), c('Glendale', '85301', 33.532, -112.178, 0.75), c('Gilbert', '85233', 33.35, -111.81, 1.1)],
  },
  {
    county: 'Dallas', state: 'TX', ppsf: 220,
    clusters: [c('Dallas', '75204', 32.802, -96.789, 1.5), c('Dallas', '75218', 32.842, -96.7, 1.2), c('Irving', '75060', 32.803, -96.955, 0.85), c('Garland', '75040', 32.928, -96.62, 0.8), c('Mesquite', '75149', 32.767, -96.61, 0.7), c('Richardson', '75080', 32.972, -96.745, 1.1), c('Grand Prairie', '75050', 32.77, -97.01, 0.8), c('Carrollton', '75006', 32.96, -96.89, 0.95)],
  },
  {
    county: 'Fulton', state: 'GA', ppsf: 240,
    clusters: [c('Atlanta', '30306', 33.787, -84.35, 1.6), c('Atlanta', '30310', 33.727, -84.427, 0.8), c('Sandy Springs', '30328', 33.933, -84.385, 1.3), c('Roswell', '30075', 34.045, -84.385, 1.15), c('East Point', '30344', 33.676, -84.455, 0.7), c('Alpharetta', '30004', 34.11, -84.3, 1.25), c('College Park', '30337', 33.643, -84.455, 0.65), c('Atlanta', '30318', 33.792, -84.445, 1.05)],
  },
  {
    county: 'Clark', state: 'NV', ppsf: 270,
    clusters: [c('Las Vegas', '89101', 36.172, -115.122, 0.75), c('Las Vegas', '89117', 36.142, -115.28, 1.1), c('Henderson', '89014', 36.06, -115.055, 1.05), c('North Las Vegas', '89030', 36.212, -115.123, 0.7), c('Las Vegas', '89119', 36.085, -115.145, 0.85), c('Las Vegas', '89147', 36.113, -115.28, 1.0), c('Las Vegas', '89134', 36.205, -115.305, 1.3), c('Las Vegas', '89123', 36.035, -115.15, 1.05)],
  },
  {
    county: 'Franklin', state: 'OH', ppsf: 190,
    clusters: [c('Columbus', '43201', 39.992, -83.0, 1.2), c('Columbus', '43206', 39.942, -82.975, 1.1), c('Columbus', '43224', 40.042, -82.965, 0.7), c('Dublin', '43017', 40.105, -83.13, 1.35), c('Westerville', '43081', 40.11, -82.91, 1.1), c('Grove City', '43123', 39.87, -83.09, 0.9), c('Hilliard', '43026', 40.02, -83.16, 1.05), c('Gahanna', '43230', 40.035, -82.87, 1.0)],
  },
  {
    county: 'Orange', state: 'FL', ppsf: 250,
    clusters: [c('Orlando', '32801', 28.541, -81.373, 1.3), c('Orlando', '32806', 28.513, -81.358, 1.15), c('Orlando', '32822', 28.49, -81.29, 0.8), c('Winter Park', '32789', 28.598, -81.352, 1.6), c('Apopka', '32703', 28.66, -81.5, 0.8), c('Ocoee', '34761', 28.578, -81.535, 0.9), c('Winter Garden', '34787', 28.54, -81.6, 1.1), c('Maitland', '32751', 28.627, -81.365, 1.2)],
  },
  {
    county: 'Mecklenburg', state: 'NC', ppsf: 245,
    clusters: [c('Charlotte', '28203', 35.208, -80.858, 1.6), c('Charlotte', '28205', 35.22, -80.79, 1.15), c('Charlotte', '28210', 35.13, -80.855, 1.1), c('Charlotte', '28269', 35.335, -80.8, 0.85), c('Matthews', '28105', 35.117, -80.715, 1.0), c('Huntersville', '28078', 35.41, -80.86, 1.05), c('Mint Hill', '28227', 35.18, -80.65, 0.85), c('Pineville', '28134', 35.085, -80.89, 0.9)],
  },
];

const PER_CLUSTER = 175;

const FIRST = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Carlos', 'Karen', 'Daniel', 'Nancy', 'Anthony', 'Maria', 'Mark', 'Sandra', 'Kevin', 'Ashley', 'Brian', 'Donna', 'Luis', 'Angela', 'Wei', 'Priya', 'Omar', 'Hannah', 'Tyrone', 'Latoya', 'Dmitri', 'Yuki'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Nguyen', 'Patel', 'Kim', 'Chen', 'Okafor', 'Kowalski'];
const STREETS = ['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Willow', 'Birch', 'Juniper', 'Magnolia', 'Sycamore', 'Hawthorne', 'Laurel', 'Mesa', 'Canyon', 'Ridge', 'Meadow', 'Prairie', 'Summit', 'Harbor', 'Orchard', 'Sunset', 'Highland', 'Lakeview', 'Park', 'Washington', 'Lincoln', 'Jefferson', 'Madison', 'Franklin', 'Monroe', 'Cypress', 'Aspen', 'Palmetto', 'Dogwood', 'Chestnut', 'Sierra', 'Valley', 'Brookside', 'Fairview', 'Kingston'];
const SUFFIX = ['St', 'Ave', 'Dr', 'Ln', 'Ct', 'Rd', 'Way', 'Pl', 'Blvd', 'Trl'];
const SUBDIV = ['Estates', 'Village', 'Heights', 'Crossing', 'Commons', 'Ranch', 'Terrace', 'Park', 'Glen', 'Pointe'];
const LENDERS = ['First Meridian Bank', 'Summit Home Lending', 'Bluewater Mortgage', 'Keystone Federal Credit Union', 'Northgate Savings', 'Cardinal Home Loans', 'Ironwood Financial', 'Lakeshore Mortgage Co', 'Pioneer Trust Bank', 'Redwood Lending Group'];
const AGENTS = ['Avery Stone', 'Morgan Blake', 'Jordan Reyes', 'Casey Whitfield', 'Riley Tanaka', 'Quinn Delgado', 'Parker Osei', 'Drew Lindqvist'];
const FAR_STATES: [string, string, string][] = [['Los Angeles', 'CA', '90045'], ['Seattle', 'WA', '98115'], ['Chicago', 'IL', '60614'], ['Brooklyn', 'NY', '11215'], ['Boston', 'MA', '02130'], ['Portland', 'OR', '97212'], ['Denver', 'CO', '80211'], ['Miami', 'FL', '33133']];
const TYPES: [string, number][] = [['Single Family', 68], ['Condominium', 9], ['Townhouse', 7], ['Multi-Family (2-4)', 6], ['Apartment (5+)', 2], ['Vacant Land', 5], ['Mobile Home', 2], ['Commercial', 1]];
const LIEN_TYPES = ['HOA Lien', "Mechanic's Lien", 'Federal Tax Lien', 'State Tax Lien', 'Judgment Lien', 'Municipal / Utility Lien'];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const daysAgo = (d: number) => iso(REF - d * DAY);
const round = (n: number, to: number) => Math.round(n / to) * to;

function rateFor(year: number) {
  if (year < 2000) return 7.6;
  if (year < 2009) return 6.1;
  if (year < 2020) return 4.2;
  if (year < 2022) return 3.1;
  if (year < 2023) return 5.4;
  return 6.8;
}

function amortBalance(amount: number, rate: number, termYears: number, monthsElapsed: number) {
  const r = rate / 1200;
  const n = termYears * 12;
  const k = Math.min(monthsElapsed, n);
  const g = Math.pow(1 + r, n);
  return Math.max(0, Math.round((amount * (g - Math.pow(1 + r, k))) / (g - 1)));
}

function generate(): Property[] {
  const rand = mulberry32(20261001);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const chance = (p: number) => rand() < p;
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 1.15;
  const person = () => `${pick(FIRST)} ${pick(LAST)}`;
  const weighted = (items: [string, number][]) => {
    let r = rand() * items.reduce((s, i) => s + i[1], 0);
    for (const [v, w] of items) if ((r -= w) < 0) return v;
    return items[0][0];
  };

  const out: Property[] = [];
  MARKETS.forEach((m, mi) => {
    m.clusters.forEach((cl, ci) => {
      for (let i = 0; i < PER_CLUSTER; i++) {
        const type = weighted(TYPES);
        const land = type === 'Vacant Land';
        const street = `${pick(STREETS)} ${pick(SUFFIX)}`;
        const unit = type === 'Condominium' ? ` #${int(1, 40)}${pick(['A', 'B', 'C', ''])}` : '';
        const address = `${int(100, 9899)} ${pick(['N', 'S', 'E', 'W', '', '', ''])} ${street}`.replace('  ', ' ') + unit;

        const yearBuilt = land ? 0 : Math.min(2025, Math.round(1985 + gauss() * 28));
        const units = type === 'Multi-Family (2-4)' ? int(2, 4) : type === 'Apartment (5+)' ? int(5, 48) : 1;
        let sqft = 0;
        if (!land) {
          const base = type === 'Condominium' ? 1050 : type === 'Townhouse' ? 1500 : type === 'Mobile Home' ? 1100 : type === 'Commercial' ? 5200 : 1900;
          sqft = Math.max(480, round(base * (1 + gauss() * 0.45), 10)) * (units > 1 ? Math.max(1, units * 0.55) : 1);
          sqft = round(sqft, 10);
        }
        const perUnit = units > 1 ? sqft / units : sqft;
        const beds = land || type === 'Commercial' ? 0 : Math.max(1, Math.min(6, Math.round(perUnit / 620 + between(-0.4, 0.6)))) * units;
        const baths = land || type === 'Commercial' ? 0 : Math.max(1, Math.round((beds / units) * between(0.55, 0.9) * (units > 1 ? 1 : 2)) / (units > 1 ? 1 : 2)) * units;
        const lotSqft = land ? round(between(4000, 90000), 100) : type === 'Condominium' ? 0 : round(Math.max(1800, sqft * between(1.8, 5.5)), 50);

        const ppsf = m.ppsf * cl.f * (1 + gauss() * 0.16) * (type === 'Mobile Home' ? 0.45 : type === 'Apartment (5+)' ? 0.75 : 1);
        const estValue = round(land ? lotSqft * between(4, 16) * cl.f : sqft * ppsf, 1000);

        // Ownership
        const reo = chance(0.008);
        const ownerType = reo ? 'Bank / Lender' : weighted([['Individual', 82], ['Corporate / LLC', 11], ['Trust', 7]]);
        const first = pick(FIRST);
        const last = pick(LAST);
        const ownerName = reo ? pick(LENDERS) : ownerType === 'Individual' ? `${first} ${last}` : ownerType === 'Trust' ? `${last} Family Trust` : `${pick([last, pick(STREETS)])} ${pick(['Holdings', 'Properties', 'Capital', 'Investments', 'Homes'])} LLC`;
        const owner2 = ownerType === 'Individual' && chance(0.4) ? `${pick(FIRST)} ${last}` : null;
        const occRoll = rand();
        const occupancy: Occupancy = ownerType !== 'Individual' && ownerType !== 'Trust' ? (chance(0.7) ? 'Absentee In-State' : 'Absentee Out-of-State') : land ? (chance(0.6) ? 'Absentee In-State' : 'Absentee Out-of-State') : occRoll < 0.64 ? 'Owner Occupied' : occRoll < 0.88 ? 'Absentee In-State' : 'Absentee Out-of-State';
        let mailAddress = address, mailCity = cl.city, mailState = m.state, mailZip = cl.zip;
        if (occupancy === 'Absentee In-State') {
          const other = pick(m.clusters);
          mailAddress = `${int(100, 9899)} ${pick(STREETS)} ${pick(SUFFIX)}`;
          mailCity = other.city;
          mailZip = other.zip;
        } else if (occupancy === 'Absentee Out-of-State') {
          const far = pick(FAR_STATES);
          mailAddress = chance(0.2) ? `PO Box ${int(100, 9999)}` : `${int(100, 9899)} ${pick(STREETS)} ${pick(SUFFIX)}`;
          [mailCity, mailState, mailZip] = far;
        }
        const yearsOwned = Math.round(Math.min(45, -Math.log(1 - rand() * 0.98) * 8.5) * 10) / 10;
        const ownerAge = ownerType === 'Individual' ? Math.min(94, Math.round(30 + yearsOwned * 0.9 + between(0, 32))) : null;
        const propsOwned = occupancy === 'Owner Occupied' ? (chance(0.12) ? int(2, 4) : 1) : chance(0.45) ? 1 : int(2, ownerType === 'Corporate / LLC' ? 40 : 12);
        const deceased = ownerType === 'Individual' && chance((ownerAge ?? 0) > 70 ? 0.09 : 0.008);

        // Sales history
        const saleDays = Math.round(yearsOwned * 365) + int(5, 60);
        const lastSaleMs = REF - saleDays * DAY;
        const saleYear = new Date(lastSaleMs).getUTCFullYear();
        const lastSalePrice = round((estValue / Math.pow(1.047, yearsOwned)) * between(0.86, 1.08), 500);
        const cashBuyer = reo ? false : chance(ownerType === 'Corporate / LLC' ? 0.55 : 0.18);
        const flipped = !land && yearsOwned < 1.2 && chance(0.45);
        const prevOwner = person();
        const sales: Sale[] = [{ date: iso(lastSaleMs), price: lastSalePrice, buyer: ownerName, seller: flipped ? `${pick(LAST)} Renovations LLC` : prevOwner, docType: reo ? "Trustee's Deed" : chance(0.85) ? 'Warranty Deed' : 'Grant Deed', cash: cashBuyer }];
        if (flipped) {
          sales.push({ date: iso(lastSaleMs - int(90, 300) * DAY), price: round(lastSalePrice * between(0.55, 0.78), 500), buyer: sales[0].seller, seller: prevOwner, docType: 'Warranty Deed', cash: true });
        } else if (yearBuilt && saleYear - yearBuilt > 6 && chance(0.7)) {
          const gap = between(3, Math.min(18, saleYear - yearBuilt));
          sales.push({ date: iso(lastSaleMs - gap * 365 * DAY), price: round(lastSalePrice / Math.pow(1.045, gap), 500), buyer: prevOwner, seller: person(), docType: 'Warranty Deed', cash: chance(0.15) });
        }

        // Mortgages
        const loans: Loan[] = [];
        if (!cashBuyer && !reo && !(land && chance(0.6))) {
          const refi = yearsOwned > 3 && chance(0.4);
          const origYearsAgo = refi ? between(0.5, yearsOwned - 1) : yearsOwned;
          const origMs = REF - origYearsAgo * 365 * DAY;
          const underwater = yearsOwned < 5 && chance(0.05);
          const basis = refi ? estValue / Math.pow(1.047, origYearsAgo) : lastSalePrice;
          const amount = round(basis * (underwater ? between(1.1, 1.35) : between(0.6, 0.97)), 500);
          const rate = Math.round((rateFor(new Date(origMs).getUTCFullYear()) + between(-0.5, 0.6)) * 1000) / 1000;
          const term = chance(0.85) ? 30 : 15;
          const balance = amortBalance(amount, rate, term, origYearsAgo * 12);
          if (balance > 0) loans.push({ position: 1, amount, date: iso(origMs), rate, type: refi ? 'Refinance' : weighted([['Conventional', 68], ['FHA', 18], ['VA', 9], ['ARM', 5]]), lender: pick(LENDERS), term, balance });
          if (chance(0.09) && yearsOwned > 2) {
            const amt2 = round(estValue * between(0.05, 0.2), 500);
            loans.push({ position: 2, amount: amt2, date: daysAgo(int(60, 1400)), rate: Math.round(between(6.5, 9.5) * 100) / 100, type: 'HELOC', lender: pick(LENDERS), term: 20, balance: round(amt2 * between(0.3, 1), 100) });
          }
        }
        const mortgageBalance = loans.reduce((s, l) => s + l.balance, 0);
        const equity = estValue - mortgageBalance;
        const equityPct = Math.round((equity / estValue) * 100);
        const ltv = Math.round((mortgageBalance / estValue) * 100);

        // Distress
        let vacant = land ? true : chance(occupancy === 'Owner Occupied' ? 0.015 : 0.11) || (reo && chance(0.8));
        const taxDelinquent = chance(occupancy === 'Owner Occupied' ? 0.03 : 0.07);
        const assessed = round(estValue * between(0.7, 0.9), 100);
        const taxAmount = Math.round(assessed * between(0.008, 0.021));
        const liens: Lien[] = [];
        if (chance(0.075)) {
          for (let n = int(1, 2); n > 0; n--) {
            const lt = pick(LIEN_TYPES);
            liens.push({ type: lt, amount: round(between(900, lt.includes('Tax') ? 65000 : 28000), 50), date: daysAgo(int(30, 1500)), holder: lt.includes('Federal') ? 'Internal Revenue Service' : lt.includes('State') ? `${m.state} Dept of Revenue` : lt.includes('HOA') ? `${pick(STREETS)} ${pick(SUBDIV)} HOA` : lt.includes('Municipal') ? `City of ${cl.city}` : `${pick(LAST)} & ${pick(LAST)} LLP` });
          }
        }
        const bankruptcy = ownerType === 'Individual' && chance(0.016) ? pick(['Chapter 7', 'Chapter 13', 'Chapter 13', 'Chapter 11']) : null;
        const divorceDate = ownerType === 'Individual' && owner2 && chance(0.035) ? daysAgo(int(20, 700)) : null;
        let fcStatus = 'None', fcDate: string | null = null, auctionDate: string | null = null, defaultAmt: number | null = null, openingBid: number | null = null;
        if (reo) {
          fcStatus = 'Bank Owned (REO)';
          fcDate = iso(lastSaleMs);
        } else if (mortgageBalance > 0 && chance(taxDelinquent || liens.length ? 0.22 : 0.03)) {
          const auction = chance(0.3);
          fcStatus = auction ? 'Auction' : pick(['Notice of Default', 'Lis Pendens']);
          fcDate = daysAgo(int(10, 240));
          defaultAmt = round(mortgageBalance * between(0.02, 0.09), 50);
          if (auction) {
            auctionDate = iso(REF + int(5, 75) * DAY);
            openingBid = round(mortgageBalance + defaultAmt + between(2000, 9000), 100);
          }
          if (chance(0.3)) vacant = true;
        }

        // MLS
        let mlsStatus = 'Off Market', listPrice: number | null = null, listDate: string | null = null, dom: number | null = null;
        const roll = rand();
        if (saleDays < 300 && chance(0.75)) {
          mlsStatus = 'Sold';
          dom = int(3, 75);
          listPrice = round(lastSalePrice * between(0.97, 1.06), 100);
          listDate = iso(lastSaleMs - (dom + 30) * DAY);
        } else if (roll < 0.045 || (reo && roll < 0.5)) {
          mlsStatus = 'Active';
        } else if (roll < 0.06) {
          mlsStatus = 'Pending';
        } else if (roll < 0.08) {
          mlsStatus = 'Expired';
        } else if (roll < 0.09) {
          mlsStatus = 'Withdrawn';
        } else if (roll < 0.098) {
          mlsStatus = 'Cancelled';
        }
        if (mlsStatus !== 'Off Market' && mlsStatus !== 'Sold') {
          const failed = mlsStatus !== 'Active' && mlsStatus !== 'Pending';
          dom = failed ? int(90, 240) : int(1, 120);
          listDate = daysAgo(dom + (failed ? int(10, 300) : 0));
          listPrice = round(estValue * between(failed ? 1.05 : 0.95, failed ? 1.25 : 1.1), 100);
        }

        const id = `P${mi}${ci}${String(i).padStart(3, '0')}`;
        out.push({
          id, address, city: cl.city, state: m.state, zip: cl.zip, county: m.county,
          lat: cl.lat + gauss() * 0.013, lng: cl.lng + gauss() * 0.015,
          apn: `${100 + mi * 37 + ci}-${String(int(10, 99))}-${String(int(100, 999))}${pick(['A', 'B', ''])}`,
          subdivision: `${pick(STREETS)} ${pick(SUBDIV)}`,
          type, beds, baths, sqft, lotSqft, yearBuilt, units,
          stories: land ? 0 : sqft / units > 2100 && chance(0.7) ? 2 : type === 'Townhouse' ? 2 : 1,
          garage: land || type === 'Condominium' ? 0 : int(0, 3),
          pool: !land && chance(m.state === 'AZ' || m.state === 'FL' || m.state === 'NV' ? 0.3 : 0.08),
          hoa: type === 'Condominium' || type === 'Townhouse' || chance(0.22),
          ownerName, owner2, ownerType, occupancy, mailAddress, mailCity, mailState, mailZip,
          yearsOwned, ownerAge, propsOwned, deceased,
          estValue, rentEst: land ? 0 : round(estValue * between(0.0055, 0.0082), 25), assessed, taxAmount,
          taxDelinquent, taxDelinquentYear: taxDelinquent ? int(2022, 2025) : null, taxDelinquentAmt: taxDelinquent ? Math.round(taxAmount * between(1, 3.4)) : 0,
          sales, lastSaleDate: sales[0].date, lastSalePrice, cashBuyer, flipped,
          loans, mortgageBalance, equity, equityPct, ltv,
          mlsStatus, listPrice, listDate, dom, agent: mlsStatus === 'Off Market' ? null : pick(AGENTS),
          fcStatus, fcDate, auctionDate, defaultAmt, openingBid,
          liens, lienAmount: liens.reduce((s, l) => s + l.amount, 0),
          bankruptcy, bankruptcyDate: bankruptcy ? daysAgo(int(30, 900)) : null, divorceDate, vacant,
        });
      }
    });
  });
  return out;
}

let cache: Property[] | null = null;
let index: Map<string, Property> | null = null;

export function allProperties(): Property[] {
  if (!cache) cache = generate();
  return cache;
}

export function getProperty(id: string): Property | undefined {
  if (!index) index = new Map(allProperties().map((p) => [p.id, p]));
  return index.get(id);
}

export function fullAddress(p: Property) {
  return `${p.address}, ${p.city}, ${p.state} ${p.zip}`;
}

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

// Skip-trace output is also synthetic: 555 exchange numbers and example.com mailboxes.
export interface SkipResult {
  date: string;
  phones: { number: string; type: string; dnc: boolean }[];
  emails: string[];
}

export function skipTraceLookup(p: Property): SkipResult {
  const rand = mulberry32(parseInt(p.id.slice(1), 10) + 7);
  const n = 1 + Math.floor(rand() * 3);
  const phones = Array.from({ length: n }, (_, i) => ({
    number: `(${200 + Math.floor(rand() * 700)}) 555-${String(100 + Math.floor(rand() * 100)).padStart(4, '0')}`,
    type: i === 0 ? 'Mobile' : rand() < 0.5 ? 'Landline' : 'Mobile',
    dnc: rand() < 0.15,
  }));
  const slug = p.ownerName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
  const emails = rand() < 0.8 ? [`${slug}@example.com`] : [];
  return { date: new Date().toISOString().slice(0, 10), phones, emails };
}
