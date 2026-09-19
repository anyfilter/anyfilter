import { BUILT_IN_CATEGORIES } from './category';
import { isProviderId, type ProviderId } from './provider';

export interface Settings {
  filterOn: boolean;
  disabled: string[];
  threshold: number;
  custom: string[];
  provider: ProviderId;
  keys: Record<ProviderId, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  filterOn: true,
  disabled: [],
  threshold: 0.7,
  custom: [],
  provider: 'vercel',
  keys: { vercel: '', typesafe: '' },
};

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function disabledFrom(record: Record<string, unknown>): string[] {
  const disabled = stringArray(record.disabled);
  if (disabled) return disabled;
  const legacyEnabled = stringArray(record.enabled);
  if (!legacyEnabled) return DEFAULT_SETTINGS.disabled;
  return BUILT_IN_CATEGORIES.map((category) => category.id).filter(
    (id) => !legacyEnabled.includes(id),
  );
}

export function normalizeSettings(raw: unknown): Settings {
  const record = asRecord(raw);
  const keys = asRecord(record.keys);
  return {
    filterOn: typeof record.filterOn === 'boolean' ? record.filterOn : DEFAULT_SETTINGS.filterOn,
    disabled: disabledFrom(record),
    threshold:
      typeof record.threshold === 'number' && record.threshold > 0 && record.threshold <= 1
        ? record.threshold
        : DEFAULT_SETTINGS.threshold,
    custom: stringArray(record.custom) ?? DEFAULT_SETTINGS.custom,
    provider: isProviderId(record.provider) ? record.provider : DEFAULT_SETTINGS.provider,
    keys: {
      vercel: typeof keys.vercel === 'string' ? keys.vercel : '',
      typesafe: typeof keys.typesafe === 'string' ? keys.typesafe : '',
    },
  };
}

export function enabledCategories(settings: Settings): ReadonlySet<string> {
  const disabled = new Set(settings.disabled);
  return new Set(
    BUILT_IN_CATEGORIES.map((category) => category.id).filter((id) => !disabled.has(id)),
  );
}

export function activeKey(settings: Settings): string {
  return settings.keys[settings.provider].trim();
}
