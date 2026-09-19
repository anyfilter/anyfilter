import { isEnabled, type Category } from './category';
import type { Post } from './post';

export type Scores = Record<string, number>;

export interface Reason {
  categoryId: string;
  label: string;
  probability: number;
}

export function isScores(value: unknown): value is Scores {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((probability) => typeof probability === 'number')
  );
}

export function isReason(value: unknown): value is Reason {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.categoryId === 'string' &&
    typeof record.label === 'string' &&
    typeof record.probability === 'number'
  );
}

export function matchReasons(
  post: Post,
  scores: Scores,
  categories: readonly Category[],
  enabled: ReadonlySet<string>,
  threshold: number,
): Reason[] {
  const reasons: Reason[] = [];
  for (const category of categories) {
    if (!isEnabled(category, enabled)) continue;
    if (category.rule === 'promoted') {
      if (post.promoted) {
        reasons.push({ categoryId: category.id, label: category.label, probability: 1 });
      }
      continue;
    }
    const probability = scores[category.id];
    if (probability !== undefined && probability >= threshold) {
      reasons.push({ categoryId: category.id, label: category.label, probability });
    }
  }
  return reasons.sort((a, b) => b.probability - a.probability);
}

export function reasonText(reason: Reason): string {
  return reason.categoryId === 'ads'
    ? reason.label
    : `${reason.label} ${Math.round(reason.probability * 100)}%`;
}
