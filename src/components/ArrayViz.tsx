import type { TraceStep } from '../types/trace';

interface Props { step: TraceStep | undefined }

interface Found { name: string; arr: number[]; i: number; j: number }

function findArray(step: TraceStep | undefined): Found | null {
  if (!step) return null;
  for (let fi = step.stack.length - 1; fi >= 0; fi--) {
    const frame = step.stack[fi];
    const i = typeof frame.locals.i === 'number' ? frame.locals.i : -1;
    const j = typeof frame.locals.j === 'number' ? frame.locals.j : -1;
    for (const [name, val] of Object.entries(frame.locals)) {
      if (Array.isArray(val) && val.length >= 2 && val.every((x) => typeof x === 'number'))
        return { name, arr: val as number[], i, j };
    }
  }
  return null;
}

export default function ArrayViz({ step }: Props) {
  const found = findArray(step);
  if (!found) return null;

  const { name, arr, i, j } = found;
  const max        = Math.max(...arr, 1);
  const n          = arr.length;
  const sortedFrom = i >= 0 ? n - i : n + 1;
  const comparing  = j >= 0 && j + 1 < n;

  return (
    <div>
      <SectionLabel>
        {name}
        <span style={{ color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>
          list[int] · {n} items
        </span>
      </SectionLabel>

      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 108, padding: '0 2px' }}>
        {arr.map((v, x) => {
          const isComparing = comparing && (x === j || x === j + 1);
          const isSorted    = x >= sortedFrom;
          const barH        = Math.max(6, Math.round((v / max) * 88));

          const barBg  = isComparing ? 'rgba(245,158,11,0.3)'  : isSorted ? 'rgba(52,211,153,0.2)' : 'var(--surf)';
          const barBdr = isComparing ? 'rgba(245,158,11,0.6)'  : isSorted ? 'rgba(52,211,153,0.5)' : 'var(--line-hover)';
          const numC   = isComparing ? 'var(--amber)' : isSorted ? 'var(--green)' : 'var(--t2)';

          return (
            <div key={x} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, color: numC,
                fontWeight: isComparing ? 700 : 400, transition: 'color 0.18s',
              }}>{v}</span>
              <div style={{
                width: '100%', height: barH,
                background: barBg, border: `1px solid ${barBdr}`,
                borderRadius: '3px 3px 2px 2px',
                transition: 'height 0.24s cubic-bezier(0.4,0,0.2,1), background 0.18s, border-color 0.18s',
              }} />
              <span style={{
                fontSize: 9, fontFamily: 'var(--mono)',
                color: isComparing ? 'var(--amber)' : 'var(--t3)',
              }}>{x}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shared section label ─────────────────────────────────────────────────────── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--t3)', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>{children}</div>
  );
}
