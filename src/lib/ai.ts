// AI deal rating. Sends the facts on a record to Anthropic's Claude API with the
// user's own key and gets back a structured rating. Called straight from the browser,
// so the key never leaves this machine except in the request to api.anthropic.com.
import { loadDemographics, type Share } from './census';

export const AI_MODEL = 'claude-opus-5-5';

export interface Rating {
  score: number;
  grade: string;
  verdict: string;
  opportunity: number;
  motivation: number;
  risk: number;
  confidence: string;
  strengths: string[];
  risks: string[];
  missing: string[];
  strategy: string;
  model: string;
  at: string;
}

const five = { type: 'integer', minimum: 1, maximum: 5 };
const list = (description: string) => ({ type: 'array', items: { type: 'string' }, description });
const TOOL = {
  name: 'rate_property',
  description: 'Record the investment rating for the property.',
  input_schema: {
    type: 'object',
    required: ['score', 'grade', 'verdict', 'opportunity', 'motivation', 'risk', 'confidence', 'strengths', 'risks', 'missing', 'strategy'],
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100, description: 'Overall attractiveness as an investment lead; 50 is an ordinary property with nothing notable.' },
      grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
      verdict: { type: 'string', description: 'One or two sentences a busy investor can act on.' },
      opportunity: { ...five, description: 'Financial upside: equity, price against value, rental yield. 5 is best.' },
      motivation: { ...five, description: 'How likely the owner is to sell at a discount, from distress and ownership signals. 5 is most likely.' },
      risk: { ...five, description: 'Risk to a buyer: title clouds, liens, foreclosure timing, thin data. 5 is riskiest.' },
      confidence: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'How well the supplied facts support the rating.' },
      strengths: list('Up to five points in favour, each citing a supplied fact.'),
      risks: list('Up to five points against, each citing a supplied fact.'),
      missing: list('Facts that were not supplied and would change the rating most.'),
      strategy: { type: 'string', description: 'The exit strategy that fits best (for example wholesale, fix and flip, buy and hold, pass) and why, in one or two sentences.' },
    },
  },
};

const SYSTEM = `You are a real-estate investment analyst rating one property as an acquisition lead for an investor.
Use only the facts supplied. Never invent figures, and treat null or absent fields as unknown rather than as zero or "no".
When important facts are missing (mortgage balance, liens, condition, sale history), lower your confidence and list them under "missing" instead of assuming.
Neighbourhood figures describe the surrounding area's housing market, not the owner. Do not base any part of the rating on who lives in the area.
Assessor values are for taxation and usually run below market value.`;

const shares = (rows: Share[]) => {
  const total = rows.reduce((s, r) => s + r[1], 0) || 1;
  return Object.fromEntries(rows.map(([k, n]) => [k, `${((n / total) * 100).toFixed(0)}%`]));
};

// Housing-market context for the prompt. Limited to market indicators on purpose.
export async function areaContext(lat: number, lng: number) {
  try {
    const d = await loadDemographics(lat, lng, 1);
    return { area: 'within 1 mile', population: d.population, medianHouseholdIncome: d.medianIncome, tenure: shares(d.tenure), housingTypes: shares(d.housing), employment: shares(d.employment) };
  } catch {
    return null;
  }
}

export async function rateProperty(facts: unknown, key: string): Promise<Rating> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: `Rate this property.\n\n${JSON.stringify(facts, null, 1)}` }],
    }),
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('The Anthropic API key was rejected. Check it under Account.');
  if (res.status === 429) throw new Error('The Anthropic API rate limit was reached. Try again in a minute.');
  if (!res.ok) throw new Error(data?.error?.message ?? `AI rating request failed (${res.status}).`);
  const out = (data?.content ?? []).find((b: { type: string }) => b.type === 'tool_use')?.input;
  if (!out || typeof out.score !== 'number') throw new Error(data?.stop_reason === 'refusal' ? 'The model declined to rate this record.' : 'The model did not return a rating. Try again.');
  const clamp = (n: unknown) => Math.max(1, Math.min(5, Math.round(Number(n) || 1)));
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 6) : []);
  return {
    score: Math.max(0, Math.min(100, Math.round(out.score))),
    grade: String(out.grade ?? ''),
    verdict: String(out.verdict ?? ''),
    opportunity: clamp(out.opportunity),
    motivation: clamp(out.motivation),
    risk: clamp(out.risk),
    confidence: String(out.confidence ?? 'Low'),
    strengths: arr(out.strengths),
    risks: arr(out.risks),
    missing: arr(out.missing),
    strategy: String(out.strategy ?? ''),
    model: String(data.model ?? AI_MODEL),
    at: new Date().toISOString(),
  };
}
