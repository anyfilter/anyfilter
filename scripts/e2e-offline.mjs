#!/usr/bin/env node
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const EXTENSION_DIR = path.join(ROOT, '.output', 'chrome-mv3');
const HOME_FIXTURE = readFileSync(path.join(ROOT, 'scripts', 'fixtures', 'x-home.html'), 'utf8');
const STATUS_FIXTURE = readFileSync(path.join(ROOT, 'scripts', 'fixtures', 'x-status.html'), 'utf8');
const EXECUTABLE = process.env.ANYFILTER_CHROMIUM ?? '';
const FAKE_KEY = 'vck_offline_fixture_key';

const MOCK_SCORES = [
  { marker: 'Next.js', scores: { promo: 0.2 } },
  { marker: '#connect', scores: { bait: 0.86, platitude: 0.53 } },
  { marker: 'parasites', scores: { hate: 0.98, spam: 0.2 } },
  { marker: 'Splunk Token Meter', scores: { promo: 0.3 } },
  { marker: 'where the money actually goes', scores: { platitude: 0.8 } },
  { marker: 'order of magnitude', scores: {} },
  { marker: '福不黑', scores: { porn: 0.88, spam: 0.44 } },
];

const jevCalls = [];
let failures = 0;
mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });

function check(condition, label) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failures += 1;
}

async function waitFor(fn, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log(`TIMEOUT waiting for: ${label}`);
  return false;
}

const context = await chromium.launchPersistentContext(mkdtempSync(path.join(tmpdir(), 'anyfilter-')), {
  headless: true,
  ...(EXECUTABLE ? { executablePath: EXECUTABLE } : {}),
  args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
});

await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.startsWith('https://x.com/')) {
    const body = url.includes('/status/') ? STATUS_FIXTURE : HOME_FIXTURE;
    await route.fulfill({ contentType: 'text/html', body });
    return;
  }
  if (url.startsWith('https://ai-gateway.vercel.sh/')) {
    const body = JSON.parse(route.request().postData() ?? '{}');
    jevCalls.push(body);
    const text = body.state?.text ?? '';
    const scores = MOCK_SCORES.find((mock) => text.includes(mock.marker))?.scores ?? {};
    const answers = Object.fromEntries(
      Object.keys(body.questions ?? {}).map((questionId) => [
        questionId,
        { type: 'boolean', probability: scores[questionId] ?? 0.02 },
      ]),
    );
    await route.fulfill({ json: { answers, usage: { inputTokens: 600, outputTokens: 100 } } });
    return;
  }
  if (url.startsWith('chrome-extension://')) {
    await route.continue();
    return;
  }
  await route.abort();
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const extensionId = new URL(worker.url()).host;
console.log(`extension ${extensionId} loaded`);

const feed = await context.newPage();
await feed.setViewportSize({ width: 1280, height: 4000 });
await feed.goto('https://x.com/home');

const cellHidden = (id) =>
  feed.evaluate(
    (cellId) =>
      document.querySelector(`#${cellId} > div`)?.classList.contains('anyfilter-hidden') ?? false,
    id,
  );

check(await waitFor(() => cellHidden('cell-ad'), 'ad hidden by rule layer'), 'promoted post is hidden without an API key');
check(!(await cellHidden('cell-bait')), 'engagement bait is NOT hidden before a key is configured');

const panel = await context.newPage();
await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
await panel.locator('summary', { hasText: 'Settings' }).click();
await panel.locator('#anyfilter-key').fill(FAKE_KEY);

