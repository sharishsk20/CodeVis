import type { TraceStep } from '../types/trace';

interface Props {
  step: TraceStep | undefined;
}

interface Found {
  name: string;
  arr:  number[];
  i:    number;
  j:    number;
}

function findArray(step: TraceStep | undefined): Found | null {
  if (!step) return null;
  // Look in all frames, innermost first
  for (let fi = step.stack.length - 1; fi >= 0; fi--) {
    const frame = step.stack[fi];
    const i = typeof frame.locals.i === 'number' ? frame.locals.i : -1;
    const j = typeof frame.locals.j === 'number' ? frame.locals.j : -1;

    for (const [name, val] of Object.entries(frame.locals)) {
      if (
        Array.isArray(val) &&
        val.length >= 2 &&
        val.every((x) => typeof x === 'number')
      ) {
        return { name, arr: val as number[], i, j };
      }
    }
  }
  return null;
}

export default function ArrayViz({ step }: Props) {
  const found = findArray(step);
  if (!found) return null;

  const { name, arr, i, j } = found;
  const max       = Math.max(...arr, 1);
  const n         = arr.length;
  const sortedFrom = i >= 0 ? n - i : n + 1;
  // Highlight j and j+1 whenever they're valid adjacent indices
  const highlighting = j >= 0 && j + 1 < n;

  return (
    <div>
      <SectionLabel>
        {name}
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
          list[int] · {n} items
        </span>
      </SectionLabel>
      <div style={{
        display: 'flex', gap: 6, alignItems: 'flex-end', height: 96,
        padding: '0 4px',
      }}>
        {arr.map((v, x) => {
          const isComparing = highlighting && (x === j || x === j + 1);
          const isSorted    = x >= sortedFrom;

          const barColor = isComparing ? '#a0650f' : isSorted ? '#0F6E56' : '#2d333b';

          const numColor = isComparing ? '#EF9F27' : isSorted ? '#2dd4a8' : 'var(--text-secondary)';
          const barH     = Math.max(6, Math.round((v / max) * 74));

          return (
            <div key={x} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10.5, color: numColor,
                fontWeight: isComparing ? 700 : 400,
                transition: 'color 0.2s',
              }}>{v}</span>
              <div style={{
                width: '100%', borderRadius: '3px 3px 2px 2px',
                height: barH, background: barColor,
                transition: 'height 0.28s cubic-bezier(0.4,0,0.2,1), background 0.2s ease',
                boxShadow: isComparing ? '0 0 8px rgba(239,159,39,0.25)' : 'none',
                outline: isComparing ? '1px solid rgba(239,159,39,0.3)' : 'none',
              }} />
              <span style={{
                fontSize: 9, color: x === j ? '#ef9f27' : x === j + 1 && highlighting ? '#ef9f2788' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}>{x}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared section label ──────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      color: 'var(--text-tertiary)', marginBottom: 7,
      textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4,
    }}>{children}</div>
  );
}
