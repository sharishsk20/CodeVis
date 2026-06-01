import type { TraceStep, StackFrame } from '../types/trace';
import { SectionLabel } from './ArrayViz';

interface Props {
  step:     TraceStep | undefined;
  prevStep: TraceStep | undefined;
}

// ── Type badge colors ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  int:        '#ef9f27',
  float:      '#ef9f27',
  bool:       '#38bdf8',
  str:        '#3fb950',
  list:       '#a855f7',
  'list[int]':   '#a855f7',
  'list[float]': '#a855f7',
  'list[str]':   '#a855f7',
  tuple:         '#a855f7',
  'tuple[int]':  '#a855f7',
  dict:          '#22d3ee',
  set:           '#ec4899',
  frozenset:     '#ec4899',
  None:          '#484f58',
  function:      '#8b949e',
  type:          '#8b949e',
};

function typeColor(t: string): string {
  return TYPE_COLORS[t] ?? '#8b949e';
}

function TypePill({ t }: { t: string }) {
  const color = typeColor(t);
  return (
    <span style={{
      fontSize: 9, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
      background: `${color}18`, border: `1px solid ${color}35`,
      color, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
    }}>{t}</span>
  );
}

// ── Value formatter ───────────────────────────────────────────────────────────

function fmtVal(v: any, type?: string): string {
  if (v === null || v === 'NULL') return 'null';
  if (v === undefined || v === '?') return '?';
  if (type === 'str' && typeof v === 'string') return `"${v.length > 40 ? v.slice(0, 37) + '…' : v}"`;
  if (type === 'bool' || typeof v === 'boolean') return v ? 'True' : 'False';
  if (type === 'None' || v === 'None') return 'None';
  if (Array.isArray(v)) {
    const items = (v as any[]).slice(0, 12).map((x) => fmtVal(x)).join(', ');
    const suffix = v.length > 12 ? `, …+${v.length - 12}` : '';
    return `[${items}${suffix}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, any>);
    const shown = entries.slice(0, 4).map(([k, val]) => `${k}: ${fmtVal(val)}`).join(', ');
    const suffix = entries.length > 4 ? `, …+${entries.length - 4}` : '';
    return `{${shown}${suffix}}`;
  }
  if (typeof v === 'string') return v; // pointer-style strings (C++): no quotes
  return String(v);
}

// ── Changed-key detector ──────────────────────────────────────────────────────

function changedKeys(
  frame: StackFrame,
  prevStack: StackFrame[] | undefined,
  field: 'locals' | 'globals',
): Set<string> {
  const prev    = prevStack?.find((f) => f.func === frame.func);
  const prevMap = (field === 'locals' ? prev?.locals : prev?.globals) ?? {};
  const curMap  = (field === 'locals' ? frame.locals : frame.globals) ?? {};
  return new Set(
    Object.keys(curMap).filter(
      (k) => JSON.stringify(curMap[k]) !== JSON.stringify(prevMap[k]),
    ),
  );
}

// ── Variable row ──────────────────────────────────────────────────────────────

function VarRow({ name, value, type, changed, isPtr }: {
  name: string; value: any; type?: string; changed: boolean; isPtr?: boolean;
}) {
  const color = changed
    ? 'var(--accent-blue)'
    : isPtr
    ? '#378ADD'
    : 'var(--text-primary)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', minHeight: 22,
      background: changed ? 'rgba(55,138,221,0.08)' : 'transparent',
      transition: 'background 0.4s ease',
      borderLeft: changed ? '2px solid rgba(55,138,221,0.5)' : '2px solid transparent',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11.5,
        color: 'var(--text-secondary)', flexShrink: 0,
        minWidth: 60,
      }}>{name}</span>

      {type && <TypePill t={type} />}

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11.5, color,
        transition: 'color 0.3s ease',
        marginLeft: 'auto', textAlign: 'right',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 160,
      }}>{fmtVal(value, type)}</span>
    </div>
  );
}

// ── Return value badge ────────────────────────────────────────────────────────

function ReturnBadge({ val }: { val: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
      background: 'rgba(29,158,117,0.08)',
      borderLeft: '2px solid rgba(29,158,117,0.5)',
    }}>
      <span style={{ fontSize: 9, color: '#2dd4a8', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>↩ return</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#2dd4a8',
        marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
      }}>{val}</span>
    </div>
  );
}

// ── Stack panel ───────────────────────────────────────────────────────────────

export default function StackPanel({ step, prevStep }: Props) {
  if (!step?.stack?.length) return null;

  const isReturnStep = step.event === 'return';
  const returnNote   = isReturnStep ? step.note ?? '' : '';

  return (
    <div>
      <SectionLabel>call stack</SectionLabel>
      {/* Bottom frame first → visually top frame is active (topmost) */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 5 }}>
        {step.stack.map((frame, fi) => {
          const isTop      = fi === step.stack.length - 1;
          const changedLo  = changedKeys(frame, prevStep?.stack, 'locals');
          const changedGl  = changedKeys(frame, prevStep?.stack, 'globals');
          const hasLocals  = Object.keys(frame.locals ?? {}).length > 0;
          const hasGlobals = Object.keys(frame.globals ?? {}).length > 0;
          const showReturn = isTop && isReturnStep && returnNote;

          return (
            <div key={fi} style={{
              background: isTop ? 'var(--bg-surface)' : 'var(--bg-active)',
              border: `1px solid ${isTop ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
              borderRadius: 7, overflow: 'hidden',
              boxShadow: isTop ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}>
              {/* Frame header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
                borderBottom: (hasLocals || hasGlobals || showReturn) ? '1px solid var(--border)' : 'none',
                background: isTop
                  ? 'rgba(255,255,255,0.03)'
                  : 'transparent',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: isTop
                    ? (isReturnStep ? '#2dd4a8' : 'var(--accent-teal)')
                    : 'var(--text-tertiary)',
                  boxShadow: isTop ? '0 0 6px rgba(29,158,117,0.5)' : 'none',
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: isTop ? 600 : 400,
                  color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>{frame.func === '<module>' ? '⟨module⟩' : `${frame.func}()`}</span>
                {isTop && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9.5, fontFamily: 'var(--font-mono)',
                    color: isReturnStep ? '#2dd4a8' : 'var(--text-tertiary)',
                    background: isReturnStep ? 'rgba(29,158,117,0.1)' : 'transparent',
                    padding: isReturnStep ? '1px 6px' : '0',
                    borderRadius: 4,
                  }}>
                    {isReturnStep ? '↩ returning' : '← active'}
                  </span>
                )}
              </div>

              {/* Locals */}
              {hasLocals && (
                <div>
                  {Object.entries(frame.locals).map(([k, v]) => (
                    <VarRow
                      key={k} name={k} value={v}
                      type={frame.types?.[k]}
                      changed={changedLo.has(k)}
                    />
                  ))}
                </div>
              )}

              {/* Return value */}
              {showReturn && (
                <ReturnBadge val={returnNote.replace(/^return\s*/, '')} />
              )}

              {/* Globals */}
              {hasGlobals && (
                <div style={{ borderTop: hasLocals ? '1px solid var(--border)' : 'none' }}>
                  <div style={{
                    padding: '3px 10px 1px', fontSize: 9,
                    letterSpacing: '0.08em', color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                  }}>GLOBALS</div>
                  {Object.entries(frame.globals!).map(([k, v]) => (
                    <VarRow key={k} name={k} value={v} changed={changedGl.has(k)} isPtr />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
