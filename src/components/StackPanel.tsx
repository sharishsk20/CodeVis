import type { TraceStep, StackFrame } from '../types/trace';
import { SectionLabel } from './ArrayViz';

interface Props {
  step:     TraceStep | undefined;
  prevStep: TraceStep | undefined;
}

function fmtVal(v: any): string {
  if (v === null || v === 'NULL') return 'NULL';
  if (v === undefined || v === '?') return '?';
  if (Array.isArray(v)) return '[' + (v as any[]).join(', ') + ']';
  return String(v);
}

function changedKeys(
  frame: StackFrame,
  prevStack: StackFrame[] | undefined,
  field: 'locals' | 'globals'
): Set<string> {
  const prev   = prevStack?.find((f) => f.func === frame.func);
  const prevMap = (field === 'locals' ? prev?.locals : prev?.globals) ?? {};
  const curMap  = (field === 'locals' ? frame.locals : frame.globals) ?? {};
  return new Set(
    Object.keys(curMap).filter(
      (k) => JSON.stringify(curMap[k]) !== JSON.stringify(prevMap[k])
    )
  );
}

function VarRow({ name, value, changed, isPtr }: {
  name: string; value: any; changed: boolean; isPtr?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '2px 10px', minHeight: 20,
      background: changed ? 'rgba(55,138,221,0.09)' : 'transparent',
      transition: 'background 0.5s ease',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{name}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: changed
          ? 'var(--accent-blue)'
          : isPtr
          ? '#378ADD'
          : 'var(--text-primary)',
        transition: 'color 0.3s ease',
      }}>{fmtVal(value)}</span>
    </div>
  );
}

export default function StackPanel({ step, prevStep }: Props) {
  if (!step?.stack?.length) return null;

  return (
    <div>
      <SectionLabel>call stack</SectionLabel>
      {/* Render bottom frame first, top frame last — bottom-up visual stacking */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 4 }}>
        {step.stack.map((frame, fi) => {
          const isTop     = fi === step.stack.length - 1;
          const changedLo = changedKeys(frame, prevStep?.stack, 'locals');
          const changedGl = changedKeys(frame, prevStep?.stack, 'globals');
          const hasLocals = Object.keys(frame.locals ?? {}).length > 0;
          const hasGlobals = Object.keys(frame.globals ?? {}).length > 0;

          return (
            <div key={fi} style={{
              background: isTop ? 'var(--bg-surface)' : 'var(--bg-active)',
              border: `1px solid ${isTop ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
              borderRadius: 6, overflow: 'hidden',
            }}>
              {/* Frame header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px',
                borderBottom: (hasLocals || hasGlobals) ? '1px solid var(--border)' : 'none',
              }}>
                {isTop && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-teal)', flexShrink: 0 }} />
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                  color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>{frame.func}</span>
                {isTop && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>← active</span>
                )}
              </div>

              {/* Locals */}
              {hasLocals && (
                <div>
                  {Object.entries(frame.locals).map(([k, v]) => (
                    <VarRow key={k} name={k} value={v} changed={changedLo.has(k)} />
                  ))}
                </div>
              )}

              {/* Globals section */}
              {hasGlobals && (
                <div style={{ borderTop: hasLocals ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ padding: '2px 10px 0', fontSize: 9, letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                    GLOBALS
                  </div>
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