check(await waitFor(() => cellHidden('cell-bait'), 'bait hidden after key'), 'engagement bait is hidden once a key is set (mock Jev)');
check(await waitFor(() => cellHidden('cell-hate'), 'hate hidden after key'), 'hateful reply is hidden (mock Jev)');
check(!(await cellHidden('cell-keep')), 'substantive post stays visible');
check(await waitFor(() => cellHidden('cell-thread-reply'), 'thread reply hidden'), 'platitude reply in a home-timeline thread module is hidden');
check(await waitFor(() => cellHidden('cell-thread-head'), 'thread head hidden'), 'the post it hangs under is hidden with it (whole module goes)');
check(jevCalls.length === 5, `Jev called once per classifiable post (got ${jevCalls.length})`);
check(
  jevCalls.every((call) => Object.keys(call.questions).length === 9),
  'each Jev call carries the 9 built-in intent questions',
);
check(
  jevCalls.every((call) => call.state?.author?.handle?.startsWith('@') && typeof call.state?.author?.name === 'string'),
  'Jev receives author handle and display name',
);

const postsSection = panel.locator('[data-anyfilter-section="post"]');
const repliesSection = panel.locator('[data-anyfilter-section="reply"]');
check(
  await waitFor(async () => (await postsSection.getByText('Engagement bait').count()) > 0, 'panel group'),
  'Posts section shows the Engagement bait group',
);
check(
  await waitFor(async () => (await postsSection.getByText('Ads').count()) > 0, 'panel ads group'),
  'Posts section shows the Ads group',
);
check((await repliesSection.count()) === 0, 'Replies section is not shown while no reply is hidden');
check((await panel.getByRole('button', { name: /Roman Shalabanov/ }).count()) === 0, 'reason groups start collapsed');
await postsSection.getByRole('button', { name: /Engagement bait/ }).click();
check(
  await waitFor(async () => (await panel.getByRole('button', { name: /Roman Shalabanov/ }).count()) === 1, 'expanded group'),
  'expanding a reason group lists its rows',
);
const hiddenTile = await panel.locator('div:has(> div:text-is("Hidden posts")) > div:nth-child(2) > span').first().textContent();
check(hiddenTile?.trim() === '4', `Hidden tile counts 4 (got ${hiddenTile?.trim()})`);
const savedTile = await panel.locator('div:has(> div:text-is("Time saved")) > div:nth-child(2) > span').first().textContent();
check(savedTile?.trim() === '32s', `Time saved tile shows 32s (got ${savedTile?.trim()})`);
check((await panel.locator('h1 + p').count()) === 0, 'header shows no status line while everything is fine');

await panel.getByRole('switch').click();
check(await waitFor(async () => !(await cellHidden('cell-ad')) && !(await cellHidden('cell-bait')), 'filter off shows all'), 'switching the filter off shows every hidden post');
const callsWhileOff = jevCalls.length;
await feed.evaluate(() => {
  const cell = document.querySelector('#cell-keep');
  const clone = cell.cloneNode(true);
  clone.id = 'cell-late';
  const article = clone.querySelector('article');
  article.removeAttribute('data-anyfilter');
  article.removeAttribute('data-anyfilter-id');
  clone.querySelector('[data-testid="tweetText"]').textContent = 'people from that country are all parasites and should be kicked out';
  clone.querySelector('a[href*="/status/"]').setAttribute('href', '/rauchg/status/1009');
  cell.parentElement.append(clone);
});
await new Promise((resolve) => setTimeout(resolve, 600));
check(jevCalls.length === callsWhileOff, 'nothing is classified while the filter is off');
check(!(await cellHidden('cell-late')), 'a post that appears while the filter is off stays visible');
await panel.getByRole('switch').click();
check(await waitFor(() => cellHidden('cell-bait'), 'filter on hides again'), 'switching the filter back on hides them again');
check(await waitFor(() => cellHidden('cell-late'), 'late post hidden'), 'posts that appeared while off are classified once the filter is back on');

