import type { ReactNode } from 'react';
import { postUrl, profileUrl, type Post } from '../../domain/post';
import { Avatar } from './Avatar';

function ImageGrid({ urls }: { urls: string[] }) {
  const columns = urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
  const height = urls.length === 1 ? 'max-h-64' : 'h-28';
  return (
    <div className={`mt-2.5 grid ${columns} gap-0.5 overflow-hidden rounded-2xl border border-line`}>
      {urls.slice(0, 4).map((url) => (
        <img key={url} className={`w-full object-cover ${height}`} src={url} alt="" />
      ))}
    </div>
  );
}

export function PostCard({ post, children }: { post: Post; children: ReactNode }) {
  const profile = profileUrl(post.handle);
  return (
    <article className="mx-1 mb-2 rounded-2xl border border-line bg-white px-3 pt-3 pb-2">
      <div className="flex gap-2.5">
        <a href={profile} target="_blank" rel="noreferrer" className="flex-none">
          <Avatar url={post.avatarUrl} size="lg" />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 truncate text-[14px] leading-5">
            <a href={profile} target="_blank" rel="noreferrer" className="truncate font-bold text-ink hover:underline">
              {post.name || `@${post.handle}`}
            </a>
            <a href={profile} target="_blank" rel="noreferrer" className="truncate text-ink-2 hover:underline">
              @{post.handle}
            </a>
            {post.time && (
              <a href={postUrl(post)} target="_blank" rel="noreferrer" className="flex-none text-ink-2 hover:underline">
                · {post.time}
              </a>
            )}
          </div>
          <a href={postUrl(post)} target="_blank" rel="noreferrer" className="mt-0.5 block whitespace-pre-wrap text-[14px] leading-5 text-ink">
            {post.text}
          </a>
          {post.truncated && (
            <a className="text-[14px] text-sky-500" href={postUrl(post)} target="_blank" rel="noreferrer">
              Show more
            </a>
          )}
          {post.imageUrls.length > 0 && <ImageGrid urls={post.imageUrls} />}
          {post.hasVideo && (
            <div className="mt-2.5 grid h-24 place-items-center rounded-2xl border border-line bg-surface text-ink-2">
              ▶ Video
            </div>
          )}
          {post.quotedText && (
            <div className="mt-2.5 rounded-2xl border border-line px-3 py-2 text-[13px] leading-5">
              {post.quotedName && <div className="font-bold text-ink">{post.quotedName}</div>}
              <div className="whitespace-pre-wrap text-ink">{post.quotedText}</div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2 text-xs text-ink-2">
        {children}
      </div>
    </article>
  );
}
