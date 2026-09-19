import { useState } from 'react';
import type { HiddenEntry } from '../../domain/panel-state';
import { postUrl } from '../../domain/post';
import { reasonText, type Reason } from '../../domain/verdict';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';

const ACTION_CLASS = 'rounded-full border border-[#cfd9de] bg-white px-3 py-1 text-xs font-bold text-ink';

export function HiddenRow({
  entry,
  reason,
  onOverride,
}: {
  entry: HiddenEntry;
  reason: Reason;
  onOverride: (postId: string, shown: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const { post } = entry;
  return (
    <div className="anyfilter-slide">
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-surface ${entry.shown ? 'opacity-50' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <Avatar url={post.avatarUrl} size="sm" />
        <span className="min-w-0 flex-1 truncate text-ink-2">
          <b className="text-ink">{post.name || `@${post.handle}`}</b> {post.text}
        </span>
        <span className="text-xs tabular-nums text-ink-2">
          {reason.categoryId === 'ads' ? 'ad' : `${Math.round(reason.probability * 100)}%`}
        </span>
      </button>
      {open && (
        <PostCard post={post}>
          <button
            type="button"
            className={ACTION_CLASS}
            onClick={() => void onOverride(post.id, !entry.shown)}
          >
            {entry.shown ? 'Hide again' : 'Put back in feed'}
          </button>
          <a className={ACTION_CLASS} href={postUrl(post)} target="_blank" rel="noreferrer">
            Open on X ↗
          </a>
          <span>{entry.reasons.map(reasonText).join(' · ')}</span>
        </PostCard>
      )}
    </div>
  );
}
