import type { ClassifyResult } from './messages';
import type { Post } from './post';

export interface ClassifierPort {
  classify(
    post: Post,
    questions: Record<string, string>,
    questionsKey: string,
  ): Promise<ClassifyResult>;
}
