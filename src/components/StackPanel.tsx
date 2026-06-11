import type { TraceStep, StackFrame } from '../types/trace';
import { SectionLabel } from './ArrayViz';

interface Props {
  step:     TraceStep | undefined;
  prevStep: TraceStep | undefined;
}

const TYPE_COLOR: Record<string, string> = {
  int: 'var(--amber)', float: 'var(--amber)',
  bool: 'var(--sky)',
  str: '#4ade80',
  list: 'var(--violet)', 'list[int]': 'var(--violet)', 'list[float]': 'var(--violet)', 'list[str]': 'var(--violet)',
  tuple: 'var(--violet)', 'tuple[int]': 'var(--violet)',
  dict: 'var(--cyan)', set: '#f472b6', frozenset: '#f472b6',
  None: 'var(--t3)',
};

function typeColor(t: string) { return TYPE_COLOR[t] ?? 'var(--t3)'; }

function TypeBadge({ t }: { t: string }) {
  const c = typeColor(t);
  return (
    <span style={{
      fontSize: 9, padding: '1px 5px', borderRadius: 'var(--r-sm)',
      background: `${c}12`, border: `1px solid ${c}28`,
      color: c, fontFamily: 'var(--mono)', flexShrink: 0, letterSpacing: '0.02em',
    }}>{t}</span>
  );
}

function fmtVal(v: any, type?: string): string {
  if (v === null || v === 'NULL') return 'null';
  if (v === undefined || v === '?') return '?';
  if (type === 'str'  && typeof v === 'string') return `"${v.length > 40 ? v.slice(0, 37) + '…' : v}"`;
  if (type === 'bool' || typeof v === 'boolean') return v ? 'True' : 'False';
  if (type === 'None' || v === 'None') return 'None';
  if (Array.isArray(v)) {
    const items  = (v as any[]).slice(0, 12).map((x) => fmtVal(x)).join(', ');
    const suffix = v.length > 12 ? `, …+${v.length - 12}` : '';
    return `[${items}${suffix}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, any>);
    const shown   = entries.slice(0, 4).map(([k, val]) => `${k}: ${fmtVal(val)}`).join(', ');
    const suffix  = entries.length > 4 ? `, …+${entries.length - 4}` : '';
    return `{${shown}${suffix}}`;
  }
  if (typeof v === 'string') return v;
  return String(v);
}

function changedKeys(frame: StackFrame, prevStack: StackFrame[] | undefined, field: 'locals' | 'globals'): Set<string> {
  const prev    = prevStack?.find((f) => f.func === frame.func);
  const prevMap = (field === 'locals' ? prev?.locals : prev?.globals) ?? {};
  const curMap  = (field === 'locals' ? frame.locals : frame.globals) ?? {};
  return new Set(Object.keys(curMap).filter((k) => JSON.stringify(curMap[k]) !== JSON.stringify(prevMap[k])));
}

function VarRow({ name, value, type, changed }: { name: string; value: any; type?: string; changed: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '3px 10px', minHeight: 24,
      background: changed ? 'rgba(124,106,247,0.05)' : 'transparent',
      borderLeft: changed ? '2px solid rgba(124,106,247,0.4)' : '2px solid transparent',
      transition: 'background 0.3s',
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--t2)',
        flexShrink: 0, minWidth: 56,
      }}>{name}</span>
      {type && <TypeBadge t={type} />}
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 11.5,
        color: changed ? 'var(--t1)' : 'var(--t2)',
        marginLeft: 'auto', textAlign: 'right',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
        transition: 'color 0.2s',
      }}>{fmtVal(value, type)}</span>
    </div>
  );
}

export default function StackPanel({ step, prevStep }: Props) {
  if (!step?.stack?.length) return null;

  const isReturn    = step.event === 'return';
  const returnNote  = isReturn ? step.note ?? '' : '';

  return (
    <div>
      <SectionLabel>call stack</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 4 }}>
        {step.stack.map((frame, fi) => {
          const isTop     = fi === step.stack.length - 1;
          const changedLo = changedKeys(frame, prevStep?.stack, 'locals');
          const changedGl = changedKeys(frame, prevStep?.stack, 'globals');
          const hasLocals = Object.keys(frame.locals ?? {}).length > 0;
          const hasGlobal = Object.keys(frame.globals ?? {}).length > 0;
          const showRet   = isTop && isReturn && returnNote;

          return (
            <div key={fi} style={{
              background: isTop ? 'var(--surf)' : 'var(--panel)',
              border: `1px solid ${isTop ? 'var(--line-hover)' : 'var(--line)'}`,
              borderRadius: 'var(--r)', overflow: 'hidden',
            }}>
              {/* Frame header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 10px',
                borderBottom: (hasLocals || hasGlobal || showRet) ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                  background: isTop ? (isReturn ? 'var(--green)' : 'var(--cyan)') : 'var(--t3)',
                }} />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: isTop ? 600 : 400,
                  color: isTop ? 'var(--t1)' : 'var(--t2)',
                }}>
                  {frame.func === '<module>' ? '⟨module⟩' : `${frame.func}()`}
                </span>
                {isTop && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9.5, fontFamily: 'var(--mono)',
                    color: isReturn ? 'var(--green)' : 'var(--t3)',
                  }}>
                    {isReturn ? '↩ returning' : '← active'}
                  </span>
                )}
              </div>

              {/* Locals */}
              {hasLocals && Object.entries(frame.locals).map(([k, v]) => (
                <VarRow key={k} name={k} value={v} type={frame.types?.[k]} changed={changedLo.has(k)} />
              ))}

              {/* Return value */}
              {showRet && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 10px',
                  background: 'rgba(52,211,153,0.05)', borderLeft: '2px solid rgba(52,211,153,0.4)',
                  borderTop: hasLocals ? '1px solid var(--line)' : 'none',
                }}>
                  <span style={{ fontSize: 9.5, color: 'var(--green)', fontFamily: 'var(--mono)', flexShrink: 0 }}>↩ return</span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--green)',
                    marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
                  }}>{returnNote.replace(/^return\s*/, '')}</span>
                </div>
              )}

              {/* Globals */}
              {hasGlobal && (
                <div style={{ borderTop: hasLocals ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ padding: '3px 10px 1px', fontSize: 9, letterSpacing: '0.08em', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>GLOBALS</div>
                  {Object.entries(frame.globals!).map(([k, v]) => (
                    <VarRow key={k} name={k} value={v} changed={changedGl.has(k)} />
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
