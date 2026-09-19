# AnyFilter

Chrome extension that hides posts you don't want to see. Works on X for now.

It hides ads, engagement bait, promos, platitudes, hate, porn bots, spam replies and crypto shilling, plus anything you describe in a sentence. Hidden posts collapse out of the feed. A side panel shows what was hidden and why, and lets you put anything back.

Classification is done by [Jev](https://vercel.com/ai-gateway/models/jev). You need your own API key, from either Vercel AI Gateway or TypeSafe. Without a key only ads are hidden. A post costs about 600 input tokens, roughly $0.025 per 1,000 posts.

## Install

1. Download `anyfilter-<version>-chrome.zip` from [Releases](../../releases) and unzip it.
2. Open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick the unzipped folder.
3. Go to x.com, click the toolbar icon, open Settings in the panel and paste your key.

To build it yourself: `pnpm install && pnpm build`, then load `.output/chrome-mv3`.

## Notes

- Runs only on the home timeline and on conversation pages.
- Your own posts and replies are never hidden.
- On the home timeline, a post and the reply shown under it are hidden together.
- Replies are scored together with the post they answer.
- The threshold slider sets how sure Jev must be before a post is hidden.

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