await panel.getByRole('button', { name: /Roman Shalabanov/ }).first().click();
check((await panel.locator('img[src*="profile_images/roman"]').count()) === 3, 'group header, row and preview card all show the real avatar image');
check((await panel.getByText('Quoted: building in public').count()) === 1, 'preview shows the quoted post');
check((await panel.locator('img[src*="media/connect_banner"]').count()) === 1, 'preview shows the attached image');
check((await panel.locator('img[src*="media/quoted_pic"]').count()) === 0, 'quoted post image is not mistaken for the post image');
check((await panel.getByRole('link', { name: 'Show more' }).count()) === 1, 'preview shows a Show more link for a truncated long post');
check(
  (await panel.getByRole('link', { name: '@RomanShalabanov' }).getAttribute('href')) === 'https://x.com/RomanShalabanov' &&
    (await panel.getByRole('link', { name: '· 13h' }).count()) === 1,
  'preview shows handle (linking to the profile) and time like a native post',
);
check((await panel.getByText('Quoted Person').count()) === 1, 'quote card shows the quoted author');
check((await panel.getByRole('link', { name: 'Open on X ↗' }).getAttribute('href')) === 'https://x.com/RomanShalabanov/status/1002', 'preview links to the original post');
const quotedCall = jevCalls.find((call) => call.state?.text?.includes('#connect'));
check(quotedCall?.state?.quoted === 'Quoted: building in public is the way', 'Jev receives the quoted text as state');
await panel.getByRole('button', { name: 'Put back in feed' }).first().click();
check(await waitFor(async () => !(await cellHidden('cell-bait')), 'put back'), '"Put back in feed" restores that one post');
check(await cellHidden('cell-hate'), 'other hidden posts stay hidden after a single put-back');

const callsBeforeConversation = jevCalls.length;
await feed.goto('https://x.com/yann_shi_/status/2001');
check(await waitFor(() => cellHidden('cell-porn-bot'), 'porn bot reply hidden'), 'porn-bot reply is hidden on a conversation page');
check(!(await cellHidden('cell-focal')), 'the focal post stays visible');
check(!(await cellHidden('cell-own-reply')), "the logged-in user's own reply is never hidden");
check(!(await cellHidden('cell-real-reply')), 'a genuine reply stays visible');
const conversationCalls = jevCalls.slice(callsBeforeConversation);
check(conversationCalls.length === 2, `only the two other people's replies are sent to Jev (got ${conversationCalls.length})`);
check(
  conversationCalls.every((call) => call.state?.replyingTo?.text?.includes('Jev speed test') && call.state?.replyingTo?.author === '@yann_shi_'),
  'replies carry the parent post as replyingTo context',
);
check(
  !conversationCalls.some((call) => call.state?.text?.includes('yeah true')),
  'own reply is not classified at all',
);
check(
  await waitFor(async () => (await repliesSection.getByText('Porn bots').count()) > 0, 'replies group'),
  'Replies section shows the Porn bots group',
);
await repliesSection.getByRole('button', { name: /Porn bots/ }).click();
check(
  await waitFor(async () => (await repliesSection.getByText('Jev speed test: 428 posts').count()) === 1, 'parent line'),
  'reply group names the post it was under',
);
check((await repliesSection.locator('img[src*="profile_images/karen"]').count()) === 2, 'avatar read from a background-image style (group header + row)');
const sectionCount = (section) => section.locator('h2 + span').first().textContent();
check(await waitFor(async () => (await sectionCount(postsSection))?.trim() === '5', 'posts count'), 'Posts section keeps its own count');
check((await sectionCount(repliesSection))?.trim() === '1', 'Replies section shows its own count');

await feed.goto('https://x.com/notifications');
await new Promise((resolve) => setTimeout(resolve, 800));
check(jevCalls.length === callsBeforeConversation + 2, 'nothing is scanned on pages other than home and conversations');

await panel.setViewportSize({ width: 360, height: 900 });
await panel.screenshot({ path: path.join(ROOT, 'tmp', 'sidepanel.png'), fullPage: true });
await feed.goto('https://x.com/home');
await feed.screenshot({ path: path.join(ROOT, 'tmp', 'feed.png'), fullPage: true });

await context.close();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
