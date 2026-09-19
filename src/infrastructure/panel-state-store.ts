import {
  EMPTY_PANEL_STATE,
  isClassifyFailure,
  isHiddenEntry,
  isOutcome,
  type HiddenEntry,
  type Outcome,
  type PanelState,
} from '../domain/panel-state';

const PANEL_KEY = 'anyfilter.panel';

let writeChain: Promise<unknown> = Promise.resolve();

function normalize(raw: unknown): PanelState {
  if (typeof raw !== 'object' || raw === null) return EMPTY_PANEL_STATE;
  const record = raw as Record<string, unknown>;
  const hidden: Record<string, HiddenEntry> = {};
  if (typeof record.hidden === 'object' && record.hidden !== null) {
    for (const [postId, entry] of Object.entries(record.hidden)) {
      if (isHiddenEntry(entry)) hidden[postId] = entry;
    }
  }
  const seen: Record<string, Outcome> = {};
  if (typeof record.seen === 'object' && record.seen !== null) {
    for (const [postId, flag] of Object.entries(record.seen)) {
      if (isOutcome(flag)) seen[postId] = flag;
      else if (flag === true) seen[postId] = hidden[postId] && !hidden[postId].shown ? 'hidden' : 'kept';
    }
  }
  return {
    tokens: typeof record.tokens === 'number' ? record.tokens : 0,
    seen,
    hidden,
    lastFailure: isClassifyFailure(record.lastFailure) ? record.lastFailure : null,
  };
}

export async function loadPanelState(): Promise<PanelState> {
  const stored = await chrome.storage.local.get(PANEL_KEY);
  return normalize(stored[PANEL_KEY]);
}

export function updatePanelState(update: (state: PanelState) => PanelState): Promise<PanelState> {
  const next = writeChain.then(async () => {
    const updated = update(await loadPanelState());
    await chrome.storage.local.set({ [PANEL_KEY]: updated });
    return updated;
  });
  writeChain = next.catch(() => undefined);
  return next;
}

export function onPanelStateChanged(listener: (state: PanelState) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: chrome.storage.AreaName,
  ): void => {
    if (area === 'local' && PANEL_KEY in changes) {
      listener(normalize(changes[PANEL_KEY].newValue));
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
