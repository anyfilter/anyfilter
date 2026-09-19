import { useState } from 'react';
import { groupByParent, type ReasonEntry, type ReasonGroup } from '../../domain/panel-state';
import { statusUrl, type ParentPost, type PostKind } from '../../domain/post';
import { Avatar } from './Avatar';
import { HiddenRow } from './HiddenRow';
import { useBump } from './use-bump';

function ParentLine({ parent }: { parent: ParentPost | null }) {
  if (!parent) {
    return <div className="rounded-md bg-surface px-2 py-1 text-[11px] text-ink-2">In a conversation</div>;
  }
  return (
    <a
      className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-[11px] text-ink-2 hover:underline"
      href={statusUrl(parent.handle, parent.id)}
      target="_blank"
      rel="noreferrer"
      title={parent.text}
    >
      <span className="flex-none">Replies under</span>
      <Avatar url={parent.avatarUrl} size="xs" />
      <span className="flex-none">{parent.name || `@${parent.handle}`}</span>
      <span className="min-w-0 truncate opacity-70">{parent.text}</span>
    </a>
  );
}

function Rows({
  entries,
  onOverride,
}: {
  entries: ReasonEntry[];
  onOverride: (postId: string, shown: boolean) => Promise<void>;
}) {
  return (
    <>
      {entries.map(({ entry, reason }) => (
        <HiddenRow key={entry.post.id} entry={entry} reason={reason} onOverride={onOverride} />
      ))}
    </>
  );
}

export function ReasonAccordion({
  group,
  kind,
  onOverride,
}: {
  group: ReasonGroup;
  kind: PostKind;
  onOverride: (postId: string, shown: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const count = group.entries.length;
  const added = useBump(count);
  const faces = group.entries.slice(0, 5).map(({ entry }) => entry.post);
  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="flex-1 truncate font-bold">{group.label}</span>
        <span className="relative flex flex-none">
          {faces.map((post, index) => (
            <span
              key={post.id}
              className={`-ml-1.5 rounded-full ring-2 first:ml-0 ${added > 0 && index === 0 ? 'ring-hide' : 'ring-white'}`}
            >
              <Avatar url={post.avatarUrl} size="xs" />
            </span>
          ))}
          {added > 0 && (
            <span className="anyfilter-pop absolute -top-2.5 -right-2 rounded-full bg-hide px-1 text-[9px] font-bold leading-3.5 text-white">
              +{added}
            </span>
          )}
        </span>
        <span
          className={`min-w-4 text-right font-bold tabular-nums text-hide ${added > 0 ? 'anyfilter-bump' : ''}`}
        >
          {count}
        </span>
        <span
          className={`text-ink-2 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {open &&
        (kind === 'reply' ? (
          groupByParent(group.entries).map((parentGroup) => (
            <div key={parentGroup.parent?.id ?? ''} className="pb-2">
              <ParentLine parent={parentGroup.parent} />
              <div className="ml-3 border-l-2 border-line pl-1">
                <Rows entries={parentGroup.entries} onOverride={onOverride} />
              </div>
            </div>
          ))
        ) : (
          <div className="pb-1">
            <Rows entries={group.entries} onOverride={onOverride} />
          </div>
        ))}
    </div>
  );
}
