import { groupByReason, hiddenOfKind, type PanelState } from '../../domain/panel-state';
import type { PostKind } from '../../domain/post';
import { ReasonAccordion } from './ReasonAccordion';
import { useBump } from './use-bump';

const SECTIONS: ReadonlyArray<{ kind: PostKind; title: string; empty: string }> = [
  { kind: 'post', title: 'Posts hidden', empty: 'None yet.' },
  { kind: 'reply', title: 'Replies hidden', empty: 'None yet.' },
];

function Section({
  title,
  empty,
  kind,
  state,
  labelOrder,
  onOverride,
}: {
  title: string;
  empty: string;
  kind: PostKind;
  state: PanelState;
  labelOrder: readonly string[];
  onOverride: (postId: string, shown: boolean) => Promise<void>;
}) {
  const entries = hiddenOfKind(state, kind);
  const added = useBump(entries.length);
  const groups = groupByReason(entries, labelOrder);
  return (
    <section className="rounded-xl border border-line bg-white p-3.5" data-anyfilter-section={kind}>
      <div className="mb-1 flex items-center">
        <h2 className="m-0 text-[15px] font-bold text-ink">{title}</h2>
        <span
          className={`ml-auto text-[13px] tabular-nums ${added > 0 ? 'anyfilter-bump text-hide' : 'text-ink-2'}`}
        >
          {entries.length}
        </span>
      </div>
      {groups.length === 0 ? (
        <p className="m-0 py-1.5 text-ink-2">{empty}</p>
      ) : (
        groups.map((group) => (
          <ReasonAccordion key={group.label} group={group} kind={kind} onOverride={onOverride} />
        ))
      )}
    </section>
  );
}

export function HiddenGroups({
  state,
  labelOrder,
  onOverride,
}: {
  state: PanelState;
  labelOrder: readonly string[];
  onOverride: (postId: string, shown: boolean) => Promise<void>;
}) {
  const populated = SECTIONS.filter((section) => hiddenOfKind(state, section.kind).length > 0);
  if (populated.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white p-3.5" data-anyfilter-section="post">
        <h2 className="m-0 text-[15px] font-bold text-ink">Posts hidden</h2>
        <p className="m-0 py-1.5 text-ink-2">Nothing hidden yet. Scroll your timeline to start.</p>
      </section>
    );
  }
  return (
    <>
      {populated.map((section) => (
        <Section
          key={section.kind}
          title={section.title}
          empty={section.empty}
          kind={section.kind}
          state={state}
          labelOrder={labelOrder}
          onOverride={onOverride}
        />
      ))}
    </>
  );
}
