import type { ParentPost, Post, PostKind } from '../domain/post';

const AVATAR_PREFIX = 'UserAvatar-Container-';
const STATUS_HREF = /\/status\/(\d+)/;
const HANDLE_PATH = /^\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/;

export interface ReadContext {
  kind: PostKind;
  parent: ParentPost | null;
  thread: string;
  ownHandle: string;
}

const CELL_SELECTOR = '[data-testid="cellInnerDiv"]';
const REPLY_LINE_MAX_DEPTH = 8;

function continuesPreviousCell(article: Element): boolean {
  let element: Element | null = article.firstElementChild;
  for (let depth = 0; element && depth < REPLY_LINE_MAX_DEPTH; depth += 1) {
    if (getComputedStyle(element).width === '2px') return true;
    element = element.firstElementChild;
  }
  return false;
}

export function threadHeadOf(article: Element): Element {
  let head = article;
  while (continuesPreviousCell(head)) {
    const previous = head.closest(CELL_SELECTOR)?.previousElementSibling?.querySelector(
      'article[data-testid="tweet"]',
    );
    if (!previous) break;
    head = previous;
  }
  return head;
}

function statusIdFrom(href: string): string {
  return href.match(STATUS_HREF)?.[1] ?? '';
}

export function readPostId(article: Element): string {
  for (const time of article.querySelectorAll('time')) {
    const id = statusIdFrom(time.parentElement?.getAttribute('href') ?? '');
    if (id) return id;
  }
  for (const link of article.querySelectorAll('a[href*="/status/"]')) {
    const id = statusIdFrom(link.getAttribute('href') ?? '');
    if (id) return id;
  }
  return '';
}

function readHandle(article: Element, userName: Element | null): string {
  const avatarTestId = article
    .querySelector(`[data-testid^="${AVATAR_PREFIX}"]`)
    ?.getAttribute('data-testid');
  if (avatarTestId) return avatarTestId.slice(AVATAR_PREFIX.length);
  for (const link of userName?.querySelectorAll('a[href]') ?? []) {
    const handle = (link.getAttribute('href') ?? '').match(HANDLE_PATH)?.[1];
    if (handle) return handle;
  }
  return userName?.textContent?.match(/@([A-Za-z0-9_]{1,15})/)?.[1] ?? '';
}

function backgroundImageUrl(element: Element): string {
  const style = element.getAttribute('style') ?? '';
  return style.match(/url\(["']?(https:\/\/pbs\.twimg\.com\/profile_images\/[^"')]+)/)?.[1] ?? '';
}

function readAvatarUrl(article: Element): string {
  const container = article.querySelector(`[data-testid^="${AVATAR_PREFIX}"]`) ?? article;
  const img = container.querySelector<HTMLImageElement>('img[src*="profile_images"]');
  if (img) return img.getAttribute('src') ?? '';
  for (const element of container.querySelectorAll('[style*="profile_images"]')) {
    const url = backgroundImageUrl(element);
    if (url) return url;
  }
  return '';
}

function quotedTweetOf(article: Element): Element | null {
  for (const link of article.querySelectorAll('div[role="link"]')) {
    if (link.querySelector('[data-testid="tweetText"]')) return link;
  }
  return null;
}

function readImageUrls(article: Element, quoted: Element | null): string[] {
  const urls: string[] = [];
  for (const img of article.querySelectorAll<HTMLImageElement>('img[src*="pbs.twimg.com/media/"]')) {
    if (quoted?.contains(img)) continue;
    const src = img.getAttribute('src') ?? '';
    if (src && !urls.includes(src)) urls.push(src);
  }
  return urls;
}

function readTruncated(article: Element): boolean {
  if (article.querySelector('[data-testid="tweet-text-show-more-link"]')) return true;
  return Array.from(article.querySelectorAll('a, span[role="button"]')).some(
    (element) => element.textContent?.trim() === 'Show more',
  );
}

export function readOwnHandle(root: ParentNode): string {
  const profileHref =
    root.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href') ?? '';
  const fromLink = profileHref.match(HANDLE_PATH)?.[1];
  if (fromLink) return fromLink;
  const switcher = root.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
  return switcher?.textContent?.match(/@([A-Za-z0-9_]{1,15})/)?.[1] ?? '';
}

export function readParentPost(article: Element): ParentPost | null {
  const id = readPostId(article);
  if (!id) return null;
  const userName = article.querySelector('[data-testid="User-Name"]');
  return {
    id,
    name: userName?.querySelector('span')?.textContent?.trim() ?? '',
    handle: readHandle(article, userName),
    text: article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() ?? '',
    avatarUrl: readAvatarUrl(article),
  };
}

export function readPost(article: Element, context: ReadContext): Post | null {
  const id = readPostId(article);
  if (!id) return null;
  const userName = article.querySelector('[data-testid="User-Name"]');
  const quoted = quotedTweetOf(article);
  const handle = readHandle(article, userName);
  return {
    id,
    kind: context.kind,
    parent: context.parent,
    thread: context.thread || id,
    own: context.ownHandle !== '' && handle.toLowerCase() === context.ownHandle.toLowerCase(),
    name: userName?.querySelector('span')?.textContent?.trim() ?? '',
    handle,
    time: article.querySelector('time')?.textContent?.trim() ?? '',
    text: article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() ?? '',
    promoted: article.closest('[data-testid="placementTracking"]') !== null,
    avatarUrl: readAvatarUrl(article),
    imageUrls: readImageUrls(article, quoted),
    hasVideo: article.querySelector('video, [data-testid="videoPlayer"]') !== null,
    quotedName:
      quoted?.querySelector('[data-testid="User-Name"] span')?.textContent?.trim() ?? '',
    quotedText: quoted?.querySelector('[data-testid="tweetText"]')?.textContent?.trim() ?? '',
    truncated: readTruncated(article),
  };
}
