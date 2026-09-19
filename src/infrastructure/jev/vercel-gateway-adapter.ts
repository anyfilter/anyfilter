import { inputTokensFrom, questionsAs, scoresFrom } from './jev-payload';
import type { ProviderAdapter } from './provider-adapter';

export const vercelGatewayAdapter: ProviderAdapter = {
  id: 'vercel',
  buildRequest: (key, state, questions) => ({
    url: 'https://ai-gateway.vercel.sh/v4/ai/evaluation-model',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'ai-model-id': 'typesafe-ai/jev',
      'ai-gateway-protocol-version': '0.0.1',
      'ai-gateway-auth-method': 'api-key',
    },
    body: { state, questions: questionsAs(questions, 'boolean') },
  }),
  parseScores: (json) => scoresFrom(json, 'probability'),
  inputTokens: (json) => inputTokensFrom(json, 'inputTokens'),
};
