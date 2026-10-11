// Holds the RentCast key so it never reaches the browser. Forwards only the three
// read-only endpoints the app uses, only for the allowed sites, and (if ACCESS_CODE is
// set) only for callers who send that code.
// Secrets: RENTCAST_API_KEY (required), ACCESS_CODE (optional).
const PATHS = /^\/(properties|avm\/value|avm\/rent\/long-term)$/;

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());
    const origin = req.headers.get('Origin') ?? '';
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0], 'Access-Control-Allow-Headers': 'x-access-code', 'Access-Control-Allow-Methods': 'GET', Vary: 'Origin' };
    const reply = (status, body) => new Response(body, { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed.includes(origin)) return reply(403, '{"error":"origin not allowed"}');
    if (env.ACCESS_CODE && req.headers.get('X-Access-Code') !== env.ACCESS_CODE) return reply(401, '{"error":"access code required"}');
    const url = new URL(req.url);
    if (req.method !== 'GET' || !PATHS.test(url.pathname)) return reply(404, '{"error":"not found"}');
    const res = await fetch(`https://api.rentcast.io/v1${url.pathname}${url.search}`, { headers: { 'X-Api-Key': env.RENTCAST_API_KEY, Accept: 'application/json' } });
    return reply(res.status, res.body);
  },
};
