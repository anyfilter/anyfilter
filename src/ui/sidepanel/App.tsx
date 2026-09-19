import { allCategories } from '../../domain/category';
import type { Settings } from '../../domain/settings';
import { Header } from './Header';
import { HiddenGroups } from './HiddenGroups';
import type { PanelGateway } from './PanelGateway';
import { SettingsSection } from './SettingsSection';
import { Tiles } from './Tiles';
import { useSubscribedValue } from './use-subscribed-value';

export function App({ gateway }: { gateway: PanelGateway }) {
  const settings = useSubscribedValue(gateway.loadSettings, gateway.onSettingsChanged);
  const panel = useSubscribedValue(gateway.loadPanelState, gateway.onPanelStateChanged);

  if (settings.status === 'error') return <p className="p-4 text-ink-2">{settings.message}</p>;
  if (panel.status === 'error') return <p className="p-4 text-ink-2">{panel.message}</p>;
  if (settings.status === 'loading' || panel.status === 'loading') {
    return <p className="p-4 text-ink-2">Loading…</p>;
  }

  const current = settings.value;
  const state = panel.value;
  const updateSettings = (patch: Partial<Settings>): void => {
    void gateway.saveSettings({ ...current, ...patch });
  };
  const labelOrder = allCategories(current.custom).map((category) => category.label);

  return (
    <div className="space-y-2.5 p-3">
      <section className="rounded-xl border border-line bg-white p-3.5">
        <Header
          settings={current}
          state={state}
          onToggle={(filterOn) => updateSettings({ filterOn })}
        />
        <Tiles state={state} />
      </section>
      <HiddenGroups state={state} labelOrder={labelOrder} onOverride={gateway.override} />
      <section className="rounded-xl border border-line bg-white p-3.5">
        <SettingsSection
          settings={current}
          onChange={updateSettings}
          onClearData={gateway.clearData}
          onClearHidden={gateway.clearHidden}
        />
      </section>
    </div>
  );
}
