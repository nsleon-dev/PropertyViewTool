# PropertyView

A real-estate lead generation, comping and marketing tool: map search with filters and lead lists, property
detail with comparables, marketing lists, skip tracing, campaigns, a list automator, and investment calculators.

## Live site

https://nsleon-dev.github.io/PropertyViewTool/ — built and published by `.github/workflows/deploy.yml` on every
push to `main`. The site is static: API keys and saved data live only in each visitor's browser, and nothing
from `.env.local` is used by the published build.

## Built-in keys

So visitors do not have to enter keys, and the keys are not shown on the Account page:

- **Google Maps**: `gh secret set GOOGLE_MAPS_API_KEY`, then re-run the deploy. A Maps key is always readable
  in the page's script, so restrict it in Google Cloud to `https://nsleon-dev.github.io/*` and to the Maps
  JavaScript and Geocoding APIs.
- **RentCast**: the key must not reach the browser. Deploy `worker/` to Cloudflare Workers (free):
  `cd worker && npx wrangler deploy`, `npx wrangler secret put RENTCAST_API_KEY`, optionally
  `npx wrangler secret put ACCESS_CODE`, then `gh variable set RENTCAST_PROXY_URL --body https://<worker-url>`
  and re-run the deploy. Without an access code, anyone using the site can spend the RentCast quota.

## Sign-in

Optional. With a Firebase project the site shows a sign-in screen (Google, or email and password with a
verification email) and the RentCast worker only serves signed-in users.

1. Firebase console > Authentication: enable **Google** and **Email/Password**; under Settings > Authorised
   domains add `nsleon-dev.github.io`.
2. `gh variable set FIREBASE_API_KEY --body <apiKey>` and `gh variable set FIREBASE_PROJECT_ID --body <projectId>`
   (from Project settings > Your apps > Web app), then re-run the deploy.
3. In `worker/wrangler.toml` set `FIREBASE_PROJECT_ID` (and optionally `ALLOWED_EMAILS`, comma-separated, to
   limit property-data lookups to approved people), then `npx wrangler deploy`.

Saved lists, notes and starred properties stay in the browser, kept separately per account.

## Run

Requires Node 18+.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
```

## Google Maps and live property lookups

The map uses Google Maps when a key is present and falls back to OpenStreetMap when it is not.
Enter keys in the app under **Account > Map & Data Keys**, or copy `.env.example` to `.env.local`.

- **Google Maps API key** – enable *Maps JavaScript API* and *Geocoding API* on a billing-enabled Google Cloud project.
- **RentCast API key** (optional) – lets a click anywhere on the map pull the real public record for that
  address. Requests go straight from the browser to `api.rentcast.io`, so no server is needed.

## Public parcel records

Clicking a lot (or searching an address) reads the free public parcel record for it, keyless
(`src/lib/parcels.ts`). Sources are a few county assessor layers plus statewide layers published by state GIS
offices for 31 states: AK, AR, CA, CO, CT, DE, FL, IA, ID, IN, MA, MD, ME, MN, MT, NC, ND, NE, NH, NJ, NV, NY,
OH, RI, UT, VA, VT, WA, WI, WV, WY. Content varies by state: some carry owner and values, some only the parcel
number and boundary, and a few cover only participating counties. No free statewide layer was found for the
other states; add a county layer to `SOURCES` to cover one.

The right-hand panel on the Search page lists the real parcels in the map view once zoomed to street level
(zoom 16+), from the same sources.

Searching an address or clicking a lot swaps that panel for the property's summary card and a **Nearby**
table (beds, baths, assessed value, last sale) loaded with one RentCast radius request; addresses open the
full tabbed view as a pop-up.

**Draw Area** / **Radius** on the map set a search perimeter (`src/lib/area.ts`). Tiles above the map count
the real parcels inside it by category, worked out from the public record: Bank Owned and Company Owned
(owner name), Absentee Owners (mailing address differs), Vacant Land (no improvement value). MLS loads
RentCast for-sale listings (one request). Pre-Foreclosures, Auctions, Cash Buyers, Liens and High Equity
are shown greyed: they need recorded mortgage and foreclosure data, which has no free source.

Every US location also gets **Location Facts** (`src/lib/place.ts`): FEMA flood zone, city, county, school
district (Census TIGERweb) and elevation (USGS).

## Property view

`/property/:id` (sample records) and `/lookup?lat=&lng=&address=` (any real address) share one layout:
summary cards (Value, Mortgage & Debt, Opportunity) and tabs for details, MLS, comparables, intelligence,
demographics, tax, mortgage/transactions and documents. Real addresses show only what their sources publish.

- **Demographics** are real for every location: US Census ACS 5-year tables, read keylessly
  (`src/lib/census.ts`), for the property's census tract or a 1, 3 or 5 mile radius. A radius blends every
  tract it touches by the share of the tract's area inside the circle, and estimates median income from the
  blended income brackets.
- **AI Deal Rating** (Intelligence tab) sends the record's facts, without owner names or contact details, to
  Claude with your Anthropic API key (Account, or `VITE_ANTHROPIC_API_KEY`) and stores the returned rating in
  the browser. The model is set in `src/lib/ai.ts`.
- **Foreclosure Factor** is a rule-based score (`src/lib/insight.ts`), not a trained model.
- Property-condition grading, listing photos and mortgage records for real addresses have no free source.

## Data

The app ships with 9,800 **synthetic** property records across seven counties (Maricopa AZ, Dallas TX,
Fulton GA, Clark NV, Franklin OH, Orange FL, Mecklenburg NC). Owners, values, liens, phone numbers and
emails are generated and fictional; map pins are placed near real ZIP centroids, not on real parcels.

To use real records, replace `allProperties()` in `src/lib/data.ts` with a call to a licensed data provider
and map its response onto the `Property` interface. Filters, lead lists, comps and exports all read from
that interface. `skipTraceLookup()` in the same file is the hook for a real skip-tracing provider.

## Where things live

- `src/lib/data.ts` – `Property` model and dataset
- `src/lib/filters.ts` – filter definitions, lead lists, search, plain-language query parser
- `src/lib/store.ts` – saved state (lists, contacts, campaigns, wallet), persisted to `localStorage`
- `src/lib/actions.ts` – skip trace and list automator
- `src/pages/` – one file per screen

There is no backend: everything a user saves stays in their browser.
