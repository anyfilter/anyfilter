export type ProviderId = 'vercel' | 'typesafe';

export interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  keyHint: string;
}

export const PROVIDERS: readonly ProviderDescriptor[] = [
  { id: 'vercel', label: 'Vercel AI Gateway', keyHint: 'AI Gateway key (vck_…)' },
  { id: 'typesafe', label: 'TypeSafe direct', keyHint: 'TypeSafe API key' },
];

export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}
