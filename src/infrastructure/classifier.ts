import type { ClassifyResult } from '../domain/messages';
import type { Post } from '../domain/post';
import type { ProviderId } from '../domain/provider';
import { activeKey } from '../domain/settings';
import type { ProviderAdapter } from './jev/provider-adapter';
import { typesafeDirectAdapter } from './jev/typesafe-direct-adapter';
import { vercelGatewayAdapter } from './jev/vercel-gateway-adapter';
import { cachedScores, rememberScores } from './score-cache';
import { loadSettings } from './settings-store';

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  vercel: vercelGatewayAdapter,
  typesafe: typesafeDirectAdapter,
};

let inFlight = 0;
const waiting: Array<() => void> = [];
let rateLimitedUntil = 0;
let rateLimitCooldownMs = 20_000;

function acquire(): Promise<void> {
  if (inFlight < 2) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiting.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function release(): void {
  inFlight -= 1;
  waiting.shift()?.();
}

function stateOf(post: Post): Record<string, unknown> {
  const state: Record<string, unknown> = {
    author: { handle: `@${post.handle}`, name: post.name },
    text: post.text,
  };
  if (post.quotedText) state.quoted = post.quotedText;
  if (post.parent) {
    state.replyingTo = { author: `@${post.parent.handle}`, text: post.parent.text };
  }
  return state;
}

function retryAfterMs(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function coolingDown(): ClassifyResult | null {
  if (Date.now() >= rateLimitedUntil) return null;
  const seconds = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
  return { ok: false, error: 'rate-limited', detail: `cooling down, retry in ${seconds}s` };
}

async function requestScores(
  adapter: ProviderAdapter,
  key: string,
  post: Post,
  questions: Record<string, string>,
): Promise<ClassifyResult> {
  const request = adapter.buildRequest(key, stateOf(post), questions);
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
  });
  if (response.status === 429) {
    const wait = retryAfterMs(response.headers.get('retry-after')) ?? rateLimitCooldownMs;
    rateLimitedUntil = Date.now() + wait;
    rateLimitCooldownMs = Math.min(rateLimitCooldownMs * 2, 300_000);
    return { ok: false, error: 'rate-limited', detail: await response.text() };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, error: 'auth', detail: await response.text() };
  }
  if (!response.ok) {
    return { ok: false, error: 'bad-response', detail: `HTTP ${response.status}` };
  }
  const json: unknown = await response.json();
  const scores = adapter.parseScores(json);
  if (Object.keys(scores).length === 0) {
    return { ok: false, error: 'bad-response', detail: 'no answers in response' };
  }
  rateLimitCooldownMs = 20_000;
  return { ok: true, scores, tokens: adapter.inputTokens(json) };
}

export async function classifyPost(
  post: Post,
  questions: Record<string, string>,
  questionsKey: string,
): Promise<ClassifyResult> {
  const settings = await loadSettings();
  const key = activeKey(settings);
  if (key === '') return { ok: false, error: 'no-key', detail: '' };

  const cached = await cachedScores(post.id, questionsKey);
  if (cached) return { ok: true, scores: cached, tokens: 0 };

  const cooling = coolingDown();
  if (cooling) return cooling;

  await acquire();
  try {
    const queuedBehindLimit = coolingDown();
    if (queuedBehindLimit) return queuedBehindLimit;
    const result = await requestScores(ADAPTERS[settings.provider], key, post, questions);
    if (result.ok) await rememberScores(post.id, questionsKey, result.scores);
    return result;
  } catch (error) {
    return {
      ok: false,
      error: 'network',
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    release();
  }
}
