import { isClassifyError, type ClassifyError, type ClassifyResult } from './messages';
import { isPost, type ParentPost, type Post, type PostKind } from './post';
import { isReason, type Reason } from './verdict';

export const PRICE_PER_INPUT_TOKEN = 0.042 / 1e6;
export const SECONDS_SAVED_PER_HIDDEN_POST = 8;
export const MAX_HIDDEN_ENTRIES = 300;

export interface HiddenEntry {
  post: Post;
  reasons: Reason[];
  at: number;
  shown: boolean;
}

export interface ClassifyFailure {
  error: ClassifyError;
  detail: string;
  at: number;
}

export type Outcome = 'hidden' | 'kept';

export interface PanelState {
  tokens: number;
  seen: Record<string, Outcome>;
  hidden: Record<string, HiddenEntry>;
  lastFailure: ClassifyFailure | null;
}

export function isOutcome(value: unknown): value is Outcome {
  return value === 'hidden' || value === 'kept';
}

export interface ReasonEntry {
  entry: HiddenEntry;
  reason: Reason;
}

export interface ReasonGroup {
  label: string;
  entries: ReasonEntry[];
}

export interface ParentGroup {
  parent: ParentPost | null;
  entries: ReasonEntry[];
}

export const EMPTY_PANEL_STATE: PanelState = { tokens: 0, seen: {}, hidden: {}, lastFailure: null };

export function isClassifyFailure(value: unknown): value is ClassifyFailure {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isClassifyError(record.error) &&
    typeof record.detail === 'string' &&
    typeof record.at === 'number'
  );
}

export function withClassifyResult(
  state: PanelState,
  result: ClassifyResult,
  at: number,
): PanelState {
  if (result.ok) return state.lastFailure ? { ...state, lastFailure: null } : state;
  return { ...state, lastFailure: { error: result.error, detail: result.detail, at } };
}

export function failureText(failure: ClassifyFailure): string {
  switch (failure.error) {
    case 'no-key':
      return 'Add your API key in Settings to filter by intent';
    case 'rate-limited':
      return 'Provider is rate-limiting this key — retrying automatically';
    case 'auth':
      return 'Provider rejected the API key (401/403) — check it in Settings';
    case 'network':
      return `Could not reach the provider: ${failure.detail}`;
    case 'bad-response':
      return `Unexpected provider response: ${failure.detail}`;
  }
}

export function isHiddenEntry(value: unknown): value is HiddenEntry {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isPost(record.post) &&
    Array.isArray(record.reasons) &&
    record.reasons.every(isReason) &&
    typeof record.at === 'number' &&
    typeof record.shown === 'boolean'
  );
}

export function withReport(
  state: PanelState,
  post: Post,
  reasons: Reason[],
  tokens: number,
  at: number,
): PanelState {
  const hidden = { ...state.hidden };
  if (reasons.length > 0) {
    hidden[post.id] = { post, reasons, at, shown: state.hidden[post.id]?.shown ?? false };
  } else {
    delete hidden[post.id];
  }
  const shown = state.hidden[post.id]?.shown ?? false;
  return {
    ...state,
    tokens: state.tokens + tokens,
    seen: { ...state.seen, [post.id]: reasons.length > 0 && !shown ? 'hidden' : 'kept' },
    hidden: newest(hidden, MAX_HIDDEN_ENTRIES),
  };
}

function newest(
  hidden: Record<string, HiddenEntry>,
  limit: number,
): Record<string, HiddenEntry> {
  const entries = Object.values(hidden);
  if (entries.length <= limit) return hidden;
  entries.sort((a, b) => b.at - a.at);
  return Object.fromEntries(entries.slice(0, limit).map((entry) => [entry.post.id, entry]));
}

export function withOverride(state: PanelState, postId: string, shown: boolean): PanelState {
  const entry = state.hidden[postId];
  if (!entry) return state;
  return {
    ...state,
    seen: { ...state.seen, [postId]: shown ? 'kept' : 'hidden' },
    hidden: { ...state.hidden, [postId]: { ...entry, shown } },
  };
}

export function withoutHiddenOfKind(state: PanelState, kind: PostKind): PanelState {
  const hidden = { ...state.hidden };
  const seen = { ...state.seen };
  for (const entry of Object.values(state.hidden)) {
    if (entry.post.kind !== kind) continue;
    delete hidden[entry.post.id];
    delete seen[entry.post.id];
  }
  return { ...state, hidden, seen };
}

export function scannedCount(state: PanelState): number {
  return Object.keys(state.seen).length;
}

export function hiddenCount(state: PanelState): number {
  return Object.values(state.seen).filter((outcome) => outcome === 'hidden').length;
}

export function costOf(state: PanelState): number {
  return state.tokens * PRICE_PER_INPUT_TOKEN;
}

export function secondsSaved(state: PanelState): number {
  return hiddenCount(state) * SECONDS_SAVED_PER_HIDDEN_POST;
}

export function hiddenOfKind(state: PanelState, kind: PostKind): HiddenEntry[] {
  return Object.values(state.hidden)
    .filter((entry) => entry.post.kind === kind)
    .sort((a, b) => b.at - a.at);
}

export function groupByReason(
  entries: readonly HiddenEntry[],
  labelOrder: readonly string[],
): ReasonGroup[] {
  const groups = new Map<string, ReasonGroup>();
  for (const entry of entries) {
    for (const reason of entry.reasons) {
      const group = groups.get(reason.label) ?? { label: reason.label, entries: [] };
      group.entries.push({ entry, reason });
      groups.set(reason.label, group);
    }
  }
  const rank = (label: string): number => {
    const index = labelOrder.indexOf(label);
    return index === -1 ? labelOrder.length : index;
  };
  return [...groups.values()].sort((a, b) => rank(a.label) - rank(b.label));
}

export function groupByParent(entries: readonly ReasonEntry[]): ParentGroup[] {
  const groups = new Map<string, ParentGroup>();
  for (const item of entries) {
    const parent = item.entry.post.parent;
    const key = parent?.id ?? '';
    const group = groups.get(key) ?? { parent, entries: [] };
    group.entries.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}
