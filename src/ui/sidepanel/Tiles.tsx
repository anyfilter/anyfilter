import {
  costOf,
  hiddenCount,
  scannedCount,
  secondsSaved,
  type PanelState,
} from '../../domain/panel-state';
import { formatDuration } from './format-duration';
import { useCombo } from './use-combo';
import { useCountUp } from './use-count-up';

function Tile({
  label,
  value,
  format,
  tone,
  bump = false,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  tone?: 'hide' | 'keep';
  bump?: boolean;
}) {
  const displayed = useCountUp(value);
  const combo = useCombo(value);
  const toneClass = tone === 'hide' ? 'text-hide' : tone === 'keep' ? 'text-keep' : '';
  const bumping = bump && combo.count > 0;
  const comboScale = Math.min(1 + (combo.count - 1) * 0.12, 1.8);
  return (
    <div className="flex min-h-14.5 flex-col justify-end rounded-lg bg-surface px-2.5 py-2">
      <div className="text-[11px] text-ink-2">{label}</div>
      <div className="relative inline-block self-start">
        <span
          key={bumping ? combo.hit : 0}
          className={`whitespace-nowrap text-[22px] font-extrabold leading-tight tracking-tight tabular-nums ${toneClass} ${bumping ? 'anyfilter-bump origin-left' : ''}`}
        >
          {format(displayed)}
        </span>
        {bumping && (
          <span
            className="absolute -top-2 left-full ml-1 origin-bottom-left"
            style={{ transform: `scale(${comboScale})` }}
          >
            <span
              key={combo.hit}
              className="anyfilter-pop block rounded-full bg-hide px-1.5 text-[11px] font-bold leading-4 text-white"
            >
              +{combo.count}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

const asInt = (value: number): string => String(Math.round(value));
const asCompact = (value: number): string => {
  const rounded = Math.round(value);
  if (rounded < 10_000) return String(rounded);
  if (rounded < 1_000_000) return `${(rounded / 1_000).toFixed(rounded < 100_000 ? 1 : 0)}K`;
  return `${(rounded / 1_000_000).toFixed(rounded < 10_000_000 ? 2 : 1)}M`;
};
const asDollars = (value: number): string =>
  value > 0 && value < 0.001 ? '<$0.001' : `$${value.toFixed(3)}`;

export function Tiles({ state }: { state: PanelState }) {
  const hidden = hiddenCount(state);
  const scanned = scannedCount(state);
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <Tile label="Hidden posts" value={hidden} format={asInt} tone="hide" bump />
      <Tile label="Kept posts" value={scanned - hidden} format={asInt} tone="keep" />
      <Tile label="Posts scanned" value={scanned} format={asInt} />
      <Tile label="Time saved" value={secondsSaved(state)} format={formatDuration} />
      <Tile label="Spent on Jev" value={costOf(state)} format={asDollars} />
      <Tile label="Tokens used" value={state.tokens} format={asCompact} />
    </div>
  );
}
