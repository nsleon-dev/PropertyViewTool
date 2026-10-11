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

Clicking a spot on the map (or searching a street address) reads the assessor's public parcel record
for that lot directly from county / state GIS services: owner of record, mailing address, parcel ID,
legal description, assessed values, zoning and lot size, plus the parcel boundary. No key is needed.

Coverage is the list in `src/lib/parcels.ts` (currently West Fargo and Cass County ND, Maricopa County AZ,
Franklin County OH, and North Carolina statewide). To add an area, find its public ArcGIS parcel layer
and add one line with its URL and bounding box. Fields vary by county; whatever the layer publishes is shown.

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
