import { inputTokensFrom, questionsAs, scoresFrom } from './jev-payload';
import type { ProviderAdapter } from './provider-adapter';

export const typesafeDirectAdapter: ProviderAdapter = {
  id: 'typesafe',
  buildRequest: (key, state, questions) => ({
    url: 'https://api.typesafe.ai/v1/systemone',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: { model: 'jev-latest', state, questions: questionsAs(questions, 'noul') },
  }),
  parseScores: (json) => scoresFrom(json, 'noul'),
  inputTokens: (json) => inputTokensFrom(json, 'input_tokens'),
};
