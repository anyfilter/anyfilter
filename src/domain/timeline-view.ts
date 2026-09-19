import type { Post } from './post';

export interface TimelineView {
  scan(questionsKey: string): Post[];
  read(postId: string): Post | null;
  unmark(postId: string): void;
  hide(postId: string, animate: boolean): void;
  show(postId: string): void;
  onChange(listener: () => void): () => void;
}
