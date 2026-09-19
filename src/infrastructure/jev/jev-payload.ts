import type { Scores } from '../../domain/verdict';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function questionsAs(
  questions: Record<string, string>,
  type: string,
): Record<string, { type: string; instructions: string }> {
  return Object.fromEntries(
    Object.entries(questions).map(([id, instructions]) => [id, { type, instructions }]),
  );
}

export function scoresFrom(json: unknown, probabilityField: string): Scores {
  const scores: Scores = {};
  for (const [id, answer] of Object.entries(asRecord(asRecord(json).answers))) {
    const probability = asRecord(answer)[probabilityField];
    if (typeof probability === 'number') scores[id] = probability;
  }
  return scores;
}

export function inputTokensFrom(json: unknown, tokensField: string): number {
  const count = asRecord(asRecord(json).usage)[tokensField];
  return typeof count === 'number' ? count : 0;
}
