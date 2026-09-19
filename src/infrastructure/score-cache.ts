import { isScores, type Scores } from '../domain/verdict';

function cacheKey(postId: string, questionsKey: string): string {
  return `anyfilter.scores.${questionsKey}.${postId}`;
}

export async function cachedScores(postId: string, questionsKey: string): Promise<Scores | null> {
  const key = cacheKey(postId, questionsKey);
  const stored = await chrome.storage.session.get(key);
  const value: unknown = stored[key];
  return isScores(value) ? value : null;
}

export async function rememberScores(
  postId: string,
  questionsKey: string,
  scores: Scores,
): Promise<void> {
  await chrome.storage.session.set({ [cacheKey(postId, questionsKey)]: scores });
}

export async function forgetScores(): Promise<void> {
  const stored = await chrome.storage.session.get(null);
  const keys = Object.keys(stored).filter((key) => key.startsWith('anyfilter.scores.'));
  if (keys.length > 0) await chrome.storage.session.remove(keys);
}
