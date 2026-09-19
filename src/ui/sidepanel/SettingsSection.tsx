import { useState } from 'react';
import { BUILT_IN_CATEGORIES } from '../../domain/category';
import { PROVIDERS } from '../../domain/provider';
import type { PostKind } from '../../domain/post';
import { enabledCategories, type Settings } from '../../domain/settings';

const INPUT_CLASS = 'w-full rounded-lg border border-[#cfd9de] bg-white px-2 py-1.5 text-[13px]';
const SUBHEADING_CLASS = 'mb-1.5 mt-4 text-[13px] font-bold text-ink';
const BUTTON_CLASS = 'rounded-lg border border-[#cfd9de] bg-white px-3 py-1.5 font-bold';

export function SettingsSection({
  settings,
  onChange,
  onClearData,
  onClearHidden,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClearData: () => Promise<void>;
  onClearHidden: (kind: PostKind) => Promise<void>;
}) {
  const [customDraft, setCustomDraft] = useState('');
  const enabled = enabledCategories(settings);
  const provider = PROVIDERS.find((candidate) => candidate.id === settings.provider) ?? PROVIDERS[0];

  const toggleCategory = (id: string, on: boolean): void => {
    const disabled = new Set(settings.disabled);
    if (on) disabled.delete(id);
    else disabled.add(id);
    onChange({ disabled: [...disabled] });
  };

  const addCustom = (): void => {
    const label = customDraft.trim();
    if (label === '' || settings.custom.includes(label)) return;
    onChange({ custom: [...settings.custom, label] });
    setCustomDraft('');
  };

  return (
    <details className="anyfilter-details">
      <summary className="flex cursor-pointer list-none items-center text-[15px] font-bold text-ink">
        Settings
        <span className="anyfilter-chevron ml-auto text-ink-2" aria-hidden="true">
          ›
        </span>
      </summary>

      <h3 className={SUBHEADING_CLASS}>What to hide</h3>
      <div className="divide-y divide-line rounded-lg border border-line">
        {BUILT_IN_CATEGORIES.map((category) => (
          <label
            key={category.id}
            className="flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 hover:bg-surface"
          >
            <input
              type="checkbox"
              className="anyfilter-check"
              checked={enabled.has(category.id)}
              onChange={(event) => toggleCategory(category.id, event.target.checked)}
            />
            {category.label}
          </label>
        ))}
      </div>
      <label className="mt-2.5 block">
        <span className="text-ink-2">
          Hide a post when Jev is at least{' '}
          <b className="text-ink tabular-nums">{Math.round(settings.threshold * 100)}%</b> sure
        </span>
        <input
          type="range"
          className="anyfilter-range mt-1 w-full"
          min={50}
          max={95}
          step={5}
          value={Math.round(settings.threshold * 100)}
          onChange={(event) => onChange({ threshold: Number(event.target.value) / 100 })}
        />
        <span className="flex justify-between text-[11px] text-ink-2">
          <span>Hide more</span>
          <span>Hide less</span>
        </span>
      </label>

      <h3 className={SUBHEADING_CLASS}>Your own rules</h3>
      <div className="flex gap-1.5">
        <label className="sr-only" htmlFor="anyfilter-custom">
          Describe what to filter out
        </label>
        <input
          id="anyfilter-custom"
          type="text"
          className={INPUT_CLASS}
          placeholder="Filter out… e.g. horoscopes, sports betting, hustle culture"
          value={customDraft}
          onChange={(event) => setCustomDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addCustom();
          }}
        />
        <button
          type="button"
          className="rounded-lg border border-[#cfd9de] bg-white px-3 font-bold"
          onClick={addCustom}
        >
          Add
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {settings.custom.map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-bold"
            title="Remove"
            onClick={() => onChange({ custom: settings.custom.filter((item) => item !== label) })}
          >
            {label} ✕
          </button>
        ))}
      </div>

      <h3 className={SUBHEADING_CLASS}>Provider</h3>
      <div className="flex rounded-lg bg-surface p-0.5" role="radiogroup" aria-label="Provider">
        {PROVIDERS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="radio"
            aria-checked={candidate.id === settings.provider}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              candidate.id === settings.provider
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-2 hover:text-ink'
            }`}
            onClick={() => onChange({ provider: candidate.id })}
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="anyfilter-key">
        API key
      </label>
      <input
        id="anyfilter-key"
        type="password"
        className={`${INPUT_CLASS} mt-1.5`}
        placeholder={`${provider.keyHint} — stored only in this browser`}
        value={settings.keys[settings.provider]}
        onChange={(event) =>
          onChange({ keys: { ...settings.keys, [settings.provider]: event.target.value } })
        }
      />
      <p className="mt-1 text-[11px] text-ink-2">
        Your key never leaves this browser except to the provider you picked. Without a key only
        ads are hidden.
      </p>

      <h3 className={SUBHEADING_CLASS}>Data</h3>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={BUTTON_CLASS} onClick={() => void onClearHidden('post')}>
          Clear hidden posts
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={() => void onClearHidden('reply')}>
          Clear hidden replies
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={() => void onClearData()}>
          Clear everything
        </button>
      </div>
      <p className="mt-1 text-[11px] text-ink-2">
        Clearing everything also resets the counters and forgets cached scores. Settings and your
        key stay.
      </p>
    </details>
  );
}
