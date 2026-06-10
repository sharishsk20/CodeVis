import type { TraceStep } from '../types/trace';
import ArrayViz from './ArrayViz';
import SearchViz, { isSearchStep } from './SearchViz';
import DsViz, { detectDs } from './DsViz';
import StackPanel from './StackPanel';
import HeapDiagram from './HeapDiagram';
import { SectionLabel } from './ArrayViz';

interface Props {
  step:     TraceStep | undefined;
  prevStep: TraceStep | undefined;
}

// ── Terminal-style stdout ─────────────────────────────────────────────────────

function TerminalOutput({ stdout, prevStdout }: { stdout: string; prevStdout?: string }) {
  const prev    = prevStdout ?? '';
  const newPart = stdout.slice(prev.length);

  return (
    <div>
      <SectionLabel>output</SectionLabel>
      <div style={{
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        lineHeight: 1.6,
      }}>
        {/* Prompt line */}
        <div style={{ color: '#484f58', marginBottom: 6, fontSize: 10, letterSpacing: '0.05em' }}>
          $ run
        </div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {prev && (
            <span style={{ color: '#7ee787' }}>{prev}</span>
          )}
          {newPart && (
            <span style={{ color: '#a5f3b0', fontWeight: 600 }}>{newPart}</span>
          )}
          <span className="terminal-cursor" />
        </pre>
      </div>
    </div>
  );
}

// ── Exception detail ──────────────────────────────────────────────────────────

function ExceptionBox({ error }: { error: string }) {
  return (
    <div>
      <SectionLabel>exception</SectionLabel>
      <div style={{
        padding: '10px 12px',
        background: 'rgba(244,63,94,0.08)',
        border: '1px solid rgba(244,63,94,0.2)',
        borderRadius: 8,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <pre style={{
          fontFamily: 'var(--font-mono)', fontSize: 11.5, margin: 0,
          color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5,
        }}>{error}</pre>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(29,158,117,0.08)',
        border: '1px solid rgba(29,158,117,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2dd4a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
          Ready to visualize
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Click <strong style={{ color: 'var(--text-secondary)' }}>Edit</strong> to write code,
          then <strong style={{ color: '#2dd4a8' }}>Run</strong> to trace it step-by-step.
        </div>
      </div>
      <div style={{
        fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
        background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 6,
        border: '1px solid var(--glass-border)', lineHeight: 1.8,
      }}>
        ← → step &nbsp;·&nbsp; space play &nbsp;·&nbsp; r reset
      </div>
    </div>
  );
}

// ── VizPane ───────────────────────────────────────────────────────────────────

export default function VizPane({ step, prevStep }: Props) {
  const globals = step?.stack?.find((f) => f.globals)?.globals ?? {};
  const headPtr = typeof globals.head === 'string' ? globals.head : undefined;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-canvas)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px', borderBottom: '1px solid var(--glass-border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#ef9f27',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            color: '#ef9f27', letterSpacing: '0.02em',
          }}>VISUALIZATION</span>
        </div>
        {step && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step.note && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10.5,
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.04)', padding: '2px 8px',
                borderRadius: 4, border: '1px solid var(--glass-border)',
                maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{step.note}</span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
              step {step.step + 1}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {!step ? (
        <EmptyState />
      ) : (
        <div style={{
          flex: 1, overflowY: 'auto', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Data Structure Visualizer (linked list, stack, queue) */}
          <DsViz step={step} />

          {/* Search cell grid — linear / binary search */}
          {!detectDs(step) && <SearchViz step={step} />}

          {/* Array bars — sorting algorithms (skip when showing search or DS viz) */}
          {!isSearchStep(step) && !detectDs(step) && <ArrayViz step={step} />}

          {/* Heap — C++ (skip when showing custom DS visualizer) */}
          {step.heap && !detectDs(step) && (
            <HeapDiagram heap={step.heap} headPtr={headPtr} />
          )}

          {/* Call stack */}
          <StackPanel step={step} prevStep={prevStep} />

          {/* Stdout terminal */}
          {step.stdout && (
            <TerminalOutput stdout={step.stdout} prevStdout={prevStep?.stdout} />
          )}

          {/* Exception */}
          {step.error && <ExceptionBox error={step.error} />}
        </div>
      )}
    </div>
  );
}
