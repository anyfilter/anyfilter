import { failureText, scannedCount, type PanelState } from '../../domain/panel-state';
import { activeKey, type Settings } from '../../domain/settings';

function statusText(settings: Settings, state: PanelState): string {
  if (!settings.filterOn) return `Filter off · showing all ${scannedCount(state)} posts`;
  if (activeKey(settings) === '') return 'Add your API key in Settings to filter by intent';
  if (state.lastFailure) return failureText(state.lastFailure);
  return '';
}

export function Header({
  settings,
  state,
  onToggle,
}: {
  settings: Settings;
  state: PanelState;
  onToggle: (filterOn: boolean) => void;
}) {
  const status = statusText(settings, state);
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid h-8.5 w-8.5 flex-none place-items-center rounded-lg text-white ${settings.filterOn ? 'bg-ink' : 'bg-[#cfd9de]'}`}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <div className="min-w-0">
        <h1 className="m-0 text-[15px] font-bold leading-tight">AnyFilter</h1>
        {status !== '' && (
          <p
            className={`m-0 truncate text-xs ${state.lastFailure && settings.filterOn ? 'text-hide' : 'text-ink-2'}`}
            title={status}
          >
            {status}
          </p>
        )}
      </div>
      <label className="relative ml-auto inline-flex h-6 w-10.5 flex-none cursor-pointer items-center">
        <span className="sr-only">Filter on</span>
        <input
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
          checked={settings.filterOn}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-[#cfd9de] transition peer-checked:bg-ink" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-4.5" />
      </label>
    </div>
  );
}
