import type { ProviderId } from '../../domain/provider';
import type { Scores } from '../../domain/verdict';

export interface ProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface ProviderAdapter {
  id: ProviderId;
  buildRequest(key: string, state: unknown, questions: Record<string, string>): ProviderRequest;
  parseScores(json: unknown): Scores;
  inputTokens(json: unknown): number;
}
