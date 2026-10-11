// AI deal rating. Sends the facts on a record to Claude and gets back a structured
// rating. On the hosted site the request goes through the site's own server, which
// holds the API key and checks the caller is signed in; with a personal key entered
// under Account it goes straight from this browser to api.anthropic.com.
import Anthropic from '@anthropic-ai/sdk';
import { idToken } from './auth';
import { loadDemographics, type Share } from './census';
import { RENTCAST_PROXY } from './store';

// The smallest current model: a rating is a short, structured judgement, and forcing
// the tool call below skips the model's thinking step, so each rating costs few tokens.
export const AI_MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 1200;

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
const TOOL: Anthropic.Tool = {
  name: 'rate_property',
  description: 'Record the investment rating for the property.',
  input_schema: {
    type: 'object',
    required: ['score', 'grade', 'verdict', 'opportunity', 'motivation', 'risk', 'confidence', 'strengths', 'risks', 'missing', 'strategy'],
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100, description: 'Overall attractiveness as an investment lead; 50 is an ordinary property with nothing notable.' },
      grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
      verdict: { type: 'string', description: 'One sentence a busy investor can act on.' },
      opportunity: { ...five, description: 'Financial upside: equity, price against value, rental yield. 5 is best.' },
      motivation: { ...five, description: 'How likely the owner is to sell at a discount, from distress and ownership signals. 5 is most likely.' },
      risk: { ...five, description: 'Risk to a buyer: title clouds, liens, foreclosure timing, thin data. 5 is riskiest.' },
      confidence: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'How well the supplied facts support the rating.' },
      strengths: list('Up to three short points in favour, each citing a supplied fact.'),
      risks: list('Up to three short points against, each citing a supplied fact.'),
      missing: list('Up to three facts that were not supplied and would change the rating most.'),
      strategy: { type: 'string', description: 'The exit strategy that fits best (for example wholesale, fix and flip, buy and hold, pass) and why, in one sentence.' },
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

// Empty and unknown fields are dropped so they are not paid for as input tokens.
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => [k, compact(v)]));
  return value;
}

async function client(key: string): Promise<Anthropic> {
  if (key !== 'proxy') return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1 });
  const token = await idToken();
  return new Anthropic({ apiKey: 'held-by-server', baseURL: `${RENTCAST_PROXY}/ai`, defaultHeaders: token ? { Authorization: `Bearer ${token}` } : {}, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

export async function rateProperty(facts: unknown, key: string): Promise<Rating> {
  let message: Anthropic.Message;
  try {
    message = await (await client(key)).messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: `Rate this property.\n${JSON.stringify(compact(facts))}` }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error(key === 'proxy' ? 'Sign in again to use the AI rating.' : 'The Anthropic API key was rejected. Check it under Account.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('Your account has not been approved for the AI rating yet.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('The AI rating limit was reached. Try again in a minute.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('The AI service could not be reached. Check your connection.');
    if (e instanceof Anthropic.APIError) throw new Error((e.error as { error?: { message?: string } } | undefined)?.error?.message ?? `AI rating request failed (${e.status}).`);
    throw e;
  }
  if (message.stop_reason === 'refusal') throw new Error('The model declined to rate this record.');
  const call = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  const out = call?.input as Record<string, unknown> | undefined;
  if (!out || typeof out.score !== 'number') throw new Error(message.stop_reason === 'max_tokens' ? 'The rating was cut short. Try again.' : 'The model did not return a rating. Try again.');
  const clamp = (n: unknown) => Math.max(1, Math.min(5, Math.round(Number(n) || 1)));
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 4) : []);
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
    model: message.model,
    at: new Date().toISOString(),
  };
}
