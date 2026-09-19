import '../../assets/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BackgroundClient } from '../../infrastructure/background-client';
import { loadPanelState, onPanelStateChanged } from '../../infrastructure/panel-state-store';
import { loadSettings, onSettingsChanged, saveSettings } from '../../infrastructure/settings-store';
import { App } from '../../ui/sidepanel/App';
import type { PanelGateway } from '../../ui/sidepanel/PanelGateway';

const client = new BackgroundClient();

const gateway: PanelGateway = {
  loadSettings,
  saveSettings,
  onSettingsChanged,
  loadPanelState,
  onPanelStateChanged,
  override: (postId, shown) => client.override(postId, shown),
  clearData: () => client.clearData(),
  clearHidden: (kind) => client.clearHidden(kind),
};

const rootEl = document.getElementById('app');
if (!rootEl) throw new Error('side panel root element not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App gateway={gateway} />
  </React.StrictMode>,
);
