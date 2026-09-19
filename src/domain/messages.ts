import { isPost, type Post, type PostKind } from './post';
import { isReason, isScores, type Reason, type Scores } from './verdict';

export type RuntimeMessage =
  | { type: 'classify'; post: Post; questions: Record<string, string>; questionsKey: string }
  | { type: 'report'; post: Post; reasons: Reason[]; tokens: number }
  | { type: 'override'; postId: string; shown: boolean }
  | { type: 'clear-hidden'; kind: PostKind }
  | { type: 'clear-data' };

export type ClassifyError = 'no-key' | 'rate-limited' | 'auth' | 'network' | 'bad-response';

export type ClassifyResult =
  | { ok: true; scores: Scores; tokens: number }
  | { ok: false; error: ClassifyError; detail: string };

const CLASSIFY_ERRORS: readonly ClassifyError[] = [
  'no-key',
  'rate-limited',
  'auth',
  'network',
  'bad-response',
];

export function isClassifyError(value: unknown): value is ClassifyError {
  return CLASSIFY_ERRORS.some((error) => error === value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  const record = asRecord(value);
  return record !== null && Object.values(record).every((item) => typeof item === 'string');
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  const record = asRecord(value);
  if (!record) return false;
  switch (record.type) {
    case 'classify':
      return (
        isPost(record.post) &&
        isStringRecord(record.questions) &&
        typeof record.questionsKey === 'string'
      );
    case 'report':
      return (
        isPost(record.post) &&
        Array.isArray(record.reasons) &&
        record.reasons.every(isReason) &&
        typeof record.tokens === 'number'
      );
    case 'override':
      return typeof record.postId === 'string' && typeof record.shown === 'boolean';
    case 'clear-hidden':
      return record.kind === 'post' || record.kind === 'reply';
    case 'clear-data':
      return true;
    default:
      return false;
  }
}

export function isClassifyResult(value: unknown): value is ClassifyResult {
  const record = asRecord(value);
  if (!record) return false;
  if (record.ok === true) return isScores(record.scores) && typeof record.tokens === 'number';
  return record.ok === false && isClassifyError(record.error) && typeof record.detail === 'string';
}
