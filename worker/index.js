// Holds the RentCast key so it never reaches the browser. Forwards only the three
// read-only endpoints the app uses, only for the allowed sites, and only for callers
// who pass the checks that are configured:
//   FIREBASE_PROJECT_ID (var)  - require a signed-in user with a verified email
//   ALLOWED_EMAILS (var)       - comma-separated; if set, only these users
//   ACCESS_CODE (secret)       - a shared code, for deployments without sign-in
// Secret: RENTCAST_API_KEY (required).
const PATHS = /^\/(properties|avm\/value|avm\/rent\/long-term)$/;
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let keys = { at: 0, list: [] };

const decode = (part) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const json = (part) => JSON.parse(new TextDecoder().decode(decode(part)));

// Verifies a Firebase ID token and returns its claims, or null.
async function verify(token, projectId) {
  try {
    const [h, p, s] = token.split('.');
    const header = json(h);
    const claims = json(p);
    const now = Date.now() / 1000;
    if (header.alg !== 'RS256' || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` || claims.exp < now || !claims.sub) return null;
    if (Date.now() - keys.at > 3600e3 || !keys.list.some((k) => k.kid === header.kid)) keys = { at: Date.now(), list: (await (await fetch(JWKS)).json()).keys };
    const jwk = keys.list.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? claims : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());
    const origin = req.headers.get('Origin') ?? '';
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0], 'Access-Control-Allow-Headers': 'x-access-code, authorization', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    const reply = (status, body) => new Response(body, { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed.includes(origin)) return reply(403, '{"error":"origin not allowed"}');

    if (env.FIREBASE_PROJECT_ID) {
      const claims = await verify((req.headers.get('Authorization') ?? '').replace(/^Bearer /, ''), env.FIREBASE_PROJECT_ID);
      if (!claims || !claims.email_verified) return reply(401, '{"error":"sign-in required"}');
      const list = (env.ALLOWED_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      if (list.length && !list.includes(String(claims.email).toLowerCase())) return reply(403, '{"error":"account not approved"}');
    } else if (env.ACCESS_CODE && req.headers.get('X-Access-Code') !== env.ACCESS_CODE) return reply(401, '{"error":"access code required"}');

    const url = new URL(req.url);
    if (req.method !== 'GET' || !PATHS.test(url.pathname)) return reply(404, '{"error":"not found"}');
    const res = await fetch(`https://api.rentcast.io/v1${url.pathname}${url.search}`, { headers: { 'X-Api-Key': env.RENTCAST_API_KEY, Accept: 'application/json' } });
    return reply(res.status, res.body);
  },
};
