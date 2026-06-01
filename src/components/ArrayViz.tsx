/**
 * ArrayViz — animated bar chart for numeric arrays.
 *
 * Auto-detects the first numeric array in the top frame's locals.
 * Highlights the two elements being compared (amber) and the already-
 * sorted suffix (teal) based on i / j loop variables.
 */

import type { TraceStep } from '../types/trace';

interface Props {
  step: TraceStep | undefined;
}

function findArray(step: TraceStep | undefined): { arr: number[]; i: number; j: number } | null {
  if (!step) return null;
  const top = step.stack[step.stack.length - 1];
  if (!top) return null;

  // Find the first local that is a numeric array (>= 2 elements)
  for (const val of Object.values(top.locals)) {
    if (
      Array.isArray(val) &&
      val.length >= 2 &&
      val.every((x) => typeof x === 'number')
    ) {
      const i = typeof top.locals.i === 'number' ? top.locals.i : -1;
      const j = typeof top.locals.j === 'number' ? top.locals.j : -1;
      return { arr: val as number[], i, j };
    }
  }
  return null;
}

export default function ArrayViz({ step }: Props) {
  const found = findArray(step);
  if (!found) return null;

  const { arr, i, j } = found;
  const max        = Math.max(...arr, 1);
  const n          = arr.length;
  const sortedFrom = i >= 0 ? n - i : n + 1;
  // Only highlight comparison bars when on the if-check or swap line
  const onCmpLine  = step?.line === 5 || step?.line === 6;

  return (
    <div>
      <SectionLabel>array state</SectionLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100, padding: '0 4px' }}>
        {arr.map((v, x) => {
          const isComparing = onCmpLine && (x === j || x === j + 1);
          const isSorted    = x >= sortedFrom;
          const barH        = Math.max(6, Math.round((v / max) * 78));

          const barColor = isComparing
            ? '#BA7517'
            : isSorted
            ? '#0F6E56'
            : 'var(--bg-hover)';
          const numColor = isComparing
            ? '#EF9F27'
            : isSorted
            ? '#1D9E75'
            : 'var(--text-secondary)';

          return (
            <div key={x} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: numColor, fontWeight: isComparing ? 600 : 400,
                transition: 'color 0.2s',
              }}>{v}</span>
              <div style={{
                width: '100%', borderRadius: 3,
                height: barH,
                background: barColor,
                transition: 'height 0.3s ease, background 0.2s ease',
              }} />
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{x}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shared section label style
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      color: 'var(--text-tertiary)', marginBottom: 6,
      textTransform: 'uppercase',
    }}>{children}</div>
  );
}
