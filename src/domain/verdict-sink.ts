import type { Post } from './post';
import type { Reason } from './verdict';

export interface VerdictSink {
  report(post: Post, reasons: Reason[], tokens: number): void;
}
