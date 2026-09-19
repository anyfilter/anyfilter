export type PostKind = 'post' | 'reply';

export interface ParentPost {
  id: string;
  name: string;
  handle: string;
  text: string;
  avatarUrl: string;
}

export interface Post {
  id: string;
  kind: PostKind;
  parent: ParentPost | null;
  thread: string;
  own: boolean;
  name: string;
  handle: string;
  time: string;
  text: string;
  promoted: boolean;
  avatarUrl: string;
  imageUrls: string[];
  hasVideo: boolean;
  quotedName: string;
  quotedText: string;
  truncated: boolean;
}

export function postUrl(post: Post): string {
  return statusUrl(post.handle, post.id);
}

export function statusUrl(handle: string, id: string): string {
  return `https://x.com/${handle || 'i'}/status/${id}`;
}

export function profileUrl(handle: string): string {
  return `https://x.com/${handle}`;
}

export function isParentPost(value: unknown): value is ParentPost {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.handle === 'string' &&
    typeof record.text === 'string' &&
    typeof record.avatarUrl === 'string'
  );
}

export function isPost(value: unknown): value is Post {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    (record.kind === 'post' || record.kind === 'reply') &&
    (record.parent === null || isParentPost(record.parent)) &&
    typeof record.thread === 'string' &&
    typeof record.own === 'boolean' &&
    typeof record.name === 'string' &&
    typeof record.handle === 'string' &&
    typeof record.time === 'string' &&
    typeof record.text === 'string' &&
    typeof record.promoted === 'boolean' &&
    typeof record.avatarUrl === 'string' &&
    Array.isArray(record.imageUrls) &&
    record.imageUrls.every((url) => typeof url === 'string') &&
    typeof record.hasVideo === 'boolean' &&
    typeof record.quotedName === 'string' &&
    typeof record.quotedText === 'string' &&
    typeof record.truncated === 'boolean'
  );
}
