import { useRef, useEffect } from 'react';
import type { TraceEvent } from '../types/trace';
import type { Language } from '../types/trace';
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

function lineHighlightColor(event: TraceEvent | undefined): string {
  switch (event) {
    case 'call':      return 'rgba(56,189,248,0.1)';
    case 'return':    return 'rgba(29,158,117,0.1)';
    case 'exception': return 'rgba(244,63,94,0.12)';
    default:          return 'rgba(255,255,255,0.04)';
  }
}

function lineAccentColor(event: TraceEvent | undefined): string {
  switch (event) {
    case 'call':      return '#38bdf8';
    case 'return':    return '#2dd4a8';
    case 'exception': return '#f43f5e';
    default:          return '#ef9f27';
  }
}

export default function CodePane({
  lines, currentLine, event, code, editable, lang, onCodeChange,
  onToggleEdit, onRun, loading, pyReady
}: Props) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentLine]);

  const highlight = lineHighlightColor(event);
  const accent = lineAccentColor(event);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%',
      background: 'var(--bg-panel)', overflow: 'hidden',
    }}>
      {/* Pane header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', borderBottom: '1px solid var(--glass-border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: editable
              ? '#a855f7'
              : '#1d9e75',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            color: editable ? '#a855f7' : '#2dd4a8', letterSpacing: '0.02em',
          }}>
            {editable ? 'EDIT MODE' : 'TRACE MODE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!editable && currentLine && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-tertiary)', marginRight: 4,
            }}>
              line {currentLine}
            </span>
          )}

          {/* Edit / Cancel toggle */}
          <button
            onClick={onToggleEdit}
            className="btn-modern"
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer',
              background: editable
                ? 'rgba(244,63,94,0.12)'
                : 'rgba(168,85,247,0.12)',
              border: `1px solid ${editable ? 'rgba(244,63,94,0.25)' : 'rgba(168,85,247,0.2)'}`,
              color: editable ? '#f43f5e' : '#a855f7',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {editable ? (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</>
            )}
          </button>

          {/* Run */}
          {editable && onRun && (
            <button
              onClick={onRun}
              disabled={loading}
              className="btn-modern"
              style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading
                  ? 'var(--bg-surface)'
                  : 'rgba(29,158,117,0.14)',
                border: `1px solid ${loading ? 'var(--border)' : 'rgba(29,158,117,0.35)'}`,
                color: loading ? 'var(--text-tertiary)' : '#2dd4a8',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {loading ? (
                <><span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid var(--text-tertiary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Running…</>
              ) : (
                <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Run</>
              )}
            </button>
          )}
        </div>
      </div>

      {editable ? (
        /* ── CodeMirror editor ─────────────────────────── */
        <CodeEditor code={code} lang={lang} onChange={onCodeChange} />
      ) : (
        /* ── Highlighted trace view with syntax coloring ── */
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-panel)' }}>
          {lines.map((line, li) => {
            const ln      = li + 1;
            const isActive = currentLine === ln;
            return (
              <div
                key={li}
                ref={isActive ? activeRef : undefined}
                style={{
                  display: 'flex', minHeight: 22,
                  background: isActive ? highlight : 'transparent',
                  transition: 'background 0.15s ease',
                  borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                }}
              >
                {/* Line number */}
                <span style={{
                  width: 40, textAlign: 'right', padding: '0 8px 0 0',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: isActive ? accent : 'var(--text-tertiary)',
                  lineHeight: '22px', flexShrink: 0, userSelect: 'none',
                  fontWeight: isActive ? 600 : 400,
                }}>{ln}</span>
                {/* Syntax-highlighted code */}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12.5,
                  lineHeight: '22px', padding: '0 8px',
                  whiteSpace: 'pre',
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
