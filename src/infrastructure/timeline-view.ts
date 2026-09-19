import type { ParentPost, Post } from '../domain/post';
import type { TimelineView as TimelineViewPort } from '../domain/timeline-view';
import {
  readOwnHandle,
  readParentPost,
  readPost,
  readPostId,
  threadHeadOf,
  type ReadContext,
} from './timeline-reader';

const PROCESSED_ATTRIBUTE = 'data-anyfilter';
const POST_ID_ATTRIBUTE = 'data-anyfilter-id';
const FLASH_CLASS = 'anyfilter-flash';
const SLIDING_CLASS = 'anyfilter-sliding';
const HIDING_CLASS = 'anyfilter-hiding';
const HIDDEN_CLASS = 'anyfilter-hidden';
const FLASH_MS = 450;
const SLIDE_MS = 460;
const COLLAPSE_MS = 220;
const TICK_MS = 40;
const ARTICLE_SELECTOR = 'article[data-testid="tweet"]';

interface PageContext {
  ownHandle: string;
  focal: ParentPost | null;
  focalArticle: Element | null;
}

const HOME_PATH = /^\/home(?:[/?#]|$)/;
const SEARCH_PATH = /^\/search(?:[/?#]|$)/;
const STATUS_PATH = /^\/[A-Za-z0-9_]{1,15}\/status\/\d+(?:[/?#]|$)/;

export function isFilteredPage(pathname: string): boolean {
  return HOME_PATH.test(pathname) || SEARCH_PATH.test(pathname) || STATUS_PATH.test(pathname);
}

export class TimelineView implements TimelineViewPort {
  private readonly focalCache = new Map<string, ParentPost>();
  private readonly avatarByHandle = new Map<string, string>();
  private readonly waitingForView = new Map<HTMLElement, IntersectionObserver>();
  private readonly revealed = new Set<string>();

  constructor() {
    this.installStyles();
  }

  onChange(listener: () => void): () => void {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        listener();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }

  scan(questionsKey: string): Post[] {
    const posts: Post[] = [];
    if (!isFilteredPage(location.pathname)) return posts;
    const page = this.pageContext();
    for (const article of document.querySelectorAll<HTMLElement>(ARTICLE_SELECTOR)) {
      if (article.getAttribute(PROCESSED_ATTRIBUTE) === questionsKey) continue;
      article.setAttribute(PROCESSED_ATTRIBUTE, questionsKey);
      const post = this.readArticle(article, page);
      if (!post) continue;
      article.setAttribute(POST_ID_ATTRIBUTE, post.id);
      posts.push(post);
    }
    return posts;
  }

  read(postId: string): Post | null {
    const article = this.articlesOf(postId)[0];
    return article ? this.readArticle(article, this.pageContext()) : null;
  }

  private readArticle(article: Element, page: PageContext): Post | null {
    const post = readPost(article, this.contextFor(article, page));
    if (!post) return null;
    if (post.avatarUrl) {
      this.avatarByHandle.set(post.handle, post.avatarUrl);
      return post;
    }
    return { ...post, avatarUrl: this.avatarByHandle.get(post.handle) ?? '' };
  }

  unmark(postId: string): void {
    for (const article of this.articlesOf(postId)) article.removeAttribute(PROCESSED_ATTRIBUTE);
  }

  hide(postId: string, animate: boolean): void {
    for (const target of this.hideTargetsOf(postId)) {
      if (this.waitingForView.has(target) || this.isHiding(target)) continue;
      if (!animate && this.revealed.has(postId)) {
        this.finishHide(target, false);
        continue;
      }
      this.markWhenVisible(target, postId);
    }
  }

  show(postId: string): void {
    for (const target of this.hideTargetsOf(postId)) {
      this.stopWaiting(target);
      target.classList.remove(FLASH_CLASS, SLIDING_CLASS, HIDING_CLASS, HIDDEN_CLASS);
      target.style.maxHeight = '';
      if (target.parentElement) target.parentElement.style.overflow = '';
    }
  }

  private isHiding(target: HTMLElement): boolean {
    return [HIDDEN_CLASS, HIDING_CLASS, SLIDING_CLASS, FLASH_CLASS].some((name) =>
      target.classList.contains(name),
    );
  }

  private markWhenVisible(target: HTMLElement, postId: string): void {
    const inFocus = (entry: IntersectionObserverEntry): boolean => {
      if (!entry.isIntersecting) return false;
      const top = entry.boundingClientRect.top;
      const viewport = entry.rootBounds?.height ?? window.innerHeight;
      return entry.intersectionRatio >= 0.5 || (top >= 0 && top <= viewport * 0.75);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some(inFocus)) return;
        this.stopWaiting(target);
        this.flashThenCollapse(target, postId);
      },
      { rootMargin: '0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(target);
    this.waitingForView.set(target, observer);
  }

  private flashThenCollapse(target: HTMLElement, postId: string): void {
    target.classList.add(FLASH_CLASS);
    const flashedAt = Date.now();
    const tick = (): void => {
      if (!target.isConnected || !target.classList.contains(FLASH_CLASS)) return;
      if (Date.now() - flashedAt >= FLASH_MS) {
        this.revealed.add(postId);
        this.finishHide(target, true);
        return;
      }
      setTimeout(tick, TICK_MS);
    };
    setTimeout(tick, FLASH_MS);
  }

  private stopWaiting(target: HTMLElement): void {
    this.waitingForView.get(target)?.disconnect();
    this.waitingForView.delete(target);
  }

  private pageContext(): PageContext {
    const ownHandle = readOwnHandle(document);
    const focalId = location.pathname.match(/\/status\/(\d+)/)?.[1] ?? '';
    if (focalId === '') return { ownHandle, focal: null, focalArticle: null };
    const focalArticle =
      Array.from(document.querySelectorAll(ARTICLE_SELECTOR)).find(
        (article) => readPostId(article) === focalId,
      ) ?? null;
    const fromArticle = focalArticle ? readParentPost(focalArticle) : null;
    if (fromArticle?.text) this.focalCache.set(focalId, fromArticle);
    const focal = this.focalCache.get(focalId) ??
      fromArticle ?? {
        id: focalId,
        name: '',
        handle: location.pathname.match(/^\/([A-Za-z0-9_]{1,15})\//)?.[1] ?? '',
        text: '',
        avatarUrl: '',
      };
    return { ownHandle, focal, focalArticle };
  }

  private contextFor(article: Element, page: PageContext): ReadContext {
    const { ownHandle } = page;
    if (!page.focal) {
      return { kind: 'post', parent: null, thread: readPostId(threadHeadOf(article)), ownHandle };
    }
    const isFocal = readPostId(article) === page.focal.id;
    const precedesFocal =
      page.focalArticle !== null &&
      (article.compareDocumentPosition(page.focalArticle) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    if (isFocal || precedesFocal) return { kind: 'post', parent: null, thread: '', ownHandle };
    return { kind: 'reply', parent: page.focal, thread: '', ownHandle };
  }

  private installStyles(): void {
    const styleId = 'anyfilter-hider-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes anyfilter-pulse { 0% { background-color: rgba(249, 115, 22, 0.3); } 50% { background-color: rgba(249, 115, 22, 0.55); } 100% { background-color: rgba(249, 115, 22, 0.3); } }
      .${FLASH_CLASS} { animation: anyfilter-pulse 500ms ease-in-out infinite !important; box-shadow: inset 6px 0 0 #f97316, inset 0 0 0 2px rgba(249, 115, 22, 0.9) !important; }
      @keyframes anyfilter-swipe {
        0% { transform: translateX(0) scale(1); box-shadow: inset 6px 0 0 #f97316, inset 0 0 0 2px rgba(249, 115, 22, 0.9); }
        25% { transform: translateX(0) scale(1.025); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), inset 6px 0 0 #f97316, inset 0 0 0 2px rgba(249, 115, 22, 0.9); }
        100% { transform: translateX(118%) scale(1.025); opacity: 0.5; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), inset 6px 0 0 #f97316, inset 0 0 0 2px rgba(249, 115, 22, 0.9); }
      }
      .${SLIDING_CLASS} { position: relative !important; z-index: 5 !important; background-color: rgba(255, 237, 224, 1) !important; border-radius: 12px !important; animation: anyfilter-swipe ${SLIDE_MS}ms cubic-bezier(0.45, 0, 0.85, 0.35) forwards !important; }
      .${HIDING_CLASS} { overflow: hidden !important; max-height: 0 !important; transition: max-height ${COLLAPSE_MS}ms ease-in !important; }
      .${HIDDEN_CLASS} { display: none !important; }
    `;
    (document.head ?? document.documentElement).append(style);
  }

  private articlesOf(postId: string): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(`${ARTICLE_SELECTOR}[${POST_ID_ATTRIBUTE}="${postId}"]`),
    );
  }

  private hideTargetsOf(postId: string): HTMLElement[] {
    const targets: HTMLElement[] = [];
    for (const article of this.articlesOf(postId)) {
      const cell = article.closest<HTMLElement>('[data-testid="cellInnerDiv"]');
      const target = cell?.firstElementChild;
      if (target instanceof HTMLElement) targets.push(target);
    }
    return targets;
  }

  private finishHide(target: HTMLElement, animate: boolean): void {
    const cell = target.parentElement;
    const done = (): void => {
      target.classList.remove(FLASH_CLASS, SLIDING_CLASS, HIDING_CLASS);
      target.classList.add(HIDDEN_CLASS);
      target.style.maxHeight = '';
      if (cell) cell.style.overflow = '';
    };
    if (!animate) {
      done();
      return;
    }
    if (cell) cell.style.overflow = 'hidden';
    target.style.maxHeight = `${target.offsetHeight}px`;
    target.classList.remove(FLASH_CLASS);
    target.classList.add(SLIDING_CLASS);
    setTimeout(() => {
      if (!target.classList.contains(SLIDING_CLASS)) return;
      target.classList.add(HIDING_CLASS);
      setTimeout(() => {
        if (target.classList.contains(HIDING_CLASS)) done();
      }, COLLAPSE_MS);
    }, SLIDE_MS);
  }
}
