# AnyFilter

Chrome extension that hides anything you don't want to see on X, from ads and spam to whatever you describe in a sentence.

https://github.com/user-attachments/assets/4cfa42c1-00e8-46d5-ba18-07cb912e9dbd

## Install

1. Download `anyfilter-<version>-chrome.zip` from [Releases](../../releases) and unzip it.
2. Open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick the unzipped folder.
3. Go to x.com and click the toolbar icon. The panel docks on the right.

To build it yourself: `pnpm install && pnpm build`, then load `.output/chrome-mv3`.

## Using it

1. Open Settings in the panel and paste a [Jev](https://vercel.com/ai-gateway/models/jev) key from Vercel AI Gateway or TypeSafe. It never leaves your browser.
2. Tick what to hide, or type your own rule like "horoscopes" and press Add.
3. Scroll. Hidden posts show up in the panel grouped by reason; click "Put back in feed" if Jev got one wrong.

<p>
  <img src="screenshots/panel.png" width="360" alt="Side panel: stats and hidden posts grouped by reason">
  <img src="screenshots/settings.png" width="360" alt="Settings, at the bottom of the same panel">
</p>

## Development

```bash
pnpm dev        # dev server with the extension loaded
pnpm typecheck
pnpm e2e        # offline end-to-end run against static fixtures
```

`pnpm e2e` loads the built extension into Chromium, serves fake X pages from `scripts/fixtures/` and mocks Jev. If playwright-core can't find a browser, point it at one with `ANYFILTER_CHROMIUM=/path/to/chrome`.

Layout:

```
src/domain/          types, categories, verdicts, settings, ports
src/features/        feed-filter: scan, classify, hide
src/infrastructure/  Chrome storage, Jev adapters, X DOM reading and hiding
src/ui/sidepanel/    React side panel
src/entrypoints/     content, background, sidepanel
```

To support another site, implement `domain/timeline-view.ts` for it and add its URL to the content script.

## License

MIT
