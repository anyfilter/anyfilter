import {
  allCategories,
  questionsFor,
  questionsKey as questionsKeyOf,
  type Category,
} from '../domain/category';
import type { ClassifierPort } from '../domain/classifier-port';
import type { ClassifyError } from '../domain/messages';
import type { Post } from '../domain/post';
import { activeKey, enabledCategories, type Settings } from '../domain/settings';
import type { TimelineView } from '../domain/timeline-view';
import { matchReasons, type Reason, type Scores } from '../domain/verdict';
import type { VerdictSink } from '../domain/verdict-sink';

type KnownPost =
  | { status: 'pending'; post: Post }
  | { status: 'scored'; post: Post; scores: Scores; reasons: Reason[]; questionsKey: string }
  | { status: 'rule-only'; post: Post; reasons: Reason[] }
  | { status: 'failed'; post: Post; error: ClassifyError };

const RETRYABLE_ERRORS: readonly ClassifyError[] = ['rate-limited', 'network'];

function sameReasons(a: Reason[], b: Reason[]): boolean {
  return (
    a.length === b.length && a.every((reason, i) => reason.categoryId === b[i].categoryId)
  );
}

export class FeedFilter {
  private settings: Settings;
  private categories: Category[] = [];
  private questions: Record<string, string> = {};
  private questionsKey = '';
  private readonly known = new Map<string, KnownPost>();
  private readonly threads = new Map<string, Set<string>>();
  private readonly overrides = new Map<string, boolean>();
  private readonly awaitingAvatar = new Set<string>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopObserving: (() => void) | null = null;

  constructor(
    private readonly view: TimelineView,
    private readonly classifier: ClassifierPort,
    private readonly sink: VerdictSink,
    settings: Settings,
  ) {
    this.settings = settings;
    this.deriveQuestions();
  }

  start(): void {
    this.stopObserving = this.view.onChange(() => this.scan());
    this.scan();
  }

  stop(): void {
    this.stopObserving?.();
    this.stopObserving = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  applySettings(next: Settings): void {
    const previous = this.settings;
    this.settings = next;
    this.deriveQuestions();
    const credentialsChanged =
      activeKey(previous) !== activeKey(next) || previous.provider !== next.provider;
    if (credentialsChanged) this.forgetFailed(() => true);
    this.reapply();
    this.scan();
  }

  override(postId: string, shown: boolean): void {
    this.overrides.set(postId, shown);
    this.apply(postId, true);
  }

  private deriveQuestions(): void {
    this.categories = allCategories(this.settings.custom);
    this.questions = questionsFor(this.categories, this.enabled());
    this.questionsKey = questionsKeyOf(this.questions);
  }

  private enabled(): ReadonlySet<string> {
    return enabledCategories(this.settings);
  }

  private reasonsFor(post: Post, scores: Scores): Reason[] {
    return matchReasons(post, scores, this.categories, this.enabled(), this.settings.threshold);
  }

  private scan(): void {
    if (!this.settings.filterOn) return;
    for (const post of this.view.scan(this.questionsKey)) {
      this.remember(post);
      const known = this.known.get(post.id);
      const stale = known?.status === 'scored' && known.questionsKey !== this.questionsKey;
      if (!known || stale) {
        void this.evaluate(post);
        continue;
      }
      this.apply(post.id, false);
    }
    this.refreshAvatars();
  }

  private refreshAvatars(): void {
    for (const postId of this.awaitingAvatar) {
      const known = this.known.get(postId);
      if (!known || (known.status !== 'scored' && known.status !== 'rule-only')) {
        this.awaitingAvatar.delete(postId);
        continue;
      }
      const latest = this.view.read(postId);
      if (!latest || latest.avatarUrl === '') continue;
      known.post = latest;
      this.awaitingAvatar.delete(postId);
      this.sink.report(latest, known.reasons, 0);
    }
  }

  private report(post: Post, reasons: Reason[], tokens: number): void {
    this.sink.report(post, reasons, tokens);
    if (reasons.length > 0 && post.avatarUrl === '') this.awaitingAvatar.add(post.id);
  }

  private async evaluate(post: Post): Promise<void> {
    if (post.own) {
      this.known.set(post.id, { status: 'rule-only', post, reasons: [] });
      this.view.show(post.id);
      return;
    }
    if (post.promoted || post.text === '') {
      this.known.set(post.id, { status: 'rule-only', post, reasons: this.reasonsFor(post, {}) });
      this.apply(post.id, true);
      this.report(post, this.reasonsOf(post.id), 0);
      return;
    }
    this.known.set(post.id, { status: 'pending', post });
    const questionsKey = this.questionsKey;
    const result = await this.classifier.classify(post, this.questions, questionsKey);
    if (!result.ok) {
      this.known.set(post.id, { status: 'failed', post, error: result.error });
      if (RETRYABLE_ERRORS.includes(result.error)) this.scheduleRetry();
      return;
    }
    const latest = this.view.read(post.id) ?? post;
    const reasons = this.reasonsFor(latest, result.scores);
    this.known.set(post.id, {
      status: 'scored',
      post: latest,
      scores: result.scores,
      reasons,
      questionsKey,
    });
    this.apply(post.id, true);
    this.report(latest, reasons, result.tokens);
  }

  private reasonsOf(postId: string): Reason[] {
    const known = this.known.get(postId);
    return known && (known.status === 'scored' || known.status === 'rule-only')
      ? known.reasons
      : [];
  }

  private remember(post: Post): void {
    const members = this.threads.get(post.thread) ?? new Set<string>();
    members.add(post.id);
    this.threads.set(post.thread, members);
  }

  private threadOf(postId: string): Iterable<string> {
    const thread = this.known.get(postId)?.post.thread;
    return (thread && this.threads.get(thread)) ?? [postId];
  }

  private flagged(postId: string): boolean {
    return this.reasonsOf(postId).length > 0 && this.overrides.get(postId) !== true;
  }

  private apply(postId: string, animate: boolean): void {
    const members = [...this.threadOf(postId)];
    const shouldHide = this.settings.filterOn && members.some((member) => this.flagged(member));
    for (const member of members) {
      if (shouldHide && !this.known.get(member)?.post.own) this.view.hide(member, animate);
      else this.view.show(member);
    }
  }

  private reapply(): void {
    for (const [postId, known] of this.known) {
      if (known.status === 'scored' || known.status === 'rule-only') {
        const scores = known.status === 'scored' ? known.scores : {};
        const reasons = this.reasonsFor(known.post, scores);
        if (!sameReasons(reasons, known.reasons)) {
          known.reasons = reasons;
          this.report(known.post, reasons, 0);
        }
      }
      this.apply(postId, true);
    }
  }

  private forgetFailed(matches: (error: ClassifyError) => boolean): void {
    for (const [postId, known] of this.known) {
      if (known.status === 'failed' && matches(known.error)) {
        this.known.delete(postId);
        this.view.unmark(postId);
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.forgetFailed((error) => RETRYABLE_ERRORS.includes(error));
      this.scan();
    }, 25_000);
  }
}
