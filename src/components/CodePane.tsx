import { useRef, useEffect } from 'react';
import type { TraceEvent, Language } from '../types/trace';
import SyntaxLine from './SyntaxLine';
import CodeEditor from './CodeEditor';

interface Props {
  lines:        string[];
  currentLine:  number | undefined;
  event:        TraceEvent | undefined;
  code:         string;
  editable:     boolean;
  lang:         Language;
  onCodeChange: (c: string) => void;
  onToggleEdit: () => void;
  onRun?:       () => void;
  loading?:     boolean;
  pyReady?:     boolean;
}

const EV_ACCENT: Record<string, string> = {
  call:      'var(--sky)',
  return:    'var(--green)',
  exception: 'var(--red)',
  step:      'var(--cyan)',
};

const EV_BG: Record<string, string> = {
  call:      'rgba(56,189,248,0.06)',
  return:    'rgba(52,211,153,0.06)',
  exception: 'rgba(244,63,94,0.07)',
  step:      'rgba(255,255,255,0.03)',
};

export default function CodePane({
  lines, currentLine, event, code, editable, lang, onCodeChange,
  onToggleEdit, onRun, loading,
}: Props) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentLine]);

  const accent = EV_ACCENT[event ?? 'step'] ?? EV_ACCENT.step;
  const bg     = EV_BG[event ?? 'step']     ?? EV_BG.step;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: 'var(--panel)', overflow: 'hidden' }}>

      {/* ── Pane header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 38, flexShrink: 0,
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: editable ? 'var(--violet)' : 'var(--cyan)',
          }} />
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600,
            color: editable ? 'var(--violet)' : 'var(--t3)',
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            {editable ? 'Edit' : 'Trace'}
          </span>
          {!editable && currentLine && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginLeft: 2 }}>
              · line {currentLine}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onToggleEdit} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 'var(--r)',
            border: `1px solid ${editable ? 'rgba(244,63,94,0.2)' : 'var(--line)'}`,
            background: editable ? 'rgba(244,63,94,0.07)' : 'transparent',
            color: editable ? 'var(--red)' : 'var(--t2)',
            fontSize: 11, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.12s ease',
          }}>
            {editable ? (
              <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg> Cancel</>
            ) : (
              <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg> Edit</>
            )}
          </button>

          {editable && onRun && (
            <button onClick={onRun} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 12px', borderRadius: 'var(--r)',
              border: `1px solid ${loading ? 'var(--line)' : 'rgba(52,211,153,0.3)'}`,
              background: loading ? 'transparent' : 'rgba(52,211,153,0.08)',
              color: loading ? 'var(--t3)' : 'var(--green)',
              fontSize: 11, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.12s ease',
            }}>
              {loading ? (
                <><span style={{
                  display: 'inline-block', width: 9, height: 9,
                  border: '1.5px solid var(--t3)', borderTopColor: 'var(--green)',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} /> Running…</>
              ) : (
                <><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Run</>
              )}
            </button>
          )}
        </div>
      </div>

      {editable ? (
        <CodeEditor code={code} lang={lang} onChange={onCodeChange} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--panel)' }}>
          {lines.map((line, li) => {
            const ln = li + 1;
            const isActive = currentLine === ln;
            return (
              <div
                key={li}
                ref={isActive ? activeRef : undefined}
                style={{
                  display: 'flex', minHeight: 22,
                  background: isActive ? bg : 'transparent',
                  borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                  transition: 'background 0.12s ease',
                }}
              >
                <span style={{
                  width: 42, textAlign: 'right', paddingRight: 10,
                  fontFamily: 'var(--mono)', fontSize: 11, lineHeight: '22px',
                  color: isActive ? accent : 'var(--t3)',
                  flexShrink: 0, userSelect: 'none',
                  fontWeight: isActive ? 600 : 400,
                }}>{ln}</span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: '22px',
                  padding: '0 12px', whiteSpace: 'pre',
                }}>
                  <SyntaxLine text={line} lang={lang} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
